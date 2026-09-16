import { useCallback, useEffect, useMemo, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { authStore } from '@/entities/user/model/authStore'
import { formatPeriodLabel } from '@/entities/accident/lib/period'
import { formatCurrency, formatNumber } from '@/shared/lib/formatters'
import { generatePdfReport } from '@/features/pdf-report/lib/generatePdfReport'
import { periodSlug } from '@/features/pdf-report/lib/periodSlug'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import type { PdfSection } from '@/features/pdf-report/lib/pdfTypes'
import { computeOverview } from './model/overviewData'
import { OverviewKpiRow } from './ui/OverviewKpiRow'
import { OverviewCharts, type OverviewChartPdfRefs } from './ui/OverviewCharts'
import { OverviewTables } from './ui/OverviewTables'
import styles from './OverviewPage.module.css'

// Топ-N в PDF должен совпадать со свёрнутым (не "Показать все") состоянием
// таблиц на экране — те же числа, что и initialLimit в OverviewTables.
const DRIVERS_TOP_N = 8
const VEHICLES_TOP_N = 8
const CAUSES_TOP_N = 5

// Экран "Обзор" — компания целиком, по всем разрешённым базам и
// автоколоннам сразу. Период общий для всех трёх экранов (filtersStore),
// сам экран только считает и отображает — фильтрация уже сделана на
// клиенте при первой загрузке (см. accidentsStore).
export const OverviewPage = observer(function OverviewPage() {
  const period = filtersStore.period
  const data = computeOverview(accidentsStore.rows, period)

  const kpiRef = useRef<HTMLDivElement>(null)
  const chartRefs: OverviewChartPdfRefs = useMemo(
    () => ({
      trend: { current: null },
      causes: { current: null },
      motorcadeCount: { current: null },
      motorcadeDamage: { current: null },
      causeDamage: { current: null },
      damageTrend: { current: null },
    }),
    []
  )

  // Обработчик PDF читает актуальные store/filtersStore на момент клика, а
  // не замыкает данные текущего рендера — регистрируется в pdfReportStore
  // один раз при монтировании экрана и снимается при размонтировании.
  const exportPdf = useCallback(async () => {
    const currentPeriod = filtersStore.period
    const currentData = computeOverview(accidentsStore.rows, currentPeriod)
    const periodLabel = formatPeriodLabel(currentPeriod)

    const firmNames = (authStore.allowedDbIndexes ?? []).map(
      (dbIndex) => authStore.firms[dbIndex]?.FIRM_SHORT_NAME || `база #${dbIndex}`
    )

    const sections: PdfSection[] = [
      { kind: 'image', key: 'kpi', ref: kpiRef },
      { kind: 'image', key: 'chart-trend', ref: chartRefs.trend },
      { kind: 'image', key: 'chart-causes', ref: chartRefs.causes },
      { kind: 'image', key: 'chart-motorcade-count', ref: chartRefs.motorcadeCount },
      { kind: 'image', key: 'chart-motorcade-damage', ref: chartRefs.motorcadeDamage },
      { kind: 'image', key: 'chart-cause-damage', ref: chartRefs.causeDamage },
      { kind: 'image', key: 'chart-damage-trend', ref: chartRefs.damageTrend },
      {
        kind: 'table',
        key: 'drivers',
        title: `Топ-${DRIVERS_TOP_N} водителей по числу ДТП`,
        columns: [
          { header: 'Водитель' },
          { header: 'ДТП', align: 'right' },
          { header: 'Ущерб', align: 'right' },
        ],
        rows: currentData.driversRanking
          .slice(0, DRIVERS_TOP_N)
          .map((r) => [r.name, formatNumber(r.count), formatCurrency(r.sumDamage)]),
        caption: 'Полный список — на экране, кнопка «Показать все» или экспорт CSV',
      },
      {
        kind: 'table',
        key: 'vehicles',
        title: `Топ-${VEHICLES_TOP_N} автобусов по числу ДТП`,
        columns: [
          { header: 'ТС' },
          { header: 'ДТП', align: 'right' },
          { header: 'Ущерб', align: 'right' },
        ],
        rows: currentData.vehiclesRanking
          .slice(0, VEHICLES_TOP_N)
          .map((r) => [r.name, formatNumber(r.count), formatCurrency(r.sumDamage)]),
        caption: 'Полный список — на экране, кнопка «Показать все» или экспорт CSV',
      },
      {
        kind: 'table',
        key: 'causes',
        title: 'Ущерб и возмещение по категориям причин',
        columns: [
          { header: 'Категория' },
          { header: 'ДТП', align: 'right' },
          { header: 'Ущерб', align: 'right' },
          { header: 'Возмещение', align: 'right' },
        ],
        rows: currentData.causeSlices
          .slice(0, CAUSES_TOP_N)
          .map((r) => [
            r.label,
            formatNumber(r.count),
            formatCurrency(r.sumDamage),
            formatCurrency(r.sumCompensated),
          ]),
        caption: 'Полный список — на экране, кнопка «Показать все» или экспорт CSV',
      },
    ]

    await generatePdfReport(
      {
        screenName: 'Обзор',
        filtersLines: [
          `Период: ${periodLabel}`,
          `Базы: ${firmNames.length > 0 ? firmNames.join(', ') : '—'}`,
        ],
      },
      sections,
      { screenSlug: 'obzor', periodSlug: periodSlug(currentPeriod) },
      (current, total) => pdfReportStore.setProgress(current, total)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    pdfReportStore.register(exportPdf)
    return () => pdfReportStore.unregister(exportPdf)
  }, [exportPdf])

  return (
    <div className={styles.page}>
      {accidentsStore.hasPartialFailure && (
        <div className={styles.banner}>
          Не удалось загрузить данные по базам: {accidentsStore.failedFirms.join(', ')}. Показатели
          посчитаны по остальным базам.
        </div>
      )}

      <OverviewKpiRow data={data} period={period} pdfRef={kpiRef} />
      <OverviewCharts data={data} period={period} pdfRefs={chartRefs} />
      <OverviewTables data={data} period={period} />
    </div>
  )
})
