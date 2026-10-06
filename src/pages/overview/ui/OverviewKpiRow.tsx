import { useNavigate } from 'react-router-dom'
import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { comparisonLabel, formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import {
  rowsNotFullyCompensated,
  rowsWithCompensation,
  rowsWithDamage,
} from '@/entities/accident/lib/metrics'
import { t } from '@/shared/i18n'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { OverviewData, OverviewKpi } from '../model/overviewData'
import styles from './OverviewKpiRow.module.css'

interface OverviewKpiRowProps {
  data: OverviewData
  period: Period
}

// Клик по карточке — переход на экран, иконка — таблица ДТП
export function OverviewKpiRow({ data, period }: OverviewKpiRowProps) {
  const navigate = useNavigate()
  const { kpi, previousKpi, periodRows } = data
  const periodLabel = formatPeriodLabel(period)

  const open = (title: string, rows: AccidentRow[]) =>
    drilldownStore.open(`${title} — ${periodLabel}`, rows)

  const toMotorcade = {
    label: t('roadAccidents.kpi.goToMotorcade'),
    onClick: () => navigate('/motorcade'),
  }
  const toAnalytics = {
    label: t('roadAccidents.kpi.goToAnalytics'),
    onClick: () => navigate('/analytics'),
  }

  const deltaLabel = comparisonLabel(data.comparison)
  const prev = <K extends keyof OverviewKpi>(key: K) => (previousKpi ? previousKpi[key] : undefined)

  return (
    <div className={styles.row}>
      <KpiCard
        label={t('roadAccidents.kpi.totalAccidents')}
        value={kpi.count}
        kind="count"
        compareValue={prev('count')}
        deltaHigherIsBetter={false}
        deltaLabel={deltaLabel}
        tooltip={t('roadAccidents.kpi.hint.totalAccidents')}
        onOpenList={() => open(t('roadAccidents.list.all'), periodRows)}
        navigate={toMotorcade}
      />
      <KpiCard
        label={t('roadAccidents.kpi.totalDamage')}
        value={kpi.sumDamage}
        kind="currency"
        compareValue={prev('sumDamage')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip={t('roadAccidents.kpi.hint.totalDamage')}
        onOpenList={() => open(t('roadAccidents.list.withDamage'), rowsWithDamage(periodRows))}
        navigate={toAnalytics}
      />
      <KpiCard
        label={t('roadAccidents.kpi.compensationSum')}
        value={kpi.sumCompensated}
        kind="currency"
        compareValue={prev('sumCompensated')}
        deltaLabel={deltaLabel}
        tooltip={t('roadAccidents.kpi.hint.compensationSum')}
        onOpenList={() =>
          open(t('roadAccidents.list.withCompensation'), rowsWithCompensation(periodRows))
        }
        navigate={toAnalytics}
      />
      <KpiCard
        label={t('roadAccidents.kpi.compensationShare')}
        value={kpi.compensationShare}
        kind="percent"
        compareValue={prev('compensationShare')}
        deltaLabel={deltaLabel}
        tooltip={t('roadAccidents.kpi.hint.compensationShare')}
        onOpenList={() =>
          open(t('roadAccidents.list.notFullyCompensated'), rowsNotFullyCompensated(periodRows))
        }
        navigate={toAnalytics}
      />
      <KpiCard
        label={t('roadAccidents.kpi.averageDamage')}
        value={kpi.averageDamage}
        kind="currency"
        compareValue={prev('averageDamage')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip={t('roadAccidents.kpi.hint.averageDamage')}
        onOpenList={() => open(t('roadAccidents.list.withDamage'), rowsWithDamage(periodRows))}
        navigate={toAnalytics}
      />
    </div>
  )
}
