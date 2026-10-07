import { t } from '@/shared/i18n'

const NBSP = '\u00a0' // неразрывный пробел: сумма и знак валюты не разрываются переносом

function isEmpty(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value)
}

const numberFormats = new Map<number, Intl.NumberFormat>()

function numberFormat(decimals: number): Intl.NumberFormat {
  let format = numberFormats.get(decimals)
  if (!format) {
    format = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    numberFormats.set(decimals, format)
  }
  return format
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (isEmpty(value)) return '—'
  return numberFormat(decimals).format(value as number)
}

// Знак валюты — по единственному CURRENCY_CODE в данных, при нескольких валютах без знака
const CURRENCY_SYMBOLS: Record<string, string> = {
  KZT: '₸',
  RUB: '₽',
  USD: '$',
  EUR: '€',
  KGS: 'сом',
  UZS: 'сўм',
}

let currencyCode: string | null = null
let currencySuffix = ''

export function setCurrencyCode(code: string | null | undefined): void {
  const normalized = code?.trim().toUpperCase() || null
  currencyCode = normalized
  currencySuffix = normalized ? (CURRENCY_SYMBOLS[normalized] ?? normalized) : ''
}

export function getCurrencyCode(): string | null {
  return currencyCode
}

export function getCurrencySymbol(): string {
  return currencySuffix
}

function withCurrency(text: string): string {
  return currencySuffix ? `${text}${NBSP}${currencySuffix}` : text
}

export function formatCurrency(value: number | null | undefined): string {
  if (isEmpty(value)) return '—'
  return withCurrency(formatNumber(value, 0))
}

// Дробная часть только когда она есть: «85 млн», «42,5 млн»
function compactNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const decimals = Math.abs(rounded) >= 100 || Number.isInteger(rounded) ? 0 : 1
  return formatNumber(rounded, decimals)
}

// Короткая подпись оси Y («15 тыс ₸»)
export function formatCompactCurrency(value: number | null | undefined): string {
  if (isEmpty(value)) return '—'
  const num = value as number
  const abs = Math.abs(num)
  if (abs >= 1_000_000_000)
    return withCurrency(
      t('roadAccidents.unit.billionValue', { value: compactNumber(num / 1_000_000_000) })
    )
  if (abs >= 1_000_000)
    return withCurrency(
      t('roadAccidents.unit.millionValue', { value: compactNumber(num / 1_000_000) })
    )
  if (abs >= 1_000)
    return withCurrency(
      t('roadAccidents.unit.thousandValue', { value: compactNumber(num / 1_000) })
    )
  return formatCurrency(num)
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

// Изменение доли в п.п.: 40% → 50% = «+10 п.п.»
export function calcPointDelta(
  cur: number | null | undefined,
  prev: number | null | undefined
): number | null {
  if (isEmpty(cur) || isEmpty(prev)) return null
  return (cur as number) - (prev as number)
}

export function formatPointDelta(delta: number | null | undefined, decimals = 0): string {
  if (isEmpty(delta)) return '—'
  const value = delta as number
  const points = Math.abs(value) * 100
  const rounded = Number(points.toFixed(decimals))
  const sign = rounded === 0 ? '' : value > 0 ? '+' : '−'
  return t('roadAccidents.unit.pointsValue', { value: `${sign}${formatNumber(points, decimals)}` })
}

export type KpiKind = 'count' | 'currency' | 'percent'

export interface KpiDelta {
  value: number
  text: string
}

export function kpiDelta(
  kind: KpiKind,
  cur: number | null | undefined,
  prev: number | null | undefined
): KpiDelta | null {
  if (kind === 'percent') {
    const value = calcPointDelta(cur, prev)
    return value === null ? null : { value, text: formatPointDelta(value) }
  }
  const value = calcDelta(cur, prev)
  return value === null ? null : { value, text: formatDelta(value) }
}

export function isDeltaPositive(
  delta: number | null | undefined,
  higherIsBetter = true
): boolean | null {
  if (isEmpty(delta) || delta === 0) return null
  const isIncrease = (delta as number) > 0
  return higherIsBetter ? isIncrease : !isIncrease
}

// Без Date — иначе дата сдвигается на сутки в часовых поясах западнее UTC
export function formatDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (!match) return '—'
  return `${match[3]}.${match[2]}.${match[1]}`
}

// 12:00 и 00:00 — заглушки импорта старых записей, не время ДТП
const PLACEHOLDER_TIMES = new Set(['12:00:00', '00:00:00'])

export function formatTime(value: string | null | undefined): string {
  const match = /(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value ?? '')
  if (!match) return '—'
  const full = `${match[1]}:${match[2]}:${match[3] ?? '00'}`
  if (PLACEHOLDER_TIMES.has(full)) return '—'
  return `${match[1]}:${match[2]}`
}

// «Суммы за период, ₸»
export function withCurrencyUnit(text: string): string {
  return currencySuffix ? `${text}, ${currencySuffix}` : text
}
