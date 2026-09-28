import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { authStore } from '@/entities/user/model/authStore'
import type { PeriodComparison } from '@/entities/accident/lib/period'
import { partialPeriodNote } from '@/entities/accident/lib/period'
import type { ReportDataContext } from '../lib/pdfChrome'

// Состояние данных на момент формирования отчёта — для шапки PDF: когда
// загружены данные и каких баз в них нет. Отчёт без этого выглядел бы
// полным, даже если часть баз не ответила.
export function getReportDataContext(comparison: PeriodComparison | null): ReportDataContext {
  const staleNames = new Set(accidentsStore.staleFirms.map((firm) => firm.name))
  const unavailable = Array.from(
    new Set([...authStore.rightsCheckErrors, ...accidentsStore.failedFirms])
  ).filter((name) => !staleNames.has(name))

  return {
    loadedAt: accidentsStore.loadedAt,
    unavailableFirms: unavailable,
    staleFirms: accidentsStore.staleFirms,
    partialNote: comparison ? partialPeriodNote(comparison) : null,
  }
}
