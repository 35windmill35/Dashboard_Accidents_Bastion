import type { AccidentRow } from '../model/types'
import { hasTranslation, t } from '@/shared/i18n'

export type PeriodMode = 'month' | 'quarter' | 'year' | 'all'

export type Period =
  | { mode: 'month'; value: number } // YYYYMM
  | { mode: 'quarter'; value: number } // YYYYQ, Q = 1..4
  | { mode: 'year'; value: number } // YYYY
  | { mode: 'all' }

// month — 1…12
function monthName(month: number, short = false): string {
  const key = `${short ? 'short.' : ''}month_${month - 1}`
  return hasTranslation(key) ? t(key) : '?'
}

const QUARTER_ROMAN = ['I', 'II', 'III', 'IV']

// Год и месяц из символов строки, без Date
export function accidentDateToYm(dateStr: string | null | undefined): number {
  if (!dateStr || dateStr.length < 7) return 0
  const year = Number(dateStr.slice(0, 4))
  const month = Number(dateStr.slice(5, 7))
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 0
  return year * 100 + month
}

export function ymToYear(ym: number): number {
  return Math.floor(ym / 100)
}

export function ymToYq(ym: number): number {
  const year = ymToYear(ym)
  const month = ym % 100
  return year * 10 + Math.ceil(month / 3)
}

function ymAddMonths(ym: number, delta: number): number {
  const year = ymToYear(ym)
  const month = ym % 100
  const total = year * 12 + (month - 1) + delta
  const newYear = Math.floor(total / 12)
  const newMonth = (total % 12) + 1
  return newYear * 100 + newMonth
}

export function formatMonthLabel(ym: number): string {
  const year = ymToYear(ym)
  const month = ym % 100
  return `${monthName(month)} ${year}`
}

export function formatMonthShortLabel(ym: number): string {
  const year = ymToYear(ym)
  const month = ym % 100
  return `${monthName(month, true)} ${year}`
}

export function formatQuarterLabel(yq: number): string {
  const year = Math.floor(yq / 10)
  const quarter = yq % 10
  return t('roadAccidents.period.quarterLabel', {
    quarter: QUARTER_ROMAN[quarter - 1] || quarter,
    year,
  })
}

export function formatYearLabel(year: number): string {
  return String(year)
}

export function formatPeriodLabel(period: Period): string {
  if (period.mode === 'all') return t('roadAccidents.period.all')
  if (period.mode === 'year') return formatYearLabel(period.value)
  if (period.mode === 'quarter') return formatQuarterLabel(period.value)
  return formatMonthLabel(period.value)
}

export function isInPeriod(row: AccidentRow, period: Period): boolean {
  if (period.mode === 'all') return true
  const ym = accidentDateToYm(row.ACCIDENT_DATE)
  if (period.mode === 'year') return ymToYear(ym) === period.value
  if (period.mode === 'quarter') return ymToYq(ym) === period.value
  return ym === period.value
}

export function getAvailableMonths(rows: AccidentRow[]): number[] {
  const months = new Set(rows.map((row) => accidentDateToYm(row.ACCIDENT_DATE)).filter(Boolean))
  return Array.from(months).sort((a, b) => b - a)
}

export function getAvailableYears(rows: AccidentRow[]): number[] {
  const years = new Set(getAvailableMonths(rows).map(ymToYear))
  return Array.from(years).sort((a, b) => b - a)
}

export function getAvailableQuarters(rows: AccidentRow[]): number[] {
  const quarters = new Set(getAvailableMonths(rows).map(ymToYq))
  return Array.from(quarters).sort((a, b) => b - a)
}

export function getPreviousPeriod(period: Period): Period | null {
  if (period.mode === 'all') return null
  if (period.mode === 'year') return { mode: 'year', value: period.value - 1 }
  if (period.mode === 'quarter') {
    const year = Math.floor(period.value / 10)
    const quarter = period.value % 10
    return quarter === 1
      ? { mode: 'quarter', value: (year - 1) * 10 + 4 }
      : { mode: 'quarter', value: period.value - 1 }
  }
  return { mode: 'month', value: ymAddMonths(period.value, -1) }
}

// 12 месяцев до конца выбранного периода; «весь период» — непрерывная шкала
export function getTrendMonths(period: Period, rows: AccidentRow[]): number[] {
  if (period.mode === 'all') {
    const months = rows.map((row) => accidentDateToYm(row.ACCIDENT_DATE)).filter(Boolean)
    if (months.length === 0) return []
    // reduce вместо Math.min(...): spread на больших массивах переполняет стек
    const first = months.reduce((min, ym) => (ym < min ? ym : min))
    const last = months.reduce((max, ym) => (ym > max ? ym : max))
    const result: number[] = []
    for (let ym = first; ym <= last; ym = ymAddMonths(ym, 1)) result.push(ym)
    return result
  }

  let endYm: number
  if (period.mode === 'year') {
    endYm = period.value * 100 + 12
  } else if (period.mode === 'quarter') {
    const year = Math.floor(period.value / 10)
    const quarter = period.value % 10
    endYm = year * 100 + quarter * 3
  } else {
    endYm = period.value
  }

  return Array.from({ length: 12 }, (_, i) => ymAddMonths(endYm, i - 11))
}

// Текущий период сравнивается с тем же числом дней предыдущего

const DAY_MS = 24 * 60 * 60 * 1000

function periodStartUtc(period: Exclude<Period, { mode: 'all' }>): number {
  if (period.mode === 'year') return Date.UTC(period.value, 0, 1)
  if (period.mode === 'quarter') {
    const year = Math.floor(period.value / 10)
    const quarter = period.value % 10
    return Date.UTC(year, (quarter - 1) * 3, 1)
  }
  return Date.UTC(ymToYear(period.value), (period.value % 100) - 1, 1)
}

function dateStrToUtc(dateStr: string | null | undefined): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr ?? '')
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function todayUtc(today: Date): number {
  return Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
}

function todayAsPeriodValue(mode: Exclude<PeriodMode, 'all'>, today: Date): number {
  const ym = today.getFullYear() * 100 + today.getMonth() + 1
  if (mode === 'year') return today.getFullYear()
  if (mode === 'quarter') return ymToYq(ym)
  return ym
}

export interface PeriodComparison {
  previous: Period | null
  isPartial: boolean
  // Включая сегодня
  elapsedDays: number | null
}

export function getPeriodComparison(period: Period, today: Date = new Date()): PeriodComparison {
  const previous = getPreviousPeriod(period)
  if (period.mode === 'all' || !previous || previous.mode === 'all') {
    return { previous, isPartial: false, elapsedDays: null }
  }
  if (period.value !== todayAsPeriodValue(period.mode, today)) {
    return { previous, isPartial: false, elapsedDays: null }
  }
  const elapsedDays = Math.floor((todayUtc(today) - periodStartUtc(period)) / DAY_MS) + 1
  return { previous, isPartial: true, elapsedDays }
}

export function isInComparisonWindow(row: AccidentRow, comparison: PeriodComparison): boolean {
  const { previous, isPartial, elapsedDays } = comparison
  if (!previous || !isInPeriod(row, previous)) return false
  if (!isPartial || elapsedDays === null || previous.mode === 'all') return true
  const date = dateStrToUtc(row.ACCIDENT_DATE)
  if (date === null) return false
  return date - periodStartUtc(previous) < elapsedDays * DAY_MS
}

export function comparisonLabel(comparison: PeriodComparison): string {
  return comparison.isPartial
    ? t('roadAccidents.period.vsSameDays')
    : t('roadAccidents.period.vsPrevious')
}

export function partialPeriodNote(comparison: PeriodComparison): string | null {
  if (!comparison.isPartial || comparison.elapsedDays === null) return null
  return t('roadAccidents.period.partialNote', { days: comparison.elapsedDays })
}

// По убыванию
export function getAvailablePeriodValues(mode: PeriodMode, rows: AccidentRow[]): number[] {
  if (mode === 'month') return getAvailableMonths(rows)
  if (mode === 'quarter') return getAvailableQuarters(rows)
  if (mode === 'year') return getAvailableYears(rows)
  return []
}

// "2026-08", "2026-Q3", "2026", "all"
export function periodToParam(period: Period): string {
  if (period.mode === 'all') return 'all'
  if (period.mode === 'year') return String(period.value)
  if (period.mode === 'quarter') {
    return `${Math.floor(period.value / 10)}-Q${period.value % 10}`
  }
  const month = period.value % 100
  return `${ymToYear(period.value)}-${String(month).padStart(2, '0')}`
}

export function parsePeriodParam(raw: string | null | undefined): Period | null {
  if (!raw) return null
  const value = raw.trim()
  if (value === 'all') return { mode: 'all' }

  let match = /^(\d{4})-(\d{2})$/.exec(value)
  if (match) {
    const month = Number(match[2])
    if (month < 1 || month > 12) return null
    return { mode: 'month', value: Number(match[1]) * 100 + month }
  }

  match = /^(\d{4})-Q([1-4])$/i.exec(value)
  if (match) return { mode: 'quarter', value: Number(match[1]) * 10 + Number(match[2]) }

  match = /^(\d{4})$/.exec(value)
  if (match) return { mode: 'year', value: Number(match[1]) }

  return null
}
