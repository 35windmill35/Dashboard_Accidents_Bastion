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
import {
  GRID_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
  ANIMATION,
  useGradientId,
  BAR_CURSOR,
  BAR_RADIUS,
  BAR_SIZE_SINGLE,
} from '@/shared/ui/chart/chartStyle'
import { BarGradient } from '@/shared/ui/chart/ChartGradients'
import { ChartTooltip } from '@/shared/ui/chart/ChartTooltip'
import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { formatNumber } from '@/shared/lib/formatters'
import { CATEGORY_AXIS_HEIGHT, CHART_MARGIN } from '@/shared/lib/rechartsHelpers'
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
  const gradientId = useGradientId()
  const chartData: Point[] = [
    { side: 'a', name: data.a.name, count: data.a.repeatDriversCount },
    { side: 'b', name: data.b.name, count: data.b.repeatDriversCount },
  ]

  const table: ChartDataTable = {
    columns: ['Автоколонна', 'Водителей с ≥3 ДТП'],
    rows: chartData.map((p) => [p.name, formatNumber(p.count)]),
  }

  return (
    <ChartCard
      table={table}
      title="Водителей с 3 и более ДТП"
      subtitle={'Число водителей за период'}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <defs>
            <BarGradient id={`${gradientId}-0`} color={COMPARISON_COLOR_A} />
            <BarGradient id={`${gradientId}-1`} color={COMPARISON_COLOR_B} />
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis {...X_AXIS_PROPS} dataKey="name" height={CATEGORY_AXIS_HEIGHT} />
          <YAxis {...Y_AXIS_PROPS} allowDecimals={false} />
          <Tooltip cursor={BAR_CURSOR} content={<ChartTooltip />} />
          <Bar
            maxBarSize={BAR_SIZE_SINGLE}
            {...ANIMATION}
            dataKey="count"
            name="Водителей"
            radius={BAR_RADIUS}
          >
            {chartData.map((point) => (
              <Cell
                key={point.side}
                fill={point.side === 'a' ? `url(#${gradientId}-0)` : `url(#${gradientId}-1)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
