// Единые утилиты форматирования — использовать только их в компонентах,
// чтобы формат чисел/дат не расходился между экранами.

const NBSP = ' '

function isEmpty(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value)
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (isEmpty(value)) return '—'
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value as number)
}

// Код валюты берётся из CURRENCY_CODE конкретной записи, в KPI — без копеек.
export function formatCurrency(
  value: number | null | undefined,
  currencyCode?: string | null
): string {
  if (isEmpty(value)) return '—'
  const amount = formatNumber(value, 0)
  return currencyCode ? `${amount}${NBSP}${currencyCode}` : amount
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (isEmpty(value)) return '—'
  return `${formatNumber((value as number) * 100, decimals)}%`
}

export function calcDelta(
  cur: number | null | undefined,
  prev: number | null | undefined
): number | null {
  if (isEmpty(cur) || isEmpty(prev) || prev === 0) return null
  return ((cur as number) - (prev as number)) / (prev as number)
}

export function formatDelta(delta: number | null | undefined, decimals = 0): string {
  if (isEmpty(delta)) return '—'
  const value = delta as number
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatNumber(Math.abs(value) * 100, decimals)}%`
}

export function isDeltaPositive(
  delta: number | null | undefined,
  higherIsBetter = true
): boolean | null {
  if (isEmpty(delta) || delta === 0) return null
  const isIncrease = (delta as number) > 0
  return higherIsBetter ? isIncrease : !isIncrease
}

// "2026-04-19T..." -> "19.04.2026"
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU').format(date)
}

// ACCIDENT_TIME приходит с фиктивной датой 1900-01-01, значение — только
// время.
export function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date)
}
