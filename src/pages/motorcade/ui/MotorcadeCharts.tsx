import { MotorcadeTrendChart } from './charts/MotorcadeTrendChart'
import { MotorcadeCausesPieChart } from './charts/MotorcadeCausesPieChart'
import { MotorcadeCauseDamageChart } from './charts/MotorcadeCauseDamageChart'
import { MotorcadeDamageTrendChart } from './charts/MotorcadeDamageTrendChart'
import type { MotorcadeData } from '../model/motorcadeData'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { Period } from '@/entities/accident/lib/period'
import styles from './MotorcadeCharts.module.css'

interface MotorcadeChartsProps {
  data: MotorcadeData
  period: Period
  motorcadeRows: AccidentRow[]
}

export function MotorcadeCharts({ data, period, motorcadeRows }: MotorcadeChartsProps) {
  return (
    <div className={styles.grid}>
      <MotorcadeTrendChart data={data} motorcadeRows={motorcadeRows} />
      <MotorcadeCausesPieChart data={data} period={period} />
      <MotorcadeCauseDamageChart data={data} period={period} />
      <MotorcadeDamageTrendChart data={data} motorcadeRows={motorcadeRows} />
    </div>
  )
}
