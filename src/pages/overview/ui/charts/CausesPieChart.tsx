import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { CauseDonut } from '@/widgets/cause-donut/CauseDonut'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { formatNumber, formatPercent } from '@/shared/lib/formatters'
import type { OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
  period: Period
}

// Структура причин ДТП за период, 5 категорий (см. shared/config/accidentCauses).
// Кольцо с итогом в центре и список категорий с долями — по эталону (см.
// widgets/cause-donut); клик по сектору или строке — таблица ДТП категории.
export function CausesPieChart({ data, period }: Props) {
  const slices = data.causeSlices.filter((s) => s.count > 0)
  const periodLabel = formatPeriodLabel(period)

  if (slices.length === 0) {
    return (
      <ChartCard title="Структура причин ДТП" subtitle="Распределение по виновнику">
        <div style={{ color: 'var(--color-text-faint)', fontSize: 13 }}>Нет данных за период</div>
      </ChartCard>
    )
  }

  const slicesTotal = slices.reduce((sum, s) => sum + s.count, 0)
  const table: ChartDataTable = {
    columns: ['Категория', 'ДТП', 'Доля'],
    rows: slices.map((s) => [
      s.label,
      formatNumber(s.count),
      formatPercent(slicesTotal > 0 ? s.count / slicesTotal : null, 1),
    ]),
  }

  return (
    <ChartCard table={table} title="Структура причин ДТП" subtitle="Распределение по виновнику">
      <CauseDonut
        slices={slices}
        onSelect={(slice) => drilldownStore.open(`${slice.label} — ${periodLabel}`, slice.rows)}
      />
    </ChartCard>
  )
}
