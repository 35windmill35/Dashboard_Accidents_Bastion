import {
  formatNumber,
  formatPercent,
  getCurrencyCode,
  getCurrencySymbol,
} from '@/shared/lib/formatters'
import { formatMonthShortLabel, ymToYear, type Period } from '@/entities/accident/lib/period'
import { t } from '@/shared/i18n'
import type { BreakdownSlice } from '@/entities/accident/lib/metrics'

// Во встроенных шрифтах PDF есть только ₸ и $, для остальных валют — код
const PDF_SAFE_SYMBOLS = new Set(['₸', '$'])

export function pdfCurrencySuffix(): string {
  const symbol = getCurrencySymbol()
  if (!symbol) return ''
  return PDF_SAFE_SYMBOLS.has(symbol) ? symbol : (getCurrencyCode() ?? '')
}

function withPdfCurrency(text: string): string {
  const suffix = pdfCurrencySuffix()
  return suffix ? `${text} ${suffix}` : text
}

export function formatMoneyAxis(value: number): string {
  if (value === 0) return withPdfCurrency('0')
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000
    return withPdfCurrency(
      t('roadAccidents.unit.millionValue', {
        value: formatNumber(millions, Number.isInteger(millions) ? 0 : 1),
      })
    )
  }
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000
    return withPdfCurrency(
      t('roadAccidents.unit.thousandValue', {
        value: formatNumber(thousands, Number.isInteger(thousands) ? 0 : 1),
      })
    )
  }
  return withPdfCurrency(formatNumber(value, 0))
}

export function formatCountAxis(value: number): string {
  return formatNumber(Math.round(value))
}

export function splitMonthLabel(ym: number): { label: string; sublabel: string } {
  const [month] = formatMonthShortLabel(ym).split(' ')
  return { label: month, sublabel: String(ymToYear(ym) % 100) }
}

// Пересказ чисел с графика, без интерпретации
export function breakdownNote(
  slices: BreakdownSlice[],
  total: number,
  kind: 'cause' | 'causer'
): string {
  if (total === 0) return t('roadAccidents.pdf.insight.noAccidents')

  const top = slices[0]
  if (top.count === total) {
    return kind === 'cause'
      ? t('roadAccidents.pdf.insight.singleCause', { name: top.label })
      : t('roadAccidents.pdf.insight.singleCauser', { name: top.label })
  }
  const params = {
    name: top.label,
    count: formatNumber(top.count),
    total: formatNumber(total),
    share: formatPercent(top.count / total),
  }
  return kind === 'cause'
    ? t('roadAccidents.pdf.insight.topCause', params)
    : t('roadAccidents.pdf.insight.topCauser', params)
}

// Без символов, проблемных для имён файлов в Windows
export function periodSlug(period: Period): string {
  if (period.mode === 'all') return 'ves-period'
  if (period.mode === 'year') return String(period.value)
  if (period.mode === 'quarter') {
    const year = Math.floor(period.value / 10)
    const quarter = period.value % 10
    return `${year}-Q${quarter}`
  }
  const year = Math.floor(period.value / 100)
  const month = period.value % 100
  return `${year}-${String(month).padStart(2, '0')}`
}

export function buildReportFilename(screenSlug: string, period: Period, now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`
  return `dtp-${screenSlug}-${periodSlug(period)}-${stamp}.pdf`
}

export function formatPdfCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return withPdfCurrency(formatNumber(value, 0))
}
