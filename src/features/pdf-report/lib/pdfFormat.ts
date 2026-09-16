import { formatNumber } from '@/shared/lib/formatters'
import { formatMonthShortLabel, ymToYear, type Period } from '@/entities/accident/lib/period'

// Компактные подписи денежной оси: на графике не нужны полные суммы, иначе
// подписи делений шире самого графика.
export function formatMoneyAxis(value: number): string {
  if (value === 0) return '0 ₸'
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000
    return `${formatNumber(millions, Number.isInteger(millions) ? 0 : 1)} млн ₸`
  }
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000
    return `${formatNumber(thousands, Number.isInteger(thousands) ? 0 : 1)} тыс ₸`
  }
  return `${formatNumber(value, 0)} ₸`
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

// Период в подвале идёт строчными: "Период: сентябрь 2026."
export function toLowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
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
