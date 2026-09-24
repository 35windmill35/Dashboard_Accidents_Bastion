import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { calcDelta } from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { rowsNotFullyCompensated, rowsWithDamage } from '@/entities/accident/lib/metrics'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { AnalyticsData, AnalyticsSide } from '../model/analyticsData'
import styles from './AnalyticsKpiGroups.module.css'

interface AnalyticsKpiGroupsProps {
  data: AnalyticsData
  period: Period
}

// Две группы KPI (по эталону — заголовок группы с цветной точкой серии,
// тем же цветом, что автоколонна на графиках): слева — Автоколонна 1
// без дельты, справа — Автоколонна 2 с относительной разницей к первой
// (см. KpiCard.deltaLabel). Дельта показывает разницу между автоколоннами,
// а не с прошлым периодом — поэтому previousKpi здесь не участвует.
export function AnalyticsKpiGroups({ data, period }: AnalyticsKpiGroupsProps) {
  const periodLabel = formatPeriodLabel(period)

  const openSide = (side: AnalyticsSide, title: string, rows: AccidentRow[]) =>
    drilldownStore.open(`${title} — ${side.name}, ${periodLabel}`, rows)

  return (
    <div className={styles.groups}>
      <KpiGroup
        side={data.a}
        color={COMPARISON_COLOR_A}
        compareTo={null}
        onOpen={(title, rows) => openSide(data.a, title, rows)}
      />
      <KpiGroup
        side={data.b}
        color={COMPARISON_COLOR_B}
        compareTo={data.a}
        onOpen={(title, rows) => openSide(data.b, title, rows)}
      />
    </div>
  )
}

interface KpiGroupProps {
  side: AnalyticsSide
  color: string
  compareTo: AnalyticsSide | null
  onOpen: (title: string, rows: AccidentRow[]) => void
}

function KpiGroup({ side, color, compareTo, onOpen }: KpiGroupProps) {
  const kpi = side.scope.kpi
  const rows = side.scope.periodRows
  const deltaLabel = compareTo ? `к ${compareTo.name}` : undefined

  const delta = (value: number | null, otherValue: number | null) =>
    compareTo ? calcDelta(value, otherValue) : null

  return (
    <section className={styles.group} aria-label={side.name}>
      <div className={styles.groupHeader}>
        <span
          className={styles.groupDot}
          style={{ background: color, boxShadow: `0 0 0 4px ${color}26` }}
          aria-hidden="true"
        />
        <span className={styles.groupTitle}>{side.name}</span>
        <span className={styles.groupNote}>
          {compareTo ? `сравнение с ${compareTo.name}` : 'базовая для сравнения'}
        </span>
      </div>
      <div className={styles.groupRow}>
        <KpiCard
          compact
          label="Количество ДТП"
          value={kpi.count}
          kind="count"
          delta={compareTo ? delta(kpi.count, compareTo.scope.kpi.count) : undefined}
          deltaHigherIsBetter={false}
          deltaLabel={deltaLabel}
          tooltip="Масштаб аварийности автоколонны"
          onOpenList={() => onOpen('Все ДТП', rows)}
        />
        <KpiCard
          compact
          label="Сумма ущерба"
          value={kpi.sumDamage}
          kind="currency"
          delta={compareTo ? delta(kpi.sumDamage, compareTo.scope.kpi.sumDamage) : undefined}
          deltaHigherIsBetter={false}
          deltaLabel={deltaLabel}
          tooltip="Финансовый эффект ДТП этой автоколонны"
          onOpenList={() => onOpen('ДТП с ущербом', rowsWithDamage(rows))}
        />
        <KpiCard
          compact
          label="Доля возмещения"
          value={kpi.compensationShare}
          kind="percent"
          delta={
            compareTo
              ? delta(kpi.compensationShare, compareTo.scope.kpi.compensationShare)
              : undefined
          }
          deltaLabel={deltaLabel}
          tooltip="Качество претензионной работы. Сравнимо между автоколоннами"
          onOpenList={() => onOpen('ДТП, возмещённые не полностью', rowsNotFullyCompensated(rows))}
        />
        <KpiCard
          compact
          label="Средний ущерб на 1 ДТП"
          value={kpi.averageDamage}
          kind="currency"
          delta={
            compareTo ? delta(kpi.averageDamage, compareTo.scope.kpi.averageDamage) : undefined
          }
          deltaHigherIsBetter={false}
          deltaLabel={deltaLabel}
          tooltip="Типичная тяжесть инцидента в этой автоколонне"
          onOpenList={() => onOpen('ДТП с ущербом', rowsWithDamage(rows))}
        />
      </div>
    </section>
  )
}
