import type { RefObject } from 'react'
import { AccidentsTrendChart } from './charts/AccidentsTrendChart'
import { CausesPieChart } from './charts/CausesPieChart'
import { MotorcadeCountChart } from './charts/MotorcadeCountChart'
import { MotorcadeDamageChart } from './charts/MotorcadeDamageChart'
import { CauseDamageChart } from './charts/CauseDamageChart'
import { DamageTrendChart } from './charts/DamageTrendChart'
import type { OverviewData } from '../model/overviewData'
import type { Period } from '@/entities/accident/lib/period'
import styles from './OverviewCharts.module.css'

export interface OverviewChartPdfRefs {
  trend: RefObject<HTMLDivElement | null>
  causes: RefObject<HTMLDivElement | null>
  motorcadeCount: RefObject<HTMLDivElement | null>
  motorcadeDamage: RefObject<HTMLDivElement | null>
  causeDamage: RefObject<HTMLDivElement | null>
  damageTrend: RefObject<HTMLDivElement | null>
}

interface OverviewChartsProps {
  data: OverviewData
  period: Period
  // Ссылки на обёртки графиков — по ним PDF-отчёт снимает каждую карточку
  // графика отдельным изображением (см. features/pdf-report). Обычные div
  // без своих стилей, чтобы не влиять на сетку .grid.
  pdfRefs?: OverviewChartPdfRefs
}

export function OverviewCharts({ data, period, pdfRefs }: OverviewChartsProps) {
  return (
    <div className={styles.grid}>
      <div ref={pdfRefs?.trend}>
        <AccidentsTrendChart data={data} />
      </div>
      <div ref={pdfRefs?.causes}>
        <CausesPieChart data={data} period={period} />
      </div>
      <div ref={pdfRefs?.motorcadeCount}>
        <MotorcadeCountChart data={data} period={period} />
      </div>
      <div ref={pdfRefs?.motorcadeDamage}>
        <MotorcadeDamageChart data={data} period={period} />
      </div>
      <div ref={pdfRefs?.causeDamage}>
        <CauseDamageChart data={data} period={period} />
      </div>
      <div ref={pdfRefs?.damageTrend}>
        <DamageTrendChart data={data} />
      </div>
    </div>
  )
}
