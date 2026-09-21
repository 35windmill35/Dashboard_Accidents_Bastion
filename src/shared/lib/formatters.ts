// Единые утилиты форматирования — использовать только их в компонентах,
// чтобы формат чисел/дат не расходился между экранами.

const NBSP = '\u00a0' // неразрывный пробел: сумма и знак валюты не разрываются переносом

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

// Валюта берётся из CURRENCY_CODE загруженных данных (ТЗ §8):
// accidentsStore после загрузки вызывает setCurrencyCode с единственной
// валютой датасета. Если валют несколько или данных нет — подписи без
// знака валюты (экран отдельно предупреждает о смешанных валютах).
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

// Сокращённая подпись для оси Y денежных графиков — полная сумма
// («60 000 ₸») не помещается в отведённую под подписи ширину и обрезается
// слева; подсказка при наведении по-прежнему показывает точную сумму
// через formatCurrency.
export function formatCompactCurrency(value: number | null | undefined): string {
  if (isEmpty(value)) return '—'
  const num = value as number
  const abs = Math.abs(num)
  if (abs >= 1_000_000) return withCurrency(`${formatNumber(num / 1_000_000, 1)} млн`)
  if (abs >= 1_000) return withCurrency(`${formatNumber(num / 1_000, abs >= 10_000 ? 0 : 1)} тыс`)
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
