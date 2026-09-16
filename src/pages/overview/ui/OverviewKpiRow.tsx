import type { RefObject } from 'react'
import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatCurrency, formatNumber, formatPercent, calcDelta } from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import type { OverviewData } from '../model/overviewData'
import styles from './OverviewKpiRow.module.css'

interface OverviewKpiRowProps {
  data: OverviewData
  period: Period
  // Ссылка на корневой div — по ней PDF-отчёт снимает всю строку KPI одним
  // изображением (см. features/pdf-report).
  pdfRef?: RefObject<HTMLDivElement | null>
}

export function OverviewKpiRow({ data, period, pdfRef }: OverviewKpiRowProps) {
  const { kpi, previousKpi, periodRows } = data
  const periodLabel = formatPeriodLabel(period)

  const openAll = (title: string) => drilldownStore.open(`${title} — ${periodLabel}`, periodRows)

  return (
    <div className={styles.row} ref={pdfRef}>
      <KpiCard
        label="Всего ДТП"
        value={formatNumber(kpi.count)}
        delta={previousKpi ? calcDelta(kpi.count, previousKpi.count) : null}
        deltaHigherIsBetter={false}
        tooltip="Количество ДТП за выбранный период по всем автоколоннам"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Сумма ущерба"
        value={formatCurrency(kpi.sumDamage)}
        delta={previousKpi ? calcDelta(kpi.sumDamage, previousKpi.sumDamage) : null}
        deltaHigherIsBetter={false}
        tooltip="Суммарный ущерб по всем ДТП за период"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Сумма возмещения"
        value={formatCurrency(kpi.sumCompensated)}
        delta={previousKpi ? calcDelta(kpi.sumCompensated, previousKpi.sumCompensated) : null}
        tooltip="Суммарное возмещённое страховой ущерб за период"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Доля возмещения"
        value={formatPercent(kpi.compensationShare)}
        delta={previousKpi ? calcDelta(kpi.compensationShare, previousKpi.compensationShare) : null}
        tooltip="Возмещение / ущерб за период"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Средний ущерб на ДТП"
        value={formatCurrency(kpi.averageDamage)}
        delta={previousKpi ? calcDelta(kpi.averageDamage, previousKpi.averageDamage) : null}
        deltaHigherIsBetter={false}
        tooltip="Средний ущерб по ДТП с ущербом больше нуля"
        onClick={() => openAll('Все ДТП')}
      />
    </div>
  )
}
