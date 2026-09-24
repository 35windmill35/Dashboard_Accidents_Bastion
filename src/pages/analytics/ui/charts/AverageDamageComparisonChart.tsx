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
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency, withCurrencyUnit } from '@/shared/lib/formatters'
import { CATEGORY_AXIS_HEIGHT, CHART_MARGIN, barPayload } from '@/shared/lib/rechartsHelpers'
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
  const gradientId = useGradientId()
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

  const table: ChartDataTable = {
    columns: ['Автоколонна', 'Средний ущерб на 1 ДТП'],
    rows: [
      [data.a.name, formatCurrency(data.a.scope.kpi.averageDamage)],
      [data.b.name, formatCurrency(data.b.scope.kpi.averageDamage)],
    ],
  }

  return (
    <ChartCard
      table={table}
      title="Средний ущерб на 1 ДТП"
      subtitle={withCurrencyUnit('На 1 ДТП с ущербом')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <defs>
            <BarGradient id={`${gradientId}-0`} color={COMPARISON_COLOR_A} />
            <BarGradient id={`${gradientId}-1`} color={COMPARISON_COLOR_B} />
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis {...X_AXIS_PROPS} dataKey="name" height={CATEGORY_AXIS_HEIGHT} />
          <YAxis {...Y_AXIS_PROPS} tickFormatter={formatCompactCurrency} />
          <Tooltip cursor={BAR_CURSOR} content={<ChartTooltip valueFormatter={formatCurrency} />} />
          <Bar
            maxBarSize={BAR_SIZE_SINGLE}
            {...ANIMATION}
            dataKey="averageDamage"
            radius={BAR_RADIUS}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => handleClick(barPayload<Point>(entry).side)}
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
