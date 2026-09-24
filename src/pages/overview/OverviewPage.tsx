import { useCallback, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { authStore } from '@/entities/user/model/authStore'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import { formatPeriodLabel } from '@/entities/accident/lib/period'
import { PageHeader } from '@/widgets/page-header/PageHeader'
import { SectionDivider } from '@/shared/ui/SectionDivider/SectionDivider'
import { computeOverview } from './model/overviewData'
import { OverviewKpiRow } from './ui/OverviewKpiRow'
import { OverviewCharts } from './ui/OverviewCharts'
import { OverviewTables } from './ui/OverviewTables'
import styles from './OverviewPage.module.css'

// Экран "Обзор" — компания целиком, по всем разрешённым базам и
// автоколоннам сразу. Период общий для всех трёх экранов (filtersStore),
// сам экран только считает и отображает — фильтрация уже сделана на
// клиенте при первой загрузке (см. accidentsStore).
export const OverviewPage = observer(function OverviewPage() {
  const period = filtersStore.period
  const data = computeOverview(accidentsStore.rows, period)

  // PDF собирается по тем же данным, что и экран, а не снимком вёрстки —
  // поэтому обработчику не нужны ссылки на DOM, только актуальные сторы на
  // момент клика. Модуль отчёта грузится динамически: jsPDF со встроенными
  // шрифтами тянуть в основной бандл незачем.
  const exportPdf = useCallback(async () => {
    const { saveOverviewReport } = await import('@/features/pdf-report/lib/buildOverviewReport')

    const currentPeriod = filtersStore.period
    saveOverviewReport({
      data: computeOverview(accidentsStore.rows, currentPeriod),
      period: currentPeriod,
      firmNames: (authStore.allowedDbIndexes ?? []).map(
        (dbIndex) => authStore.firms[dbIndex]?.FIRM_SHORT_NAME || `база #${dbIndex}`
      ),
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
        eyebrow="Сводка по автопарку"
        title="Обзор"
        meta={[formatPeriodLabel(period), 'Все автоколонны']}
      />
      <OverviewKpiRow data={data} period={period} />
      <SectionDivider title="Динамика и структура" />
      <OverviewCharts data={data} period={period} />
      <SectionDivider title="Детализация" />
      <OverviewTables data={data} period={period} />
    </div>
  )
})
