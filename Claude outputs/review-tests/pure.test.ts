import { describe, it, expect } from 'vitest'
import { row } from './helpers'
import * as P from '@/entities/accident/lib/period'
import * as M from '@/entities/accident/lib/metrics'
import { computeAccidentScope } from '@/entities/accident/lib/scope'
import { computeOverview } from '@/pages/overview/model/overviewData'
import * as F from '@/shared/lib/formatters'
import { getCauseCategory } from '@/shared/config/accidentCauses'

describe('period', () => {
  it('BUG: "Весь период" пропускает месяцы без ДТП на оси', () => {
    const rows = [row({ ACCIDENT_DATE: '2026-01-05' }), row({ ACCIDENT_DATE: '2026-06-05' })]
    expect(P.getTrendMonths({ mode: 'all' }, rows)).toEqual([202601, 202606]) // ожидалось 6 месяцев
  })
  it('BUG: дата с месяцем 13 даёт «5 квартал»', () => {
    const ym = P.accidentDateToYm('2026-13-01')
    expect(P.formatQuarterLabel(P.ymToYq(ym))).toBe('5 квартал 2026')
  })
  it('BUG: одна опечатка в дате (2062 г.) становится периодом по умолчанию', () => {
    const rows = [row({ ACCIDENT_DATE: '2026-08-01' }), row({ ACCIDENT_DATE: '2062-08-01' })]
    expect(P.getAvailablePeriodValues('month', rows)[0]).toBe(206208)
  })
  it('BUG: дата не в ISO выпадает из периода и порождает «месяц» «? 19» в селекторе', () => {
    const r = row({ ACCIDENT_DATE: '19.08.2026' })
    expect(P.isInPeriod(r, { mode: 'month', value: 202608 })).toBe(false)
    const months = P.getAvailableMonths([r])
    expect(months).toEqual([1900.2])
    expect(P.formatMonthLabel(months[0])).toBe('? 19')
  })
})

describe('metrics', () => {
  it('BUG: суммы-строки из API конкатенируются', () => {
    const rows = [row({ ACCIDENT_DAMAGE: '1500' as unknown as number }), row({ ACCIDENT_DAMAGE: 500 })]
    expect(M.sumDamage(rows)).toBe('01500500' as unknown as number)
  })
  it('BUG: «Доля без повреждений» = 0%, хотя у 1 из 2 ДТП ущерба нет', () => {
    const rows = [row({ ACCIDENT_DAMAGE: null }), row()]
    expect(computeAccidentScope(rows, { mode: 'all' }).kpi.noDamageShare).toBe(0)
  })
  it('BUG: неизвестная причина тихо уходит в «Виновный не определён»', () => {
    expect(getCauseCategory({ ACCIDENT_CAUSE_ID: 99 })).toBe('undetermined')
  })
  it('BUG: рейтинг при равенстве зависит от порядка строк API', () => {
    const a = row({ DRIVER_ID: 1, DRIVER_NAME: 'А' })
    const b = row({ DRIVER_ID: 2, DRIVER_NAME: 'Б' })
    expect(M.rankDrivers([a, b])[0].name).not.toBe(M.rankDrivers([b, a])[0].name)
  })
  it('BUG: ДТП без DRIVER_ID не попадают в рейтинг — сумма таблицы ≠ итог', () => {
    const rows = [row({ DRIVER_ID: 1 }), row({ DRIVER_ID: null })]
    const inRanking = M.rankDrivers(rows).reduce((s, d) => s + d.count, 0)
    expect(inRanking).toBe(1)
  })
  it('Обзор и Автоколонна считают KPI двумя реализациями (сейчас совпадают)', () => {
    const rows = [row(), row({ ACCIDENT_DAMAGE: 0 })]
    const o = computeOverview(rows, { mode: 'all' }).kpi
    const s = computeAccidentScope(rows, { mode: 'all' }).kpi
    expect(o.sumDamage).toBe(s.sumDamage)
  })
})

describe('formatters', () => {
  it('BUG: 99,6% отображается как 100%', () => {
    expect(F.formatPercent(0.996)).toBe('100%')
  })
  it('BUG: дельта долей относительная, а не в п.п. (40% → 50% = «+25%»)', () => {
    expect(F.formatDelta(F.calcDelta(0.5, 0.4))).toBe('+25%')
  })
  it('BUG: время-заглушка 12:00 показывается как факт', () => {
    expect(F.formatTime('1900-01-01T12:00:00')).toBe('12:00')
  })
})
