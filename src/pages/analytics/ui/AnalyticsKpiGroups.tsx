import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { rowsNotFullyCompensated, rowsWithDamage } from '@/entities/accident/lib/metrics'
import { t } from '@/shared/i18n'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { AnalyticsData, AnalyticsSide } from '../model/analyticsData'
import styles from './AnalyticsKpiGroups.module.css'

interface AnalyticsKpiGroupsProps {
  data: AnalyticsData
  period: Period
}

// У второй группы дельта — разница к первой автоколонне
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
  const deltaLabel = compareTo
    ? t('roadAccidents.analytics.vsMotorcade', { name: compareTo.name })
    : undefined

  const other = compareTo?.scope.kpi

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
          {compareTo
            ? t('roadAccidents.analytics.comparedWith', { name: compareTo.name })
            : t('roadAccidents.analytics.baseSide')}
        </span>
      </div>
      <div className={styles.groupRow}>
        <KpiCard
          compact
          label={t('roadAccidents.kpi.accidentCount')}
          value={kpi.count}
          kind="count"
          compareValue={other?.count}
          deltaHigherIsBetter={false}
          deltaLabel={deltaLabel}
          tooltip={t('roadAccidents.kpi.hint.motorcadeAccidents')}
          onOpenList={() => onOpen(t('roadAccidents.list.all'), rows)}
        />
        <KpiCard
          compact
          label={t('roadAccidents.kpi.damageSum')}
          value={kpi.sumDamage}
          kind="currency"
          compareValue={other?.sumDamage}
          deltaHigherIsBetter={false}
          deltaLabel={deltaLabel}
          tooltip={t('roadAccidents.kpi.hint.motorcadeDamage')}
          onOpenList={() => onOpen(t('roadAccidents.list.withDamage'), rowsWithDamage(rows))}
        />
        <KpiCard
          compact
          label={t('roadAccidents.kpi.compensationShare')}
          value={kpi.compensationShare}
          kind="percent"
          compareValue={other?.compensationShare}
          deltaLabel={deltaLabel}
          tooltip={t('roadAccidents.kpi.hint.motorcadeCompensationShare')}
          onOpenList={() =>
            onOpen(t('roadAccidents.list.notFullyCompensated'), rowsNotFullyCompensated(rows))
          }
        />
        <KpiCard
          compact
          label={t('roadAccidents.kpi.averageDamage')}
          value={kpi.averageDamage}
          kind="currency"
          compareValue={other?.averageDamage}
          deltaHigherIsBetter={false}
          deltaLabel={deltaLabel}
          tooltip={t('roadAccidents.kpi.hint.motorcadeAverageDamage')}
          onOpenList={() => onOpen(t('roadAccidents.list.withDamage'), rowsWithDamage(rows))}
        />
      </div>
    </section>
  )
}
