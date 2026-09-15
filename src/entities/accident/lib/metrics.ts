import type { AccidentRow } from '../model/types'
import { getCauseCategory, type CauseCategory } from '@/shared/config/accidentCauses'
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

// null при нулевом ущербе — делить не на что, это не 0%.
export function compensationShare(rows: AccidentRow[]): number | null {
  const damage = sumDamage(rows)
  if (damage === 0) return null
  return sumCompensated(rows) / damage
}

// Знаменатель — только ДТП с ненулевым ущербом (тяжесть инцидента).
export function averageDamagePerAccident(rows: AccidentRow[]): number | null {
  const withDamage = rows.filter((row) => (row.ACCIDENT_DAMAGE ?? 0) > 0)
  if (withDamage.length === 0) return null
  return sumDamage(withDamage) / withDamage.length
}

// Водитель считается тем же самым только в пределах одной базы.
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

export interface MotorcadeAggregate {
  key: string
  name: string
  count: number
  sumDamage: number
  sumCompensated: number
}

// Компания целиком, по автоколоннам (включая "Не указана" — обзор
// показывает и её).
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

// Водитель уникален в пределах одной базы (DB_INDEX+DRIVER_ID), записи без
// DRIVER_ID в рейтинг не попадают. Возвращает полный список — экраны сами
// берут top-N и разворачивают остальное по "Показать все".
export function rankDrivers(rows: AccidentRow[]): DriverAggregate[] {
  const map = new Map<string, DriverAggregate>()

  rows.forEach((row) => {
    if (row.DRIVER_ID == null) return
    const key = `${row.DB_INDEX}:${row.DRIVER_ID}`
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
      name: row.DRIVER_NAME || 'Без имени',
      count: 1,
      sumDamage: damage,
      rows: [row],
    })
  })

  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

export interface VehicleAggregate {
  key: string
  name: string
  count: number
  sumDamage: number
  rows: AccidentRow[]
}

// Машина уникальна в пределах одной базы (DB_INDEX+CAR_ID), запасной ключ —
// гаражный номер, если CAR_ID не пришёл. Полный список, top-N берут экраны.
export function rankVehicles(rows: AccidentRow[]): VehicleAggregate[] {
  const map = new Map<string, VehicleAggregate>()

  rows.forEach((row) => {
    const idPart = row.CAR_ID ?? row.GARAGE_NUM
    if (idPart == null) return
    const key = `${row.DB_INDEX}:${idPart}`
    const existing = map.get(key)
    const damage = row.ACCIDENT_DAMAGE ?? 0
    const name = row.GARAGE_NUM ? `№${row.GARAGE_NUM}` : row.CAR_MAKE_MODEL || 'Без номера'

    if (existing) {
      existing.count += 1
      existing.sumDamage += damage
      existing.rows.push(row)
      return
    }

    map.set(key, { key, name, count: 1, sumDamage: damage, rows: [row] })
  })

  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

export interface MonthlyAggregate {
  ym: number
  count: number
  sumDamage: number
  sumCompensated: number
}

// Строки для графиков динамики — по каждому месяцу из getTrendMonths, даже
// если данных за него нет (тогда нули, а не пропуск точки).
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
