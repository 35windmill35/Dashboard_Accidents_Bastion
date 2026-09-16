import type { Period } from '@/entities/accident/lib/period'

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
