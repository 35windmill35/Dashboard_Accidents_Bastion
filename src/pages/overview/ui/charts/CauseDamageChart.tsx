import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { CHART_1, CHART_2 } from '@/shared/lib/chartColors'
import { formatCurrency } from '@/shared/lib/formatters'
import { barPayload } from '@/shared/lib/rechartsHelpers'
import type { CauseSlice, OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
  period: Period
}

// Сумма ущерба/возмещения по категориям причин — одна ось, обе величины в
// тенге.
export function CauseDamageChart({ data, period }: Props) {
  const periodLabel = formatPeriodLabel(period)
  const chartData = data.causeSlices.filter((s) => s.count > 0)

  const openCause = (category: string) => {
    const slice = chartData.find((s) => s.category === category)
    if (slice) drilldownStore.open(`${slice.label} — ${periodLabel}`, slice.rows)
  }

  return (
    <ChartCard title="Ущерб и возмещение по категориям причин">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--color-text-secondary)"
            fontSize={11}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
          <Bar
            dataKey="sumDamage"
            name="Ущерб"
            fill={CHART_1}
            radius={[4, 4, 0, 0]}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => openCause(barPayload<CauseSlice>(entry).category)}
          />
          <Bar
            dataKey="sumCompensated"
            name="Возмещение"
            fill={CHART_2}
            radius={[4, 4, 0, 0]}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => openCause(barPayload<CauseSlice>(entry).category)}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
