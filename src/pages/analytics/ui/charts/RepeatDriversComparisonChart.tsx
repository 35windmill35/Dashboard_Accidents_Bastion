import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { formatNumber } from '@/shared/lib/formatters'
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

  return (
    <ChartCard title="Водителей с 3 и более ДТП">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
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
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((point) => (
              <Cell key={point.side} fill={point.side === 'a' ? COMPARISON_COLOR_A : COMPARISON_COLOR_B} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
