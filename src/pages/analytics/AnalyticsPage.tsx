import { useCallback, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { authStore } from '@/entities/user/model/authStore'
import { getMotorcadeKey } from '@/entities/accident/lib/motorcade'
import type { Period } from '@/entities/accident/lib/period'
import type { AccidentRow } from '@/entities/accident/model/types'
import { ErrorState } from '@/shared/ui/ErrorState/ErrorState'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import { computeAnalytics, type AnalyticsData } from './model/analyticsData'
import { AnalyticsKpiGroups } from './ui/AnalyticsKpiGroups'
import { AnalyticsCharts } from './ui/AnalyticsCharts'
import { AnalyticsTables } from './ui/AnalyticsTables'
import styles from './AnalyticsPage.module.css'

interface AnalyticsSnapshot {
  data: AnalyticsData
  period: Period
  // все строки автоколонн, без фильтра периода — для кликов по месяцам
  // графиков динамики, которые шире выбранного периода
  rowsA: AccidentRow[]
  rowsB: AccidentRow[]
}

// Срез "Аналитики" по текущему состоянию сторов — общий для экрана и
// PDF-отчёта, чтобы отчёт не мог разойтись с тем, что на экране.
function computeCurrentAnalytics(): AnalyticsSnapshot | null {
  const period = filtersStore.period
  const keyA = filtersStore.selectedAnalyticsKeyA
  const keyB = filtersStore.selectedAnalyticsKeyB
  const optionA = filtersStore.motorcadeOptions.find((o) => o.key === keyA)
  const optionB = filtersStore.motorcadeOptions.find((o) => o.key === keyB)
  if (!keyA || !keyB || !optionA || !optionB) return null

  const rowsA = accidentsStore.rows.filter((row) => getMotorcadeKey(row) === keyA)
  const rowsB = accidentsStore.rows.filter((row) => getMotorcadeKey(row) === keyB)
  const data = computeAnalytics(
    { key: keyA, name: optionA.name, dbIndex: optionA.dbIndex, rows: rowsA },
    { key: keyB, name: optionB.name, dbIndex: optionB.dbIndex, rows: rowsB },
    period
  )
  return { data, period, rowsA, rowsB }
}

// Экран "Аналитика" — сравнение двух автоколонн. Оба селектора — в общей
// шапке (AppTopBar, видны только на этом маршруте), взаимоисключающий выбор
// уже реализован в filtersStore (setAnalyticsMotorcadeA/B). Период общий с
// остальными экранами.
//
// Баннер о сопоставимости (ui/ComparabilityBanner, ТЗ §4.5/§6) временно
// скрыт по решению заказчика — и на экране, и в PDF. Тексты по-прежнему
// считаются в analyticsData.comparabilityWarnings: чтобы вернуть, достаточно
// снова отрисовать <ComparabilityBanner> здесь и noticeBlock в
// buildAnalyticsReport.
export const AnalyticsPage = observer(function AnalyticsPage() {
  const exportPdf = useCallback(async () => {
    const snapshot = computeCurrentAnalytics()
    if (!snapshot) return

    const { saveAnalyticsReport } = await import('@/features/pdf-report/lib/buildAnalyticsReport')
    const dbIndexes = Array.from(new Set([snapshot.data.a.dbIndex, snapshot.data.b.dbIndex]))
    saveAnalyticsReport({
      data: snapshot.data,
      period: snapshot.period,
      firmNames: dbIndexes.map((dbIndex) => authStore.getFirmName(dbIndex)),
      onSection: (done, total) => pdfReportStore.setProgress(done, total),
    })
  }, [])

  useEffect(() => {
    pdfReportStore.register(exportPdf)
    return () => pdfReportStore.unregister(exportPdf)
  }, [exportPdf])

  const snapshot = computeCurrentAnalytics()

  if (!snapshot) {
    return (
      <div className={styles.page}>
        <ErrorState message="Для сравнения нужно как минимум две автоколонны с ДТП в загруженных данных" />
      </div>
    )
  }

  const { data, period, rowsA, rowsB } = snapshot

  return (
    <div className={styles.page}>
      <AnalyticsKpiGroups data={data} period={period} />
      <AnalyticsCharts data={data} period={period} rowsA={rowsA} rowsB={rowsB} />
      <AnalyticsTables data={data} period={period} />
    </div>
  )
})
