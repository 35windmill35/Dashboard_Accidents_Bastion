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

// Экран "Статистика по автоколонне" — одна выбранная автоколонна за
// выбранный период. Селектор автоколонны — в общей шапке (AppTopBar,
// виден только на этом маршруте), период — общий с "Обзором"
// (filtersStore).
//
// PDF-отчёт подключается так же, как на "Обзоре" (см. OverviewPage):
// экспортёр регистрируется в pdfReportStore через useEffect при
// монтировании, кнопка "PDF отчёт" в шапке (AppTopBar) вызывает его через
// стор, сам стор не знает о конкретных экранах.
export const MotorcadePage = observer(function MotorcadePage() {
  const period = filtersStore.period
  const selectedKey = filtersStore.selectedMotorcadeKey
  const selectedOption = filtersStore.motorcadeOptions.find((o) => o.key === selectedKey)

  // exportPdf сам заново берёт период/автоколонну/строки из сторов в момент
  // вызова (а не из замыкания на рендер), как и exportPdf на "Обзоре" — к
  // моменту клика по кнопке в шапке они могли уже смениться.
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
      {/* Цвета графиков — JS-константы (Recharts не читает CSS-переменные):
          при смене системной темы перемонтируются только графики, а не весь
          экран с развёрнутыми таблицами */}
      <MotorcadeCharts key={themeStore.theme} data={data} period={period} />
      <SectionDivider title={t('roadAccidents.common.details')} />
      <MotorcadeTables data={data} period={period} />
    </div>
  )
})
