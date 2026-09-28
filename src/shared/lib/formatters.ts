// Единые утилиты форматирования — использовать только их в компонентах,
// чтобы формат чисел/дат не расходился между экранами.

const NBSP = '\u00a0' // неразрывный пробел: сумма и знак валюты не разрываются переносом

function isEmpty(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value)
}

// Intl.NumberFormat дорогой в создании, а форматируются тысячи ячеек
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

// Валюта берётся из CURRENCY_CODE загруженных данных:
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

// Относительное изменение: 10 → 15 = +50%. Для количеств и сумм.
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

// Изменение доли — в процентных пунктах: 40% → 50% = «+10 п.п.», а не
// «+25%». Доли на входе — 0…1.
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
  return `${sign}${formatNumber(points, decimals)}${NBSP}п.п.`
}

export type KpiKind = 'count' | 'currency' | 'percent'

// Дельта KPI с учётом вида показателя: доли — в п.п., остальное — в %.
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

// "2026-04-19T..." -> "19.04.2026". Разбор по символам, без Date — иначе в
// часовых поясах западнее UTC дата сдвигается на сутки.
export function formatDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (!match) return '—'
  return `${match[3]}.${match[2]}.${match[1]}`
}

// ACCIDENT_TIME приходит с фиктивной датой 1900-01-01, значение — только
// время. 12:00 и 00:00 — заглушки импорта исторических записей (так
// записано подавляющее большинство старых ДТП), настоящим временем их не
// показываем.
const PLACEHOLDER_TIMES = new Set(['12:00:00', '00:00:00'])

export function formatTime(value: string | null | undefined): string {
  const match = /(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value ?? '')
  if (!match) return '—'
  const full = `${match[1]}:${match[2]}:${match[3] ?? '00'}`
  if (PLACEHOLDER_TIMES.has(full)) return '—'
  return `${match[1]}:${match[2]}`
}

// Подпись с единицей измерения для пояснений под заголовком графика:
// «Суммы за период, ₸» (без знака, если валюта неизвестна или смешанная).
export function withCurrencyUnit(text: string): string {
  return currencySuffix ? `${text}, ${currencySuffix}` : text
}
