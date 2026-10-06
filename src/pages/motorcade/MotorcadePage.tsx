import { useCallback, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { getMotorcadeKey } from '@/entities/accident/lib/motorcade'
import { ErrorState } from '@/shared/ui/ErrorState/ErrorState'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import { getReportDataContext } from '@/features/pdf-report/model/reportContext'
import { formatPeriodLabel, partialPeriodNote } from '@/entities/accident/lib/period'
import { formatNumber } from '@/shared/lib/formatters'
import { PageHeader } from '@/widgets/page-header/PageHeader'
import { SectionDivider } from '@/shared/ui/SectionDivider/SectionDivider'
import { computeMotorcade } from './model/motorcadeData'
import { MotorcadeKpiRow } from './ui/MotorcadeKpiRow'
import { MotorcadeCharts } from './ui/MotorcadeCharts'
import { MotorcadeTables } from './ui/MotorcadeTables'
import { themeStore } from '@/shared/lib/theme/themeStore'
import { t } from '@/shared/i18n'
import styles from './MotorcadePage.module.css'

export const MotorcadePage = observer(function MotorcadePage() {
  const period = filtersStore.period
  const selectedKey = filtersStore.selectedMotorcadeKey
  const selectedOption = filtersStore.motorcadeOptions.find((o) => o.key === selectedKey)

  // Данные берутся из сторов в момент клика
  const exportPdf = useCallback(async () => {
    const currentPeriod = filtersStore.period
    const currentKey = filtersStore.selectedMotorcadeKey
    const currentOption = filtersStore.motorcadeOptions.find((o) => o.key === currentKey)
    if (!currentKey || !currentOption) return

    const { saveMotorcadeReport } = await import('@/features/pdf-report/lib/buildMotorcadeReport')
    const currentRows = accidentsStore.rows.filter((row) => getMotorcadeKey(row) === currentKey)
    const currentData = computeMotorcade(currentRows, currentPeriod)
    return saveMotorcadeReport({
      data: currentData,
      context: getReportDataContext(currentData.comparison),
      period: currentPeriod,
      motorcadeName: currentOption.name,
      onSection: (done, total) => pdfReportStore.setProgress(done, total),
    })
  }, [])

  useEffect(() => {
    pdfReportStore.register(exportPdf)
    return () => pdfReportStore.unregister(exportPdf)
  }, [exportPdf])

  if (!selectedKey || !selectedOption) {
    return (
      <div className={styles.page}>
        <ErrorState message={t('roadAccidents.motorcade.noMotorcades')} />
      </div>
    )
  }

  const motorcadeRows = accidentsStore.rows.filter((row) => getMotorcadeKey(row) === selectedKey)
  const data = computeMotorcade(motorcadeRows, period)
  const partialNote = partialPeriodNote(data.comparison)

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={t('roadAccidents.nav.motorcade')}
        title={selectedOption.name}
        meta={[
          formatPeriodLabel(period),
          t('roadAccidents.motorcade.accidentsForPeriod', { count: formatNumber(data.kpi.count) }),
          ...(partialNote ? [partialNote] : []),
        ]}
      />

      <MotorcadeKpiRow data={data} period={period} />
      <SectionDivider title={t('roadAccidents.common.dynamicsAndStructure')} />
      {/* Перемонтирование графиков при смене темы */}
      <MotorcadeCharts key={themeStore.theme} data={data} period={period} />
      <SectionDivider title={t('roadAccidents.common.details')} />
      <MotorcadeTables data={data} period={period} />
    </div>
  )
})
