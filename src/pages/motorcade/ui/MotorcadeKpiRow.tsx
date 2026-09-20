import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatCurrency, formatNumber, formatPercent, calcDelta } from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import type { MotorcadeData } from '../model/motorcadeData'
import styles from './MotorcadeKpiRow.module.css'

interface MotorcadeKpiRowProps {
  data: MotorcadeData
  period: Period
}

export function MotorcadeKpiRow({ data, period }: MotorcadeKpiRowProps) {
  const { kpi, previousKpi, periodRows } = data
  const periodLabel = formatPeriodLabel(period)

  const openAll = (title: string) => drilldownStore.open(`${title} — ${periodLabel}`, periodRows)

  return (
    <div className={styles.row}>
      <KpiCard
        label="Количество ДТП"
        value={formatNumber(kpi.count)}
        delta={previousKpi ? calcDelta(kpi.count, previousKpi.count) : null}
        deltaHigherIsBetter={false}
        tooltip="Масштаб аварийности автоколонны"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Сумма ущерба"
        value={formatCurrency(kpi.sumDamage)}
        delta={previousKpi ? calcDelta(kpi.sumDamage, previousKpi.sumDamage) : null}
        deltaHigherIsBetter={false}
        tooltip="Финансовый эффект ДТП этой автоколонны"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Сумма возмещения"
        value={formatCurrency(kpi.sumCompensated)}
        delta={previousKpi ? calcDelta(kpi.sumCompensated, previousKpi.sumCompensated) : null}
        tooltip="Насколько эффективно автоколонна взыскивает ущерб"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Доля возмещения"
        value={formatPercent(kpi.compensationShare)}
        delta={previousKpi ? calcDelta(kpi.compensationShare, previousKpi.compensationShare) : null}
        tooltip="Качество претензионной работы. Сравнимо между автоколоннами"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Средний ущерб на 1 ДТП"
        value={formatCurrency(kpi.averageDamage)}
        delta={previousKpi ? calcDelta(kpi.averageDamage, previousKpi.averageDamage) : null}
        deltaHigherIsBetter={false}
        tooltip="Типичная тяжесть инцидента в этой автоколонне"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Доля ДТП по вине водителя"
        value={formatPercent(kpi.driverFaultShare)}
        delta={previousKpi ? calcDelta(kpi.driverFaultShare, previousKpi.driverFaultShare) : null}
        deltaHigherIsBetter={false}
        tooltip="Ключевой показатель управляемого риска"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Доля ДТП по вине третьей стороны"
        value={formatPercent(kpi.thirdPartyFaultShare)}
        delta={
          previousKpi ? calcDelta(kpi.thirdPartyFaultShare, previousKpi.thirdPartyFaultShare) : null
        }
        deltaHigherIsBetter={false}
        tooltip="Аварии вне контроля водителей автоколонны"
        onClick={() => openAll('Все ДТП')}
      />
      <KpiCard
        label="Доля ДТП без повреждений"
        value={formatPercent(kpi.noDamageShare)}
        delta={previousKpi ? calcDelta(kpi.noDamageShare, previousKpi.noDamageShare) : null}
        deltaHigherIsBetter={false}
        tooltip="Доля инцидентов без материального ущерба"
        onClick={() => openAll('Все ДТП')}
      />
    </div>
  )
}
