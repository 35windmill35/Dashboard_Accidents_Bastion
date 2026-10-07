import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { comparisonLabel, formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import {
  rowsNotFullyCompensated,
  rowsWithCompensation,
  rowsWithDamage,
  rowsByCauser,
} from '@/entities/accident/lib/metrics'
import { t } from '@/shared/i18n'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { MotorcadeData, MotorcadeKpi } from '../model/motorcadeData'
import styles from './MotorcadeKpiRow.module.css'

interface MotorcadeKpiRowProps {
  data: MotorcadeData
  period: Period
}

export function MotorcadeKpiRow({ data, period }: MotorcadeKpiRowProps) {
  const { kpi, previousKpi, periodRows } = data
  const periodLabel = formatPeriodLabel(period)

  const open = (title: string, rows: AccidentRow[]) =>
    drilldownStore.open(`${title} — ${periodLabel}`, rows)
  const deltaLabel = comparisonLabel(data.comparison)
  const prev = <K extends keyof MotorcadeKpi>(key: K) =>
    previousKpi ? previousKpi[key] : undefined

  return (
    <div className={styles.row}>
      <KpiCard
        label={t('roadAccidents.kpi.accidentCount')}
        value={kpi.count}
        kind="count"
        compareValue={prev('count')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip={t('roadAccidents.kpi.hint.motorcadeAccidents')}
        onOpenList={() => open(t('roadAccidents.list.all'), periodRows)}
      />
      <KpiCard
        label={t('roadAccidents.kpi.damageSum')}
        value={kpi.sumDamage}
        kind="currency"
        compareValue={prev('sumDamage')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip={t('roadAccidents.kpi.hint.motorcadeDamage')}
        onOpenList={() => open(t('roadAccidents.list.withDamage'), rowsWithDamage(periodRows))}
      />
      <KpiCard
        label={t('roadAccidents.kpi.compensationSum')}
        value={kpi.sumCompensated}
        kind="currency"
        compareValue={prev('sumCompensated')}
        deltaLabel={deltaLabel}
        tooltip={t('roadAccidents.kpi.hint.motorcadeCompensation')}
        onOpenList={() =>
          open(t('roadAccidents.list.withCompensation'), rowsWithCompensation(periodRows))
        }
      />
      <KpiCard
        label={t('roadAccidents.kpi.compensationShare')}
        value={kpi.compensationShare}
        kind="percent"
        compareValue={prev('compensationShare')}
        deltaLabel={deltaLabel}
        tooltip={t('roadAccidents.kpi.hint.motorcadeCompensationShare')}
        onOpenList={() =>
          open(t('roadAccidents.list.notFullyCompensated'), rowsNotFullyCompensated(periodRows))
        }
      />
      <KpiCard
        label={t('roadAccidents.kpi.averageDamage')}
        value={kpi.averageDamage}
        kind="currency"
        compareValue={prev('averageDamage')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip={t('roadAccidents.kpi.hint.motorcadeAverageDamage')}
        onOpenList={() => open(t('roadAccidents.list.withDamage'), rowsWithDamage(periodRows))}
      />
      <KpiCard
        label={t('roadAccidents.kpi.driverFaultShare')}
        value={kpi.driverFaultShare}
        kind="percent"
        compareValue={prev('driverFaultShare')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip={t('roadAccidents.kpi.hint.driverFaultShare')}
        onOpenList={() =>
          open(t('roadAccidents.list.driverFault'), rowsByCauser(periodRows, 'ownDriver'))
        }
      />
      <KpiCard
        label={t('roadAccidents.kpi.thirdPartyFaultShare')}
        value={kpi.thirdPartyFaultShare}
        kind="percent"
        compareValue={prev('thirdPartyFaultShare')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip={t('roadAccidents.kpi.hint.thirdPartyFaultShare')}
        onOpenList={() =>
          open(t('roadAccidents.list.thirdPartyFault'), rowsByCauser(periodRows, 'otherParty'))
        }
      />
    </div>
  )
}
