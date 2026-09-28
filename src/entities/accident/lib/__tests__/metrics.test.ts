import { describe, expect, it } from 'vitest'
import { row } from '@/test/fixtures'
import { rankDrivers, rankVehicles, sumDamage, UNKNOWN_DRIVER_NAME } from '../metrics'
import { computeAccidentScope } from '../scope'
import { disambiguateMotorcadeNames, getMotorcadeOptions } from '../motorcade'

describe('рейтинги', () => {
  it('порядок при равенстве не зависит от порядка строк API', () => {
    const a = row({ ACCIDENT_ID: 1, DRIVER_ID: 1, DRIVER_NAME: 'Бекова' })
    const b = row({ ACCIDENT_ID: 2, DRIVER_ID: 2, DRIVER_NAME: 'Абенов' })
    expect(rankDrivers([a, b]).map((d) => d.name)).toEqual(rankDrivers([b, a]).map((d) => d.name))
    expect(rankDrivers([a, b])[0].name).toBe('Абенов')
  })

  it('при равном числе ДТП выше тот, у кого больше ущерб', () => {
    const ranking = rankDrivers([
      row({ ACCIDENT_ID: 1, DRIVER_ID: 1, DRIVER_NAME: 'А', ACCIDENT_DAMAGE: 100 }),
      row({ ACCIDENT_ID: 2, DRIVER_ID: 2, DRIVER_NAME: 'Б', ACCIDENT_DAMAGE: 900 }),
    ])
    expect(ranking[0].name).toBe('Б')
  })

  it('записи без водителя не теряются — сумма таблицы сходится с итогом', () => {
    const ranking = rankDrivers([row({ DRIVER_ID: 1 }), row({ ACCIDENT_ID: 2, DRIVER_ID: null })])
    expect(ranking.reduce((sum, d) => sum + d.count, 0)).toBe(2)
    expect(ranking.some((d) => d.name === UNKNOWN_DRIVER_NAME)).toBe(true)
  })

  it('CAR_ID 123 и гаражный "123" — разные машины', () => {
    const ranking = rankVehicles([
      row({ ACCIDENT_ID: 1, CAR_ID: 123 }),
      row({ ACCIDENT_ID: 2, GARAGE_NUM: '123' }),
    ])
    expect(ranking).toHaveLength(2)
  })

  it('суммы складываются как числа', () => {
    expect(sumDamage([row({ ACCIDENT_DAMAGE: 1500 }), row({ ACCIDENT_DAMAGE: 500 })])).toBe(2000)
  })
})

describe('категории причин', () => {
  it('«Без повреждения» не показывается, пока правило не подтверждено', () => {
    const scope = computeAccidentScope(
      [row({ ACCIDENT_CAUSE_ID: 5, ACCIDENT_DAMAGE: null })],
      { mode: 'month', value: 202608 },
      new Date(2026, 8, 28)
    )
    expect(scope.causeSlices.map((s) => s.category)).not.toContain('noDamage')
  })
})

describe('имена автоколонн', () => {
  it('одноимённые автоколонны разных баз различаются по базе', () => {
    const options = getMotorcadeOptions([
      row({ ACCIDENT_ID: 1, DB_INDEX: 0, MOTORCADE_ID: 1, MOTORCADE_NAME: 'Автоколонна №1' }),
      row({ ACCIDENT_ID: 2, DB_INDEX: 1, MOTORCADE_ID: 1, MOTORCADE_NAME: 'Автоколонна №1' }),
      row({ ACCIDENT_ID: 3, DB_INDEX: 1, MOTORCADE_ID: 2, MOTORCADE_NAME: 'Павлодар' }),
    ])
    const names = disambiguateMotorcadeNames(options, (db) => `База ${db}`).map((o) => o.name)
    expect(names).toEqual(['Автоколонна №1 · База 0', 'Автоколонна №1 · База 1', 'Павлодар'])
  })
})
