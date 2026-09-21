import {
  formatNumber,
  formatPercent,
  getCurrencyCode,
  getCurrencySymbol,
} from '@/shared/lib/formatters'
import { formatMonthShortLabel, ymToYear, type Period } from '@/entities/accident/lib/period'
import type { CauseSlice } from '@/entities/accident/lib/metrics'

// Компактные подписи денежной оси: на графике не нужны полные суммы, иначе
// подписи делений шире самого графика.
// Во встроенных шрифтах PDF есть только ₸ и $ — для остальных валют
// пишем код (RUB, EUR), иначе вместо знака будет пустой квадрат.
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
    return withPdfCurrency(`${formatNumber(millions, Number.isInteger(millions) ? 0 : 1)} млн`)
  }
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000
    return withPdfCurrency(`${formatNumber(thousands, Number.isInteger(thousands) ? 0 : 1)} тыс`)
  }
  return withPdfCurrency(formatNumber(value, 0))
}

export function formatCountAxis(value: number): string {
  return formatNumber(Math.round(value))
}

// "Окт" + "25" двумя строками — в узкой карточке год не влезает в одну.
export function splitMonthLabel(ym: number): { label: string; sublabel: string } {
  const [month] = formatMonthShortLabel(ym).split(' ')
  return { label: month, sublabel: String(ymToYear(ym) % 100) }
}

export function formatMonthAxisLabel(ym: number): string {
  return formatMonthShortLabel(ym)
}

// Короткий вывод под карточкой "Структура причин ДТП" — не аналитика "на
// глаз", а пересказ чисел, которые уже показаны на графике. Общий для
// "Обзора" и "Автоколонны" (см. buildOverviewReport/buildMotorcadeReport).
export function causesNote(causeSlices: CauseSlice[], total: number): string {
  if (total === 0) return 'За выбранный период ДТП не зарегистрировано.'

  const top = [...causeSlices].sort((a, b) => b.count - a.count)[0]
  if (!top || top.count === 0) return 'Причины ДТП за период не классифицированы.'
  if (top.count === total) {
    return `Все ДТП периода отнесены к категории «${top.label}» — 100% случаев.`
  }
  return `Больше всего ДТП в категории «${top.label}» — ${formatNumber(top.count)} из ${formatNumber(total)} (${formatPercent(top.count / total)}).`
}

// Часть имени файла dtp-<экран>-<период>-<YYYYMMDD-HHmm>.pdf, отвечающая за
// период — короткая и без символов, проблемных для имени файла в Windows.
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

// Полная сумма для PDF — как formatCurrency, но только со знаками,
// которые есть во встроенных шрифтах.
export function formatPdfCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return withPdfCurrency(formatNumber(value, 0))
}
