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

// Экран "Обзор" — компания целиком, по всем разрешённым базам и
// автоколоннам сразу. Период общий для всех трёх экранов (filtersStore),
// сам экран только считает и отображает — фильтрация уже сделана на
// клиенте при первой загрузке (см. accidentsStore).
export const OverviewPage = observer(function OverviewPage() {
  const period = filtersStore.period
  const data = computeOverview(accidentsStore.rows, period, filtersStore.motorcadeLabels)
  const partialNote = partialPeriodNote(data.comparison)

  // PDF собирается по тем же данным, что и экран, а не снимком вёрстки —
  // поэтому обработчику не нужны ссылки на DOM, только актуальные сторы на
  // момент клика. Модуль отчёта грузится динамически: jsPDF со встроенными
  // шрифтами тянуть в основной бандл незачем.
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
      {/* Цвета графиков — JS-константы (Recharts не читает CSS-переменные):
          при смене системной темы перемонтируются только графики, а не весь
          экран с развёрнутыми таблицами */}
      <OverviewCharts key={themeStore.theme} data={data} period={period} />
      <SectionDivider title={t('roadAccidents.common.details')} />
      <OverviewTables data={data} period={period} />
    </div>
  )
})
