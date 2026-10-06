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
import { t } from '@/shared/i18n'
import type { MotorcadeData } from '../../model/motorcadeData'

interface Props {
  data: MotorcadeData
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

export function MotorcadeTrendChart({ data }: Props) {
  const gradientId = useGradientId()
  const chartData: TrendPoint[] = data.monthlyCounts.map((m) => ({
    ym: m.ym,
    label: formatMonthShortLabel(m.ym),
    count: m.count,
  }))

  const handleClick = (ym: number) => filtersStore.setPeriod({ mode: 'month', value: ym })

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((d) => d.label))

  const table: ChartDataTable = {
    columns: [t('roadAccidents.common.month'), t('roadAccidents.common.accidents')],
    rows: chartData.map((d) => [formatMonthLabel(d.ym), formatNumber(d.count)]),
  }

  return (
    <ChartCard
      table={table}
      title={t('roadAccidents.chart.accidentsTrend')}
      subtitle={t('roadAccidents.chart.accidentsForMonths', {
        count: formatNumber(chartData.reduce((sum, d) => sum + d.count, 0)),
        months: chartData.length,
      })}
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
              name={t('roadAccidents.common.accidents')}
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
