import type { AccidentRow } from '../model/types'

export type PeriodMode = 'month' | 'quarter' | 'year' | 'all'

export type Period =
  | { mode: 'month'; value: number } // YYYYMM
  | { mode: 'quarter'; value: number } // YYYYQ, Q = 1..4
  | { mode: 'year'; value: number } // YYYY
  | { mode: 'all' }

const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

const MONTH_SHORT = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
]

const QUARTER_ROMAN = ['I', 'II', 'III', 'IV']

// ACCIDENT_DATE — ISO-строка, берём год и месяц напрямую из символов,
// не через Date (часовой пояс браузера не должен сдвигать дату на сутки).
export function accidentDateToYm(dateStr: string | null | undefined): number {
  if (!dateStr || dateStr.length < 7) return 0
  const year = Number(dateStr.slice(0, 4))
  const month = Number(dateStr.slice(5, 7))
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
  return `${MONTH_NAMES[month - 1] || '?'} ${year}`
}

export function formatMonthShortLabel(ym: number): string {
  const year = ymToYear(ym)
  const month = ym % 100
  return `${MONTH_SHORT[month - 1] || '?'} ${year}`
}

export function formatQuarterLabel(yq: number): string {
  const year = Math.floor(yq / 10)
  const quarter = yq % 10
  return `${QUARTER_ROMAN[quarter - 1] || quarter} квартал ${year}`
}

export function formatYearLabel(year: number): string {
  return String(year)
}

export function formatPeriodLabel(period: Period): string {
  if (period.mode === 'all') return 'Весь период'
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

// Последний месяц, за который есть хотя бы одна запись — период по
// умолчанию.
export function getLatestMonth(rows: AccidentRow[]): number | null {
  let max = 0
  rows.forEach((row) => {
    const ym = accidentDateToYm(row.ACCIDENT_DATE)
    if (ym > max) max = ym
  })
  return max || null
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

// Графики "по месяцам" всегда показывают 12 месяцев, заканчивая выбранным
// периодом — год даёт янв-дек этого года, весь период — все месяцы данных.
export function getTrendMonths(period: Period, rows: AccidentRow[]): number[] {
  if (period.mode === 'all') {
    const months = new Set(rows.map((row) => accidentDateToYm(row.ACCIDENT_DATE)).filter(Boolean))
    return Array.from(months).sort((a, b) => a - b)
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
