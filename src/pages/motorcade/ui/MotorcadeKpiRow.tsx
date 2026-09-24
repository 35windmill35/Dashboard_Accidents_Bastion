import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatCurrency, formatNumber, formatPercent, calcDelta } from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import {
  groupByCauseCategory,
  rowsNotFullyCompensated,
  rowsWithCompensation,
  rowsWithDamage,
} from '@/entities/accident/lib/metrics'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { MotorcadeData } from '../model/motorcadeData'
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
  const byCause = groupByCauseCategory(periodRows)

  return (
    <div className={styles.row}>
      <KpiCard
        label="Количество ДТП"
        value={formatNumber(kpi.count)}
        delta={previousKpi ? calcDelta(kpi.count, previousKpi.count) : null}
        deltaHigherIsBetter={false}
        tooltip="Масштаб аварийности автоколонны"
        onOpenList={() => open('Все ДТП', periodRows)}
      />
      <KpiCard
        label="Сумма ущерба"
        value={formatCurrency(kpi.sumDamage)}
        delta={previousKpi ? calcDelta(kpi.sumDamage, previousKpi.sumDamage) : null}
        deltaHigherIsBetter={false}
        tooltip="Финансовый эффект ДТП этой автоколонны"
        onOpenList={() => open('ДТП с ущербом', rowsWithDamage(periodRows))}
      />
      <KpiCard
        label="Сумма возмещения"
        value={formatCurrency(kpi.sumCompensated)}
        delta={previousKpi ? calcDelta(kpi.sumCompensated, previousKpi.sumCompensated) : null}
        tooltip="Насколько эффективно автоколонна взыскивает ущерб"
        onOpenList={() => open('ДТП с возмещением', rowsWithCompensation(periodRows))}
      />
      <KpiCard
        label="Доля возмещения"
        value={formatPercent(kpi.compensationShare)}
        delta={previousKpi ? calcDelta(kpi.compensationShare, previousKpi.compensationShare) : null}
        tooltip="Качество претензионной работы. Сравнимо между автоколоннами"
        onOpenList={() =>
          open('ДТП, возмещённые не полностью', rowsNotFullyCompensated(periodRows))
        }
      />
      <KpiCard
        label="Средний ущерб на 1 ДТП"
        value={formatCurrency(kpi.averageDamage)}
        delta={previousKpi ? calcDelta(kpi.averageDamage, previousKpi.averageDamage) : null}
        deltaHigherIsBetter={false}
        tooltip="Типичная тяжесть инцидента в этой автоколонне"
        onOpenList={() => open('ДТП с ущербом', rowsWithDamage(periodRows))}
      />
      <KpiCard
        label="Доля ДТП по вине водителя"
        value={formatPercent(kpi.driverFaultShare)}
        delta={previousKpi ? calcDelta(kpi.driverFaultShare, previousKpi.driverFaultShare) : null}
        deltaHigherIsBetter={false}
        tooltip="Ключевой показатель управляемого риска"
        onOpenList={() => open('ДТП по вине водителя', byCause.driverFault)}
      />
      <KpiCard
        label="Доля ДТП по вине третьей стороны"
        value={formatPercent(kpi.thirdPartyFaultShare)}
        delta={
          previousKpi ? calcDelta(kpi.thirdPartyFaultShare, previousKpi.thirdPartyFaultShare) : null
        }
        deltaHigherIsBetter={false}
        tooltip="Аварии вне контроля водителей автоколонны"
        onOpenList={() => open('ДТП по вине третьей стороны', byCause.thirdPartyFault)}
      />
      <KpiCard
        label="Доля ДТП без повреждений"
        value={formatPercent(kpi.noDamageShare)}
        delta={previousKpi ? calcDelta(kpi.noDamageShare, previousKpi.noDamageShare) : null}
        deltaHigherIsBetter={false}
        tooltip="Доля инцидентов без материального ущерба"
        onOpenList={() => open('ДТП без повреждений', byCause.noDamage)}
      />
    </div>
  )
}
