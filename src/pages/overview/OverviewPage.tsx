import { useCallback, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import { getReportDataContext } from '@/features/pdf-report/model/reportContext'
import { formatPeriodLabel, partialPeriodNote } from '@/entities/accident/lib/period'
import { PageHeader } from '@/widgets/page-header/PageHeader'
import { SectionDivider } from '@/shared/ui/SectionDivider/SectionDivider'
import { computeOverview } from './model/overviewData'
import { OverviewKpiRow } from './ui/OverviewKpiRow'
import { OverviewCharts } from './ui/OverviewCharts'
import { OverviewTables } from './ui/OverviewTables'
import { themeStore } from '@/shared/lib/theme/themeStore'
import { t } from '@/shared/i18n'
import styles from './OverviewPage.module.css'

export const OverviewPage = observer(function OverviewPage() {
  const period = filtersStore.period
  const data = computeOverview(accidentsStore.rows, period, filtersStore.motorcadeLabels)
  const partialNote = partialPeriodNote(data.comparison)

  // Модуль отчёта грузится динамически
  const exportPdf = useCallback(async () => {
    const { saveOverviewReport } = await import('@/features/pdf-report/lib/buildOverviewReport')

    const currentPeriod = filtersStore.period
    const currentData = computeOverview(
      accidentsStore.rows,
      currentPeriod,
      filtersStore.motorcadeLabels
    )
    return saveOverviewReport({
      data: currentData,
      period: currentPeriod,
      context: getReportDataContext(currentData.comparison),
      onSection: (done, total) => pdfReportStore.setProgress(done, total),
    })
  }, [])

  useEffect(() => {
    pdfReportStore.register(exportPdf)
    return () => pdfReportStore.unregister(exportPdf)
  }, [exportPdf])

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={t('roadAccidents.overview.eyebrow')}
        title={t('roadAccidents.nav.overview')}
        meta={[
          formatPeriodLabel(period),
          t('roadAccidents.overview.allMotorcades'),
          ...(partialNote ? [partialNote] : []),
        ]}
      />
      <OverviewKpiRow data={data} period={period} />
      <SectionDivider title={t('roadAccidents.common.dynamicsAndStructure')} />
      {/* Перемонтирование графиков при смене темы */}
      <OverviewCharts key={themeStore.theme} data={data} period={period} />
      <SectionDivider title={t('roadAccidents.common.details')} />
      <OverviewTables data={data} period={period} />
    </div>
  )
})
