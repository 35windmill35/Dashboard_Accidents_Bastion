import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { getMotorcadeKey } from '@/entities/accident/lib/motorcade'
import { ErrorState } from '@/shared/ui/ErrorState/ErrorState'
import { computeAnalytics } from './model/analyticsData'
import { AnalyticsKpiGroups } from './ui/AnalyticsKpiGroups'
import { AnalyticsCharts } from './ui/AnalyticsCharts'
import { AnalyticsTables } from './ui/AnalyticsTables'
import styles from './AnalyticsPage.module.css'

// Экран "Аналитика" — сравнение двух автоколонн. Оба селектора — в общей
// шапке (AppTopBar, видны только на этом маршруте), взаимоисключающий выбор
// уже реализован в filtersStore (setAnalyticsMotorcadeA/B). Период общий с
// остальными экранами.
//
// PDF-отчёт здесь пока не реализуем (см. "Автоколонну") — экран не
// регистрирует обработчик в pdfReportStore, кнопка в шапке остаётся
// неактивной сама по себе.
export const AnalyticsPage = observer(function AnalyticsPage() {
  const period = filtersStore.period
  const keyA = filtersStore.selectedAnalyticsKeyA
  const keyB = filtersStore.selectedAnalyticsKeyB
  const optionA = filtersStore.motorcadeOptions.find((o) => o.key === keyA)
  const optionB = filtersStore.motorcadeOptions.find((o) => o.key === keyB)

  if (!keyA || !keyB || !optionA || !optionB) {
    return (
      <div className={styles.page}>
        <ErrorState message="Для сравнения нужно как минимум две автоколонны с ДТП в загруженных данных" />
      </div>
    )
  }

  const rowsA = accidentsStore.rows.filter((row) => getMotorcadeKey(row) === keyA)
  const rowsB = accidentsStore.rows.filter((row) => getMotorcadeKey(row) === keyB)
  const data = computeAnalytics(keyA, optionA.name, rowsA, keyB, optionB.name, rowsB, period)

  return (
    <div className={styles.page}>
      <AnalyticsKpiGroups data={data} period={period} />
      <AnalyticsCharts data={data} period={period} rowsA={rowsA} rowsB={rowsB} />
      <AnalyticsTables data={data} period={period} />
    </div>
  )
})
