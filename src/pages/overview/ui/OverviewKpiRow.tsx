import { useNavigate } from 'react-router-dom'
import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDelta,
  calcDelta,
} from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import {
  rowsNotFullyCompensated,
  rowsWithCompensation,
  rowsWithDamage,
} from '@/entities/accident/lib/metrics'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { OverviewData } from '../model/overviewData'
import styles from './OverviewKpiRow.module.css'

interface OverviewKpiRowProps {
  data: OverviewData
  period: Period
}

// Пять KPI "Обзора" (ТЗ §4.3). У каждой карточки два перехода:
// - клик по карточке (drill-through) — список именно тех ДТП, из которых
//   сложилось число (все / с ущербом / с возмещением / непокрытые);
// - ссылка под значением (drill-down) — связанный экран, период
//   сохраняется (он общий для всех экранов).
export function OverviewKpiRow({ data, period }: OverviewKpiRowProps) {
  const navigate = useNavigate()
  const { kpi, previousKpi, periodRows } = data
  const periodLabel = formatPeriodLabel(period)

  const open = (title: string, rows: AccidentRow[]) =>
    drilldownStore.open(`${title} — ${periodLabel}`, rows)

  const toMotorcade = { label: 'Статистика по автоколонне', onClick: () => navigate('/motorcade') }
  const toAnalytics = { label: 'Аналитика', onClick: () => navigate('/analytics') }

  const countDelta = previousKpi ? calcDelta(kpi.count, previousKpi.count) : null

  return (
    <div className={styles.row}>
      <KpiCard
        label="Всего ДТП"
        value={formatNumber(kpi.count)}
        delta={countDelta}
        deltaHigherIsBetter={false}
        tooltip={`Общее число ДТП за период. Δ к прошлому периоду: ${formatDelta(countDelta)}`}
        onClick={() => open('Все ДТП', periodRows)}
        drillDown={toMotorcade}
      />
      <KpiCard
        label="Общая сумма ущерба"
        value={formatCurrency(kpi.sumDamage)}
        delta={previousKpi ? calcDelta(kpi.sumDamage, previousKpi.sumDamage) : null}
        deltaHigherIsBetter={false}
        tooltip="Совокупный финансовый эффект ДТП — основа ремонтного бюджета"
        onClick={() => open('ДТП с ущербом', rowsWithDamage(periodRows))}
        drillDown={toAnalytics}
      />
      <KpiCard
        label="Сумма возмещения"
        value={formatCurrency(kpi.sumCompensated)}
        delta={previousKpi ? calcDelta(kpi.sumCompensated, previousKpi.sumCompensated) : null}
        tooltip="Сколько из ущерба фактически покрыто виновником/страховой"
        onClick={() => open('ДТП с возмещением', rowsWithCompensation(periodRows))}
        drillDown={toAnalytics}
      />
      <KpiCard
        label="Доля возмещения"
        value={formatPercent(kpi.compensationShare)}
        delta={previousKpi ? calcDelta(kpi.compensationShare, previousKpi.compensationShare) : null}
        tooltip="Возмещено ÷ ущерб. Низкое значение — сигнал юридическому отделу"
        onClick={() => open('ДТП, возмещённые не полностью', rowsNotFullyCompensated(periodRows))}
        drillDown={toAnalytics}
      />
      <KpiCard
        label="Средний ущерб на 1 ДТП"
        value={formatCurrency(kpi.averageDamage)}
        delta={previousKpi ? calcDelta(kpi.averageDamage, previousKpi.averageDamage) : null}
        deltaHigherIsBetter={false}
        tooltip="Тяжесть одного инцидента: ущерб ÷ число ДТП с ущербом"
        onClick={() => open('ДТП с ущербом', rowsWithDamage(periodRows))}
        drillDown={toAnalytics}
      />
    </div>
  )
}
