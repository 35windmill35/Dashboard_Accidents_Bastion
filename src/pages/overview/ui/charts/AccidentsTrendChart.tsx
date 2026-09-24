import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { formatNumber } from '@/shared/lib/formatters'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import {
  GRID_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
  ANIMATION,
  useGradientId,
  LINE_CURSOR,
  activeLineDot,
} from '@/shared/ui/chart/chartStyle'
import { AreaGradient } from '@/shared/ui/chart/ChartGradients'
import { ChartTooltip } from '@/shared/ui/chart/ChartTooltip'
import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { formatMonthShortLabel, formatMonthLabel } from '@/entities/accident/lib/period'
import { COLOR_COUNT } from '@/shared/lib/chartColors'
import { CHART_MARGIN, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
}

interface TrendPoint {
  ym: number
  label: string
  count: number
}

interface DotProps {
  cx?: number
  cy?: number
  payload?: TrendPoint
  onPointClick: (ym: number) => void
}

// Точка графика кликабельна — открывает детализацию за этот месяц.
function TrendDot({ cx, cy, payload, onPointClick }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill={COLOR_COUNT}
      stroke="var(--color-surface)"
      strokeWidth={1.5}
      style={{ cursor: 'pointer' }}
      onClick={() => onPointClick(payload.ym)}
    />
  )
}

// Динамика ДТП по месяцам — всегда 12 месяцев, заканчивая выбранным
// периодом (см. getTrendMonths).
export function AccidentsTrendChart({ data }: Props) {
  const gradientId = useGradientId()
  const chartData: TrendPoint[] = data.monthlyCounts.map((m) => ({
    ym: m.ym,
    label: formatMonthShortLabel(m.ym),
    count: m.count,
  }))

  // ТЗ §4.3: клик по точке — период дашборда = этот месяц
  const handleClick = (ym: number) => filtersStore.setPeriod({ mode: 'month', value: ym })

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((d) => d.label))

  const table: ChartDataTable = {
    columns: ['Месяц', 'ДТП'],
    rows: chartData.map((d) => [formatMonthLabel(d.ym), formatNumber(d.count)]),
  }

  return (
    <ChartCard
      table={table}
      title="Динамика ДТП по месяцам"
      subtitle={`${formatNumber(chartData.reduce((sum, d) => sum + d.count, 0))} ДТП за ${chartData.length} мес.`}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              <AreaGradient id={`${gradientId}-0`} color={COLOR_COUNT} strong />
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...X_AXIS_PROPS} {...xAxisProps} />
            <YAxis {...Y_AXIS_PROPS} allowDecimals={false} />
            <Tooltip
              cursor={LINE_CURSOR}
              content={
                <ChartTooltip titleFormatter={(point) => formatMonthLabel(Number(point?.ym))} />
              }
            />
            <Area
              activeDot={activeLineDot(COLOR_COUNT)}
              fill={`url(#${gradientId}-0)`}
              {...ANIMATION}
              type="monotone"
              dataKey="count"
              name="ДТП"
              stroke={COLOR_COUNT}
              strokeWidth={2}
              dot={<TrendDot onPointClick={handleClick} />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
