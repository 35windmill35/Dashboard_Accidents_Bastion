import { t } from '@/shared/i18n'
import type { AccidentRow } from '../model/types'

export const UNSPECIFIED_MOTORCADE_NAME = t('roadAccidents.common.unknownMotorcade')

export interface MotorcadeOption {
  key: string
  name: string
  dbIndex: number
  motorcadeId: number | null
  accidentCount: number
}

// Сквозной ключ автоколонны — DB_INDEX + MOTORCADE_ID, одинаковые
// MOTORCADE_ID в разных базах не одно и то же.
export function getMotorcadeKey(row: AccidentRow): string {
  const motorcadeId = row.MOTORCADE_ID ?? null
  return `${row.DB_INDEX}:${motorcadeId === null ? 'none' : motorcadeId}`
}

export function getMotorcadeName(row: AccidentRow): string {
  return row.MOTORCADE_NAME || UNSPECIFIED_MOTORCADE_NAME
}

export function getMotorcadeOptions(rows: AccidentRow[]): MotorcadeOption[] {
  const map = new Map<string, MotorcadeOption>()

  rows.forEach((row) => {
    const key = getMotorcadeKey(row)
    const existing = map.get(key)
    if (existing) {
      existing.accidentCount += 1
      return
    }
    map.set(key, {
      key,
      name: getMotorcadeName(row),
      dbIndex: row.DB_INDEX,
      motorcadeId: row.MOTORCADE_ID ?? null,
      accidentCount: 1,
    })
  })

  return Array.from(map.values())
}

export function sortByNameAsc(options: MotorcadeOption[]): MotorcadeOption[] {
  return [...options].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function sortByAccidentCountDesc(options: MotorcadeOption[]): MotorcadeOption[] {
  return [...options].sort(
    (a, b) => b.accidentCount - a.accidentCount || a.name.localeCompare(b.name, 'ru')
  )
}

// Одноимённые автоколонны из разных баз («Автоколонна №1» в двух
// компаниях) в селекторах и на графиках неразличимы — к таким именам
// добавляется название базы.
export function disambiguateMotorcadeNames(
  options: MotorcadeOption[],
  firmName: (dbIndex: number) => string
): MotorcadeOption[] {
  const dbsByName = new Map<string, Set<number>>()
  options.forEach((option) => {
    const dbs = dbsByName.get(option.name) ?? new Set<number>()
    dbs.add(option.dbIndex)
    dbsByName.set(option.name, dbs)
  })
  return options.map((option) =>
    (dbsByName.get(option.name)?.size ?? 0) > 1
      ? { ...option, name: `${option.name} · ${firmName(option.dbIndex)}` }
      : option
  )
}
