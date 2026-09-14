import type { AccidentRow } from '../model/types'

export const UNSPECIFIED_MOTORCADE_NAME = 'Не указана'

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

// Для селекторов на экранах "Автоколонна"/"Аналитика" — псевдо-автоколонна
// "Не указана" туда не попадает, она участвует только в общих показателях
// Обзора.
export function getSelectableMotorcadeOptions(rows: AccidentRow[]): MotorcadeOption[] {
  return getMotorcadeOptions(rows).filter((option) => option.motorcadeId !== null)
}

export function sortByNameAsc(options: MotorcadeOption[]): MotorcadeOption[] {
  return [...options].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function sortByAccidentCountDesc(options: MotorcadeOption[]): MotorcadeOption[] {
  return [...options].sort((a, b) => b.accidentCount - a.accidentCount)
}
