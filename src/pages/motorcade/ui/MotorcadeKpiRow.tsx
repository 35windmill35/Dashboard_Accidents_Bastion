import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { NO_DAMAGE_CATEGORY_ENABLED } from '@/shared/config/accidentCauses'
import { comparisonLabel, formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import {
  groupByCauseCategory,
  rowsNotFullyCompensated,
  rowsWithCompensation,
  rowsWithDamage,
} from '@/entities/accident/lib/metrics'
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
  const byCause = groupByCauseCategory(periodRows)
  const deltaLabel = comparisonLabel(data.comparison)
  const prev = <K extends keyof MotorcadeKpi>(key: K) =>
    previousKpi ? previousKpi[key] : undefined

  return (
    <div className={styles.row}>
      <KpiCard
        label="Количество ДТП"
        value={kpi.count}
        kind="count"
        compareValue={prev('count')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip="Масштаб аварийности автоколонны"
        onOpenList={() => open('Все ДТП', periodRows)}
      />
      <KpiCard
        label="Сумма ущерба"
        value={kpi.sumDamage}
        kind="currency"
        compareValue={prev('sumDamage')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip="Финансовый эффект ДТП этой автоколонны"
        onOpenList={() => open('ДТП с ущербом', rowsWithDamage(periodRows))}
      />
      <KpiCard
        label="Сумма возмещения"
        value={kpi.sumCompensated}
        kind="currency"
        compareValue={prev('sumCompensated')}
        deltaLabel={deltaLabel}
        tooltip="Насколько эффективно автоколонна взыскивает ущерб"
        onOpenList={() => open('ДТП с возмещением', rowsWithCompensation(periodRows))}
      />
      <KpiCard
        label="Доля возмещения"
        value={kpi.compensationShare}
        kind="percent"
        compareValue={prev('compensationShare')}
        deltaLabel={deltaLabel}
        tooltip="Качество претензионной работы. Сравнимо между автоколоннами"
        onOpenList={() =>
          open('ДТП, возмещённые не полностью', rowsNotFullyCompensated(periodRows))
        }
      />
      <KpiCard
        label="Средний ущерб на 1 ДТП"
        value={kpi.averageDamage}
        kind="currency"
        compareValue={prev('averageDamage')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip="Типичная тяжесть инцидента в этой автоколонне"
        onOpenList={() => open('ДТП с ущербом', rowsWithDamage(periodRows))}
      />
      <KpiCard
        label="Доля ДТП по вине водителя"
        value={kpi.driverFaultShare}
        kind="percent"
        compareValue={prev('driverFaultShare')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip="Ключевой показатель управляемого риска"
        onOpenList={() => open('ДТП по вине водителя', byCause.driverFault)}
      />
      <KpiCard
        label="Доля ДТП по вине третьей стороны"
        value={kpi.thirdPartyFaultShare}
        kind="percent"
        compareValue={prev('thirdPartyFaultShare')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip="Аварии вне контроля водителей автоколонны"
        onOpenList={() => open('ДТП по вине третьей стороны', byCause.thirdPartyFault)}
      />
      {NO_DAMAGE_CATEGORY_ENABLED && (
        <KpiCard
          label="Доля ДТП без повреждений"
          value={kpi.noDamageShare}
          kind="percent"
          compareValue={prev('noDamageShare')}
          deltaLabel={deltaLabel}
          deltaHigherIsBetter={false}
          tooltip="Доля инцидентов без материального ущерба"
          onOpenList={() => open('ДТП без повреждений', byCause.noDamage)}
        />
      )}
    </div>
  )
}
