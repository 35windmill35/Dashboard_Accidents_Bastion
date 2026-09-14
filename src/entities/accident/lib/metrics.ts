import type { AccidentRow } from '../model/types'
import { getCauseCategory, type CauseCategory } from '@/shared/config/accidentCauses'

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
