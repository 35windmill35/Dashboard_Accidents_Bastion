import { useCallback, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { authStore } from '@/entities/user/model/authStore'
import { getMotorcadeKey } from '@/entities/accident/lib/motorcade'
import { ErrorState } from '@/shared/ui/ErrorState/ErrorState'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import { computeMotorcade } from './model/motorcadeData'
import { MotorcadeKpiRow } from './ui/MotorcadeKpiRow'
import { MotorcadeCharts } from './ui/MotorcadeCharts'
import { MotorcadeTables } from './ui/MotorcadeTables'
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
    saveMotorcadeReport({
      data: computeMotorcade(currentRows, currentPeriod),
      period: currentPeriod,
      motorcadeName: currentOption.name,
      firmName:
        authStore.firms[currentOption.dbIndex]?.FIRM_SHORT_NAME || `база #${currentOption.dbIndex}`,
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
        <ErrorState message="Не найдено ни одной автоколонны в загруженных данных" />
      </div>
    )
  }

  const motorcadeRows = accidentsStore.rows.filter((row) => getMotorcadeKey(row) === selectedKey)
  const data = computeMotorcade(motorcadeRows, period)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{selectedOption.name}</h1>

      <MotorcadeKpiRow data={data} period={period} />
      <MotorcadeCharts data={data} period={period} />
      <MotorcadeTables data={data} period={period} />
    </div>
  )
})
