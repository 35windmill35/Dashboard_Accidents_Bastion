import { describe, expect, it } from 'vitest'
import { row } from '@/test/fixtures'
import {
  collapseSlices,
  groupByCause,
  groupByCauser,
  OTHER_SLICE_KEY,
  rankDrivers,
  rankRoutes,
  rankVehicles,
  sumDamage,
  UNKNOWN_DRIVER_NAME,
} from '../metrics'
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

describe('причины и виновники', () => {
  const period = { mode: 'month', value: 202608 } as const
  const today = new Date(2026, 8, 28)
  const rows = [
    row({
      ACCIDENT_ID: 1,
      ACCIDENT_CAUSE_ID: 13,
      ACCIDENT_CAUSE_NAME: 'Несоблюдение дистанции',
      ACCIDENT_CAUSER_NAME: 'Наш водитель',
    }),
    row({
      ACCIDENT_ID: 2,
      ACCIDENT_CAUSE_ID: 13,
      ACCIDENT_CAUSE_NAME: 'Несоблюдение дистанции ',
      ACCIDENT_CAUSER_NAME: 'Другой участник ДТП',
    }),
    row({
      ACCIDENT_ID: 3,
      ACCIDENT_CAUSE_ID: 22,
      ACCIDENT_CAUSE_NAME: 'Метеорологические условия',
      ACCIDENT_CAUSER_NAME: 'неизвестен',
    }),
    row({ ACCIDENT_ID: 4, ACCIDENT_CAUSE_NAME: null, ACCIDENT_CAUSER_NAME: 'Обоюдная вина' }),
  ]

  it('группирует по названию причины, а не по ID', () => {
    const slices = groupByCause(rows)
    expect(slices.map((s) => [s.label, s.count])).toEqual([
      ['Несоблюдение дистанции', 2],
      ['Метеорологические условия', 1],
      ['Причина не указана', 1],
    ])
  })

  it('группирует по виновнику и выравнивает регистр', () => {
    const labels = groupByCauser(rows).map((s) => s.label)
    expect(labels).toEqual(
      expect.arrayContaining(['Наш водитель', 'Другой участник ДТП', 'Неизвестен', 'Обоюдная вина'])
    )
  })

  it('доли KPI считаются по виновнику', () => {
    const scope = computeAccidentScope(rows, period, today)
    expect(scope.kpi.driverFaultShare).toBe(0.25)
    expect(scope.kpi.thirdPartyFaultShare).toBe(0.25)
    expect(scope.causerSlices.reduce((sum, s) => sum + s.count, 0)).toBe(4)
  })

  it('хвост сворачивается в «Прочие» без потери ДТП', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      row({ ACCIDENT_ID: 100 + i, ACCIDENT_CAUSE_NAME: `Причина ${i}` })
    )
    const collapsed = collapseSlices(groupByCause(many))
    expect(collapsed).toHaveLength(6)
    expect(collapsed[5].key).toBe(OTHER_SLICE_KEY)
    expect(collapsed[5].count).toBe(4)
    expect(collapsed.reduce((sum, s) => sum + s.count, 0)).toBe(9)
  })
})

describe('рейтинг маршрутов', () => {
  it('при нескольких автоколоннах автоколонна подписана у каждого маршрута', () => {
    const ranking = rankRoutes([
      row({
        ACCIDENT_ID: 1,
        ROUTE_ID: 186,
        ROUTE_NAME: '№ 11',
        MOTORCADE_ID: 1,
        MOTORCADE_NAME: 'Актобе',
      }),
      row({
        ACCIDENT_ID: 2,
        ROUTE_ID: 186,
        ROUTE_NAME: '№ 11',
        MOTORCADE_ID: 1,
        MOTORCADE_NAME: 'Актобе',
      }),
      row({
        ACCIDENT_ID: 3,
        ROUTE_ID: 212,
        ROUTE_NAME: '№ 11',
        MOTORCADE_ID: 2,
        MOTORCADE_NAME: 'Экибастуз',
      }),
      row({
        ACCIDENT_ID: 4,
        ROUTE_ID: 200,
        ROUTE_NAME: '№ 2',
        MOTORCADE_ID: 3,
        MOTORCADE_NAME: 'Туркестан',
      }),
    ])
    expect(ranking.map((r) => [r.name, r.count])).toEqual([
      ['№ 11 · Актобе', 2],
      ['№ 11 · Экибастуз', 1],
      ['№ 2 · Туркестан', 1],
    ])
  })

  it('в одной автоколонне подпись автоколонны не нужна', () => {
    const ranking = rankRoutes([
      row({
        ACCIDENT_ID: 1,
        ROUTE_ID: 186,
        ROUTE_NAME: '№ 11',
        MOTORCADE_ID: 1,
        MOTORCADE_NAME: 'Актобе',
      }),
      row({
        ACCIDENT_ID: 2,
        ROUTE_ID: 189,
        ROUTE_NAME: '№ 18',
        MOTORCADE_ID: 1,
        MOTORCADE_NAME: 'Актобе',
      }),
    ])
    expect(ranking.map((r) => r.name)).toEqual(['№ 11', '№ 18'])
  })

  it('ДТП без маршрута в рейтинг не попадают', () => {
    const ranking = rankRoutes([
      row({ ACCIDENT_ID: 1, ROUTE_ID: null, ROUTE_NAME: null }),
      row({ ACCIDENT_ID: 2, ROUTE_ID: 300, ROUTE_NAME: null }),
      row({ ACCIDENT_ID: 3, ROUTE_ID: 301, ROUTE_NAME: '№ 4' }),
    ])
    expect(ranking.map((r) => [r.name, r.count])).toEqual([['№ 4', 1]])
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
