import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency } from '@/shared/lib/formatters'
import { CATEGORY_AXIS_HEIGHT, CHART_MARGIN, Y_AXIS_WIDTH, barPayload } from '@/shared/lib/rechartsHelpers'
import type { AnalyticsData } from '../../model/analyticsData'

interface Props {
  data: AnalyticsData
  period: Period
}

interface Point {
  side: 'a' | 'b'
  name: string
  averageDamage: number
}

// Средний ущерб на 1 ДТП — по одному столбцу на автоколонну, разница видна
// сразу по высоте (в отличие от KPI-карточек, где нужно сравнивать числа).
export function AverageDamageComparisonChart({ data, period }: Props) {
  const periodLabel = formatPeriodLabel(period)

  const chartData: Point[] = [
    { side: 'a', name: data.a.name, averageDamage: data.a.scope.kpi.averageDamage ?? 0 },
    { side: 'b', name: data.b.name, averageDamage: data.b.scope.kpi.averageDamage ?? 0 },
  ]

  const handleClick = (side: 'a' | 'b') => {
    const target = side === 'a' ? data.a : data.b
    drilldownStore.open(
      `Средний ущерб — ${target.name}, ${periodLabel}`,
      target.scope.periodRows.filter((row) => (row.ACCIDENT_DAMAGE ?? 0) > 0)
    )
  }

  return (
    <ChartCard title="Средний ущерб на 1 ДТП">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="var(--color-text-secondary)"
            fontSize={12}
            height={CATEGORY_AXIS_HEIGHT}
          />
          <YAxis
            stroke="var(--color-text-secondary)"
            fontSize={12}
            tickFormatter={formatCompactCurrency}
            width={Y_AXIS_WIDTH}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
            }}
          />
          <Bar
            dataKey="averageDamage"
            radius={[4, 4, 0, 0]}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => handleClick(barPayload<Point>(entry).side)}
          >
            {chartData.map((point) => (
              <Cell key={point.side} fill={point.side === 'a' ? COMPARISON_COLOR_A : COMPARISON_COLOR_B} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
