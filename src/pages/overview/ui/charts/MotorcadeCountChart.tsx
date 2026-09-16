import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { getMotorcadeKey } from '@/entities/accident/lib/motorcade'
import { CHART_1 } from '@/shared/lib/chartColors'
import { formatNumber } from '@/shared/lib/formatters'
import { barPayload, CATEGORY_X_AXIS_PROPS } from '@/shared/lib/rechartsHelpers'
import type { MotorcadeAggregate } from '@/entities/accident/lib/metrics'
import type { OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
  period: Period
}

// Кол-во ДТП по автоколоннам за период, включая псевдо-автоколонну "Не
// указана" — это единственный экран, где она участвует в графиках.
export function MotorcadeCountChart({ data, period }: Props) {
  const periodLabel = formatPeriodLabel(period)

  return (
    <ChartCard title="ДТП по автоколоннам" legend={[{ label: 'ДТП', color: CHART_1 }]}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.motorcadeAgg} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-text-secondary)" {...CATEGORY_X_AXIS_PROPS} />
          <YAxis stroke="var(--color-text-secondary)" fontSize={12} allowDecimals={false} />
          <Tooltip
            formatter={(value) => formatNumber(Number(value))}
            contentStyle={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
            }}
          />
          <Bar
            dataKey="count"
            name="ДТП"
            radius={[4, 4, 0, 0]}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => {
              const agg = barPayload<MotorcadeAggregate>(entry)
              const rows = data.periodRows.filter((row) => getMotorcadeKey(row) === agg.key)
              drilldownStore.open(`${agg.name} — ${periodLabel}`, rows)
            }}
          >
            {data.motorcadeAgg.map((agg) => (
              <Cell key={agg.key} fill={CHART_1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
