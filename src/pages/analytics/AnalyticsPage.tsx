import { useCallback, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { authStore } from '@/entities/user/model/authStore'
import { getMotorcadeKey } from '@/entities/accident/lib/motorcade'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { PageHeader } from '@/widgets/page-header/PageHeader'
import { SectionDivider } from '@/shared/ui/SectionDivider/SectionDivider'
import type { AccidentRow } from '@/entities/accident/model/types'
import { ErrorState } from '@/shared/ui/ErrorState/ErrorState'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import { getReportDataContext } from '@/features/pdf-report/model/reportContext'
import { computeAnalytics, type AnalyticsData } from './model/analyticsData'
import { AnalyticsKpiGroups } from './ui/AnalyticsKpiGroups'
import { AnalyticsCharts } from './ui/AnalyticsCharts'
import { AnalyticsTables } from './ui/AnalyticsTables'
import { themeStore } from '@/shared/lib/theme/themeStore'
import { t } from '@/shared/i18n'
import styles from './AnalyticsPage.module.css'

interface AnalyticsSnapshot {
  data: AnalyticsData
  period: Period
  // Без фильтра периода — для кликов по месяцам на графиках динамики
  rowsA: AccidentRow[]
  rowsB: AccidentRow[]
}

// Общий для экрана и PDF
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

// Баннер сопоставимости скрыт по решению заказчика (тексты считаются в comparabilityWarnings)
export const AnalyticsPage = observer(function AnalyticsPage() {
  const exportPdf = useCallback(async () => {
    const snapshot = computeCurrentAnalytics()
    if (!snapshot) return

    const { saveAnalyticsReport } = await import('@/features/pdf-report/lib/buildAnalyticsReport')
    const dbIndexes = Array.from(new Set([snapshot.data.a.dbIndex, snapshot.data.b.dbIndex]))
    return saveAnalyticsReport({
      data: snapshot.data,
      context: getReportDataContext(null),
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
        <ErrorState message={t('roadAccidents.analytics.notEnoughMotorcades')} />
      </div>
    )
  }

  const { data, period, rowsA, rowsB } = snapshot

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={t('roadAccidents.analytics.eyebrow')}
        title={t('roadAccidents.nav.analytics')}
        meta={[
          formatPeriodLabel(period),
          t('roadAccidents.analytics.pair', { a: data.a.name, b: data.b.name }),
        ]}
      />
      <AnalyticsKpiGroups key={themeStore.theme} data={data} period={period} />
      <SectionDivider title={t('roadAccidents.common.dynamicsAndStructure')} />
      {/* Перемонтирование графиков при смене темы */}
      <AnalyticsCharts
        key={themeStore.theme}
        data={data}
        period={period}
        rowsA={rowsA}
        rowsB={rowsB}
      />
      <SectionDivider title={t('roadAccidents.common.details')} />
      <AnalyticsTables data={data} period={period} />
    </div>
  )
})
