import { describe, expect, it } from 'vitest'
import { row } from '@/test/fixtures'
import {
  getPeriodComparison,
  getTrendMonths,
  isInComparisonWindow,
  partialPeriodNote,
  getPreviousPeriod,
} from '../period'

describe('период сравнения', () => {
  const today = new Date(2026, 8, 24) // 24 сентября

  it('текущий месяц сравнивается с тем же числом дней прошлого', () => {
    const comparison = getPeriodComparison({ mode: 'month', value: 202609 }, today)
    expect(comparison).toEqual({
      previous: { mode: 'month', value: 202608 },
      isPartial: true,
      elapsedDays: 24,
    })
    expect(isInComparisonWindow(row({ ACCIDENT_DATE: '2026-08-24' }), comparison)).toBe(true)
    expect(isInComparisonWindow(row({ ACCIDENT_DATE: '2026-08-25' }), comparison)).toBe(false)
    expect(partialPeriodNote(comparison)).toContain('(24)')
  })

  it('завершённый месяц сравнивается целиком', () => {
    const comparison = getPeriodComparison({ mode: 'month', value: 202608 }, today)
    expect(comparison.isPartial).toBe(false)
    expect(isInComparisonWindow(row({ ACCIDENT_DATE: '2026-07-31' }), comparison)).toBe(true)
  })

  it('текущий квартал — по дням от начала квартала', () => {
    const comparison = getPeriodComparison({ mode: 'quarter', value: 20263 }, today)
    expect(comparison.elapsedDays).toBe(86)
    expect(isInComparisonWindow(row({ ACCIDENT_DATE: '2026-06-24' }), comparison)).toBe(true)
    expect(isInComparisonWindow(row({ ACCIDENT_DATE: '2026-06-26' }), comparison)).toBe(false)
  })

  it('январь сравнивается с декабрём прошлого года, I квартал — с IV', () => {
    expect(getPreviousPeriod({ mode: 'month', value: 202601 })).toEqual({
      mode: 'month',
      value: 202512,
    })
    expect(getPreviousPeriod({ mode: 'quarter', value: 20261 })).toEqual({
      mode: 'quarter',
      value: 20254,
    })
  })
})

describe('getTrendMonths', () => {
  it('«весь период» — непрерывная шкала без пропусков', () => {
    const months = getTrendMonths({ mode: 'all' }, [
      row({ ACCIDENT_DATE: '2026-01-05' }),
      row({ ACCIDENT_DATE: '2026-06-05' }),
    ])
    expect(months).toEqual([202601, 202602, 202603, 202604, 202605, 202606])
  })

  it('через границу года', () => {
    expect(getTrendMonths({ mode: 'month', value: 202602 }, []).slice(0, 2)).toEqual([
      202503, 202504,
    ])
  })
})
