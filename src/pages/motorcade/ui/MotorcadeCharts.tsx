import { MotorcadeTrendChart } from './charts/MotorcadeTrendChart'
import { MotorcadeCausesPieChart } from './charts/MotorcadeCausesPieChart'
import { MotorcadeCauseDamageChart } from './charts/MotorcadeCauseDamageChart'
import { MotorcadeDamageTrendChart } from './charts/MotorcadeDamageTrendChart'
import type { MotorcadeData } from '../model/motorcadeData'
import type { Period } from '@/entities/accident/lib/period'
import styles from './MotorcadeCharts.module.css'

interface MotorcadeChartsProps {
  data: MotorcadeData
  period: Period
}

export function MotorcadeCharts({ data, period }: MotorcadeChartsProps) {
  return (
    <div className={styles.grid}>
      <MotorcadeTrendChart data={data} />
      <MotorcadeCausesPieChart data={data} period={period} />
      <MotorcadeCauseDamageChart data={data} period={period} />
      <MotorcadeDamageTrendChart data={data} />
    </div>
  )
}
