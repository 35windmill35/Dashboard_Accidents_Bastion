import type { AccidentRow } from '../model/types'
import {
  getCauseCategory,
  CAUSE_CATEGORY_LABELS,
  NO_DAMAGE_CATEGORY_ENABLED,
  type CauseCategory,
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

export function groupByCauseCategory(rows: AccidentRow[]): Record<CauseCategory, AccidentRow[]> {
  const groups: Record<CauseCategory, AccidentRow[]> = {
    underReview: [],
    driverFault: [],
    thirdPartyFault: [],
    noDamage: [],
    undetermined: [],
  }

  rows.forEach((row) => {
    groups[getCauseCategory(row)].push(row)
  })

  return groups
}

export interface CauseSlice {
  category: CauseCategory
  label: string
  count: number
  sumDamage: number
  sumCompensated: number
  rows: AccidentRow[]
}

const CAUSE_ORDER: CauseCategory[] = (
  ['driverFault', 'thirdPartyFault', 'noDamage', 'undetermined', 'underReview'] as const
).filter((category) => category !== 'noDamage' || NO_DAMAGE_CATEGORY_ENABLED)

export function buildCauseSlices(rows: AccidentRow[]): CauseSlice[] {
  const grouped = groupByCauseCategory(rows)

  return CAUSE_ORDER.map((category) => {
    const categoryRows = grouped[category]
    return {
      category,
      label: CAUSE_CATEGORY_LABELS[category],
      count: categoryRows.length,
      sumDamage: sumDamage(categoryRows),
      sumCompensated: sumCompensated(categoryRows),
      rows: categoryRows,
    }
  })
}

export function causeCategoryShare(
  slices: CauseSlice[],
  totalCount: number,
  category: CauseCategory
): number | null {
  if (totalCount === 0) return null
  const slice = slices.find((s) => s.category === category)
  return (slice?.count ?? 0) / totalCount
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
