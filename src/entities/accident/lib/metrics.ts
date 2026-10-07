import type { AccidentRow } from '../model/types'
import {
  displayName,
  getCauserKind,
  normalizeName,
  OTHER_SLICE_KEY,
  type CauserKind,
} from '@/shared/config/accidentCauses'
import { t } from '@/shared/i18n'
import { getMotorcadeKey, getMotorcadeName } from './motorcade'
import { accidentDateToYm } from './period'

export function countAccidents(rows: AccidentRow[]): number {
  return rows.length
}

export function sumDamage(rows: AccidentRow[]): number {
  return rows.reduce((sum, row) => sum + (row.ACCIDENT_DAMAGE ?? 0), 0)
}

export function sumCompensated(rows: AccidentRow[]): number {
  return rows.reduce((sum, row) => sum + (row.ACCIDENT_COMPENSATED_DAMAGE ?? 0), 0)
}

// null при нулевом ущербе — не 0%
export function compensationShare(rows: AccidentRow[]): number | null {
  const damage = sumDamage(rows)
  if (damage === 0) return null
  return sumCompensated(rows) / damage
}

// Знаменатель — только ДТП с ущербом
export function averageDamagePerAccident(rows: AccidentRow[]): number | null {
  const withDamage = rows.filter((row) => (row.ACCIDENT_DAMAGE ?? 0) > 0)
  if (withDamage.length === 0) return null
  return sumDamage(withDamage) / withDamage.length
}

export function driversWithThreeOrMoreAccidents(rows: AccidentRow[]): number {
  const counts = new Map<string, number>()

  rows.forEach((row) => {
    if (row.DRIVER_ID == null) return
    const key = `${row.DB_INDEX}:${row.DRIVER_ID}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  let result = 0
  counts.forEach((count) => {
    if (count >= 3) result += 1
  })
  return result
}

// Порядок при равенстве: ущерб, имя, ключ
interface Rankable {
  key: string
  name: string
  count: number
  sumDamage: number
}

export function compareByCountThenDamage(a: Rankable, b: Rankable): number {
  return (
    b.count - a.count ||
    b.sumDamage - a.sumDamage ||
    a.name.localeCompare(b.name, 'ru') ||
    (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  )
}

// Разбивка по значению поля: причина, виновник
export interface BreakdownSlice {
  key: string
  label: string
  count: number
  sumDamage: number
  sumCompensated: number
  rows: AccidentRow[]
}

export { OTHER_SLICE_KEY }
const EMPTY_KEY = '__none'

function groupByName(
  rows: AccidentRow[],
  nameOf: (row: AccidentRow) => string | null | undefined,
  emptyLabel: string
): BreakdownSlice[] {
  const map = new Map<string, BreakdownSlice>()

  rows.forEach((row) => {
    const raw = nameOf(row)
    const key = normalizeName(raw) || EMPTY_KEY
    const damage = row.ACCIDENT_DAMAGE ?? 0
    const compensated = row.ACCIDENT_COMPENSATED_DAMAGE ?? 0
    const existing = map.get(key)

    if (existing) {
      existing.count += 1
      existing.sumDamage += damage
      existing.sumCompensated += compensated
      existing.rows.push(row)
      return
    }

    map.set(key, {
      key,
      label: key === EMPTY_KEY ? emptyLabel : displayName(raw ?? ''),
      count: 1,
      sumDamage: damage,
      sumCompensated: compensated,
      rows: [row],
    })
  })

  return Array.from(map.values()).sort((a, b) =>
    compareByCountThenDamage({ ...a, name: a.label }, { ...b, name: b.label })
  )
}

export function groupByCause(rows: AccidentRow[]): BreakdownSlice[] {
  return groupByName(rows, (row) => row.ACCIDENT_CAUSE_NAME, t('roadAccidents.cause.notSpecified'))
}

export function groupByCauser(rows: AccidentRow[]): BreakdownSlice[] {
  return groupByName(
    rows,
    (row) => row.ACCIDENT_CAUSER_NAME,
    t('roadAccidents.causer.notSpecified')
  )
}

// Первые max - 1 срезов + «Прочие», если срезов больше max
export function collapseSlices(slices: BreakdownSlice[], max = 6): BreakdownSlice[] {
  if (slices.length <= max) return slices
  const head = slices.slice(0, max - 1)
  const rest = slices.slice(max - 1)
  const rows = rest.flatMap((slice) => slice.rows)
  return [
    ...head,
    {
      key: OTHER_SLICE_KEY,
      label: t('roadAccidents.common.other'),
      count: rows.length,
      sumDamage: rest.reduce((sum, slice) => sum + slice.sumDamage, 0),
      sumCompensated: rest.reduce((sum, slice) => sum + slice.sumCompensated, 0),
      rows,
    },
  ]
}

export function rowsByCauser(rows: AccidentRow[], kind: CauserKind): AccidentRow[] {
  return rows.filter((row) => getCauserKind(row.ACCIDENT_CAUSER_NAME) === kind)
}

export function causerShare(rows: AccidentRow[], kind: CauserKind): number | null {
  if (rows.length === 0) return null
  return rowsByCauser(rows, kind).length / rows.length
}

export const UNKNOWN_DRIVER_NAME = t('roadAccidents.common.unknownDriver')
export const UNKNOWN_VEHICLE_NAME = t('roadAccidents.common.unknownVehicle')

export interface MotorcadeAggregate {
  key: string
  name: string
  count: number
  sumDamage: number
  sumCompensated: number
}

export function groupByMotorcade(rows: AccidentRow[]): MotorcadeAggregate[] {
  const map = new Map<string, MotorcadeAggregate>()

  rows.forEach((row) => {
    const key = getMotorcadeKey(row)
    const existing = map.get(key)
    const damage = row.ACCIDENT_DAMAGE ?? 0
    const compensated = row.ACCIDENT_COMPENSATED_DAMAGE ?? 0

    if (existing) {
      existing.count += 1
      existing.sumDamage += damage
      existing.sumCompensated += compensated
      return
    }

    map.set(key, {
      key,
      name: getMotorcadeName(row),
      count: 1,
      sumDamage: damage,
      sumCompensated: compensated,
    })
  })

  return Array.from(map.values())
}

export interface DriverAggregate {
  key: string
  name: string
  count: number
  sumDamage: number
  rows: AccidentRow[]
}

// Записи без DRIVER_ID — одной строкой «Водитель не указан»
export function rankDrivers(rows: AccidentRow[]): DriverAggregate[] {
  const map = new Map<string, DriverAggregate>()

  rows.forEach((row) => {
    const isKnown = row.DRIVER_ID != null
    const key = isKnown ? `${row.DB_INDEX}:${row.DRIVER_ID}` : 'unknown'
    const existing = map.get(key)
    const damage = row.ACCIDENT_DAMAGE ?? 0

    if (existing) {
      existing.count += 1
      existing.sumDamage += damage
      existing.rows.push(row)
      return
    }

    map.set(key, {
      key,
      name: isKnown ? row.DRIVER_NAME || t('roadAccidents.common.noName') : UNKNOWN_DRIVER_NAME,
      count: 1,
      sumDamage: damage,
      rows: [row],
    })
  })

  return Array.from(map.values()).sort(compareByCountThenDamage)
}

export interface VehicleAggregate {
  key: string
  name: string
  count: number
  sumDamage: number
  rows: AccidentRow[]
}

// Ключ — CAR_ID или гаражный номер (с префиксами, чтобы не смешивать)
export function rankVehicles(rows: AccidentRow[]): VehicleAggregate[] {
  const map = new Map<string, VehicleAggregate>()

  rows.forEach((row) => {
    const idPart =
      row.CAR_ID != null ? `car:${row.CAR_ID}` : row.GARAGE_NUM ? `garage:${row.GARAGE_NUM}` : null
    const key = idPart ? `${row.DB_INDEX}:${idPart}` : 'unknown'
    const existing = map.get(key)
    const damage = row.ACCIDENT_DAMAGE ?? 0
    const name = !idPart
      ? UNKNOWN_VEHICLE_NAME
      : row.GARAGE_NUM
        ? `№${row.GARAGE_NUM}`
        : row.CAR_MAKE_MODEL || t('roadAccidents.common.noNumber')

    if (existing) {
      existing.count += 1
      existing.sumDamage += damage
      existing.rows.push(row)
      return
    }

    map.set(key, { key, name, count: 1, sumDamage: damage, rows: [row] })
  })

  return Array.from(map.values()).sort(compareByCountThenDamage)
}

export interface RouteAggregate {
  key: string
  name: string
  count: number
  sumDamage: number
  rows: AccidentRow[]
}

// Только ДТП с подтверждённым маршрутом (ROUTE_ID и ROUTE_NAME).
// Ключ — ROUTE_ID в своей базе. Если в строках несколько автоколонн,
// к каждому маршруту дописывается его автоколонна
export function rankRoutes(
  rows: AccidentRow[],
  motorcadeLabels?: Map<string, string>
): RouteAggregate[] {
  const map = new Map<string, RouteAggregate & { motorcade: string }>()

  rows.forEach((row) => {
    const routeName = row.ROUTE_NAME?.trim()
    if (row.ROUTE_ID == null || !routeName) return
    const key = `${row.DB_INDEX}:${row.ROUTE_ID}`
    const existing = map.get(key)
    const damage = row.ACCIDENT_DAMAGE ?? 0

    if (existing) {
      existing.count += 1
      existing.sumDamage += damage
      existing.rows.push(row)
      return
    }

    map.set(key, {
      key,
      name: routeName,
      motorcade: motorcadeLabels?.get(getMotorcadeKey(row)) ?? getMotorcadeName(row),
      count: 1,
      sumDamage: damage,
      rows: [row],
    })
  })

  const routes = Array.from(map.values())
  const motorcadeCount = new Set(routes.flatMap((route) => route.rows.map(getMotorcadeKey))).size

  return routes
    .map(({ motorcade, ...route }) => ({
      ...route,
      name: motorcadeCount > 1 ? `${route.name} · ${motorcade}` : route.name,
    }))
    .sort(compareByCountThenDamage)
}

export interface MonthlyAggregate {
  ym: number
  count: number
  sumDamage: number
  sumCompensated: number
}

// Пустые месяцы — нули, а не пропуск точки
export function monthlyTrend(rows: AccidentRow[], months: number[]): MonthlyAggregate[] {
  const byMonth = new Map<number, AccidentRow[]>()
  months.forEach((ym) => byMonth.set(ym, []))

  rows.forEach((row) => {
    const ym = accidentDateToYm(row.ACCIDENT_DATE)
    const bucket = byMonth.get(ym)
    if (bucket) bucket.push(row)
  })

  return months.map((ym) => {
    const bucket = byMonth.get(ym) ?? []
    return {
      ym,
      count: bucket.length,
      sumDamage: sumDamage(bucket),
      sumCompensated: sumCompensated(bucket),
    }
  })
}

export function rowsWithDamage(rows: AccidentRow[]): AccidentRow[] {
  return rows.filter((row) => (row.ACCIDENT_DAMAGE ?? 0) > 0)
}

export function rowsWithCompensation(rows: AccidentRow[]): AccidentRow[] {
  return rows.filter((row) => (row.ACCIDENT_COMPENSATED_DAMAGE ?? 0) > 0)
}

export function rowsNotFullyCompensated(rows: AccidentRow[]): AccidentRow[] {
  return rows.filter(
    (row) =>
      (row.ACCIDENT_DAMAGE ?? 0) > 0 &&
      (row.ACCIDENT_COMPENSATED_DAMAGE ?? 0) < (row.ACCIDENT_DAMAGE ?? 0)
  )
}
