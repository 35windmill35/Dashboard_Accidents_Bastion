import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { getMotorcadeKey } from '@/entities/accident/lib/motorcade'
import { ErrorState } from '@/shared/ui/ErrorState/ErrorState'
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
// PDF-отчёт на этом экране пока не реализуем (см. задачу) — экран не
// регистрирует обработчик в pdfReportStore, поэтому кнопка "PDF отчёт" в
// шапке остаётся неактивной сама по себе (см. AppTopBar/pdfReportStore).
// Когда дойдёт очередь — подключается так же, как на "Обзоре"
// (OverviewPage): экспортёр строится по computeMotorcade и регистрируется
// в pdfReportStore через useEffect при монтировании.
export const MotorcadePage = observer(function MotorcadePage() {
  const period = filtersStore.period
  const selectedKey = filtersStore.selectedMotorcadeKey
  const selectedOption = filtersStore.motorcadeOptions.find((o) => o.key === selectedKey)

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
      <MotorcadeCharts data={data} period={period} motorcadeRows={motorcadeRows} />
      <MotorcadeTables data={data} period={period} />
    </div>
  )
})
