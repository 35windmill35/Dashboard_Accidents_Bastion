import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatCurrency, formatNumber, formatPercent, calcDelta } from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import type { AnalyticsData, AnalyticsSide } from '../model/analyticsData'
import styles from './AnalyticsKpiGroups.module.css'

interface AnalyticsKpiGroupsProps {
  data: AnalyticsData
  period: Period
}

// Две группы KPI, визуально разделённые по цвету: слева — Автоколонна 1
// без дельты, справа — Автоколонна 2 с относительной разницей к первой
// (см. KpiCard.deltaLabel). Дельта показывает разницу между автоколоннами,
// а не с прошлым периодом — поэтому previousKpi здесь не участвует.
export function AnalyticsKpiGroups({ data, period }: AnalyticsKpiGroupsProps) {
  const periodLabel = formatPeriodLabel(period)

  const openSide = (side: AnalyticsSide, title: string) =>
    drilldownStore.open(`${title} — ${side.name}, ${periodLabel}`, side.scope.periodRows)

  return (
    <div className={styles.groups}>
      <KpiGroup
        side={data.a}
        color={COMPARISON_COLOR_A}
        compareTo={null}
        onOpen={(title) => openSide(data.a, title)}
      />
      <KpiGroup
        side={data.b}
        color={COMPARISON_COLOR_B}
        compareTo={data.a}
        onOpen={(title) => openSide(data.b, title)}
      />
    </div>
  )
}

interface KpiGroupProps {
  side: AnalyticsSide
  color: string
  compareTo: AnalyticsSide | null
  onOpen: (title: string) => void
}

function KpiGroup({ side, color, compareTo, onOpen }: KpiGroupProps) {
  const kpi = side.scope.kpi
  const deltaLabel = compareTo ? `к ${compareTo.name}` : undefined

  const delta = (value: number | null, otherValue: number | null) =>
    compareTo ? calcDelta(value, otherValue) : null

  return (
    <div className={styles.group} style={{ borderTopColor: color }}>
      <div className={styles.groupTitle} style={{ color }}>
        {side.name}
      </div>
      <div className={styles.groupRow}>
        <KpiCard
          label="Количество ДТП"
          value={formatNumber(kpi.count)}
          delta={compareTo ? delta(kpi.count, compareTo.scope.kpi.count) : undefined}
          deltaHigherIsBetter={false}
          deltaLabel={deltaLabel}
          tooltip="Масштаб аварийности автоколонны"
          onClick={() => onOpen('Все ДТП')}
        />
        <KpiCard
          label="Сумма ущерба"
          value={formatCurrency(kpi.sumDamage)}
          delta={compareTo ? delta(kpi.sumDamage, compareTo.scope.kpi.sumDamage) : undefined}
          deltaHigherIsBetter={false}
          deltaLabel={deltaLabel}
          tooltip="Финансовый эффект ДТП этой автоколонны"
          onClick={() => onOpen('Все ДТП')}
        />
        <KpiCard
          label="Доля возмещения"
          value={formatPercent(kpi.compensationShare)}
          delta={
            compareTo
              ? delta(kpi.compensationShare, compareTo.scope.kpi.compensationShare)
              : undefined
          }
          deltaLabel={deltaLabel}
          tooltip="Качество претензионной работы. Сравнимо между автоколоннами"
          onClick={() => onOpen('Все ДТП')}
        />
        <KpiCard
          label="Средний ущерб на 1 ДТП"
          value={formatCurrency(kpi.averageDamage)}
          delta={
            compareTo ? delta(kpi.averageDamage, compareTo.scope.kpi.averageDamage) : undefined
          }
          deltaHigherIsBetter={false}
          deltaLabel={deltaLabel}
          tooltip="Типичная тяжесть инцидента в этой автоколонне"
          onClick={() => onOpen('Все ДТП')}
        />
      </div>
    </div>
  )
}
