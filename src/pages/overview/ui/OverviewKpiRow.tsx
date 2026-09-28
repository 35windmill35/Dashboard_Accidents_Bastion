import { useNavigate } from 'react-router-dom'
import { KpiCard } from '@/widgets/kpi-card/KpiCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { comparisonLabel, formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import {
  rowsNotFullyCompensated,
  rowsWithCompensation,
  rowsWithDamage,
} from '@/entities/accident/lib/metrics'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { OverviewData, OverviewKpi } from '../model/overviewData'
import styles from './OverviewKpiRow.module.css'

interface OverviewKpiRowProps {
  data: OverviewData
  period: Period
}

// Пять KPI "Обзора". У каждой карточки два действия:
// - клик по карточке (drill-down) — связанный экран, период сохраняется
//   (он общий для всех экранов);
// - иконка в правом верхнем углу (drill-through) — таблица именно тех ДТП,
//   из которых сложилось число (все / с ущербом / с возмещением / непокрытые).
export function OverviewKpiRow({ data, period }: OverviewKpiRowProps) {
  const navigate = useNavigate()
  const { kpi, previousKpi, periodRows } = data
  const periodLabel = formatPeriodLabel(period)

  const open = (title: string, rows: AccidentRow[]) =>
    drilldownStore.open(`${title} — ${periodLabel}`, rows)

  const toMotorcade = {
    label: 'переход к статистике по автоколонне',
    onClick: () => navigate('/motorcade'),
  }
  const toAnalytics = { label: 'переход к аналитике', onClick: () => navigate('/analytics') }

  const deltaLabel = comparisonLabel(data.comparison)
  const prev = <K extends keyof OverviewKpi>(key: K) => (previousKpi ? previousKpi[key] : undefined)

  return (
    <div className={styles.row}>
      <KpiCard
        label="Всего ДТП"
        value={kpi.count}
        kind="count"
        compareValue={prev('count')}
        deltaHigherIsBetter={false}
        deltaLabel={deltaLabel}
        tooltip="Общее число ДТП за период"
        onOpenList={() => open('Все ДТП', periodRows)}
        navigate={toMotorcade}
      />
      <KpiCard
        label="Общая сумма ущерба"
        value={kpi.sumDamage}
        kind="currency"
        compareValue={prev('sumDamage')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip="Совокупный финансовый эффект ДТП — основа ремонтного бюджета"
        onOpenList={() => open('ДТП с ущербом', rowsWithDamage(periodRows))}
        navigate={toAnalytics}
      />
      <KpiCard
        label="Сумма возмещения"
        value={kpi.sumCompensated}
        kind="currency"
        compareValue={prev('sumCompensated')}
        deltaLabel={deltaLabel}
        tooltip="Сколько из ущерба фактически покрыто виновником/страховой"
        onOpenList={() => open('ДТП с возмещением', rowsWithCompensation(periodRows))}
        navigate={toAnalytics}
      />
      <KpiCard
        label="Доля возмещения"
        value={kpi.compensationShare}
        kind="percent"
        compareValue={prev('compensationShare')}
        deltaLabel={deltaLabel}
        tooltip="Возмещено ÷ ущерб. Низкое значение — сигнал юридическому отделу"
        onOpenList={() =>
          open('ДТП, возмещённые не полностью', rowsNotFullyCompensated(periodRows))
        }
        navigate={toAnalytics}
      />
      <KpiCard
        label="Средний ущерб на 1 ДТП"
        value={kpi.averageDamage}
        kind="currency"
        compareValue={prev('averageDamage')}
        deltaLabel={deltaLabel}
        deltaHigherIsBetter={false}
        tooltip="Тяжесть одного инцидента: ущерб ÷ число ДТП с ущербом"
        onOpenList={() => open('ДТП с ущербом', rowsWithDamage(periodRows))}
        navigate={toAnalytics}
      />
    </div>
  )
}
