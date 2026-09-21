import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { formatNumber } from '@/shared/lib/formatters'
import { CATEGORY_AXIS_HEIGHT, CHART_MARGIN, Y_AXIS_WIDTH } from '@/shared/lib/rechartsHelpers'
import type { AnalyticsData } from '../../model/analyticsData'

interface Props {
  data: AnalyticsData
}

interface Point {
  side: 'a' | 'b'
  name: string
  count: number
}

// Водители с 3 и более ДТП за период — по автоколонне. Без drill-through:
// ТЗ не задаёт для этого клика конкретный список (водители считаются в
// пределах базы, а не по конкретным записям одного ДТП).
export function RepeatDriversComparisonChart({ data }: Props) {
  const chartData: Point[] = [
    { side: 'a', name: data.a.name, count: data.a.repeatDriversCount },
    { side: 'b', name: data.b.name, count: data.b.repeatDriversCount },
  ]

  const table: ChartDataTable = {
    columns: ['Автоколонна', 'Водителей с ≥3 ДТП'],
    rows: chartData.map((p) => [p.name, formatNumber(p.count)]),
  }

  return (
    <ChartCard table={table} title="Водителей с 3 и более ДТП">
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
            allowDecimals={false}
            width={Y_AXIS_WIDTH}
          />
          <Tooltip
            formatter={(value) => formatNumber(Number(value))}
            contentStyle={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((point) => (
              <Cell
                key={point.side}
                fill={point.side === 'a' ? COMPARISON_COLOR_A : COMPARISON_COLOR_B}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
