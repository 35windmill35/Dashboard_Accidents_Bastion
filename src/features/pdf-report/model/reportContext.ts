import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { authStore } from '@/entities/user/model/authStore'
import type { PeriodComparison } from '@/entities/accident/lib/period'
import { partialPeriodNote } from '@/entities/accident/lib/period'
import type { ReportDataContext } from '../lib/pdfChrome'

// Актуальность и полнота данных для шапки PDF
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
