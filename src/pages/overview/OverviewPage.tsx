import { observer } from 'mobx-react-lite'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
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

  return (
    <div className={styles.page}>
      {accidentsStore.hasPartialFailure && (
        <div className={styles.banner}>
          Не удалось загрузить данные по базам: {accidentsStore.failedFirms.join(', ')}. Показатели
          посчитаны по остальным базам.
        </div>
      )}

      <OverviewKpiRow data={data} period={period} />
      <OverviewCharts data={data} period={period} />
      <OverviewTables data={data} period={period} />
    </div>
  )
})
