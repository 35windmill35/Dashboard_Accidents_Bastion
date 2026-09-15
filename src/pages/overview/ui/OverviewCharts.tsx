import { AccidentsTrendChart } from './charts/AccidentsTrendChart'
import { CausesPieChart } from './charts/CausesPieChart'
import { MotorcadeCountChart } from './charts/MotorcadeCountChart'
import { MotorcadeDamageChart } from './charts/MotorcadeDamageChart'
import { CauseDamageChart } from './charts/CauseDamageChart'
import { DamageTrendChart } from './charts/DamageTrendChart'
import type { OverviewData } from '../model/overviewData'
import type { Period } from '@/entities/accident/lib/period'
import styles from './OverviewCharts.module.css'

interface OverviewChartsProps {
  data: OverviewData
  period: Period
}

export function OverviewCharts({ data, period }: OverviewChartsProps) {
  return (
    <div className={styles.grid}>
      <AccidentsTrendChart data={data} />
      <CausesPieChart data={data} period={period} />
      <MotorcadeCountChart data={data} period={period} />
      <MotorcadeDamageChart data={data} period={period} />
      <CauseDamageChart data={data} period={period} />
      <DamageTrendChart data={data} />
    </div>
  )
}
