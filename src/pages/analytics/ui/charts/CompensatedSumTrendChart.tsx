import {
  CartesianGrid,
  Area,
  AreaChart,
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
  LINE_CURSOR,
  activeLineDot,
  lineDot,
} from '@/shared/ui/chart/chartStyle'
import { AreaGradient } from '@/shared/ui/chart/ChartGradients'
import { ChartTooltip } from '@/shared/ui/chart/ChartTooltip'
import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatMonthShortLabel, formatMonthLabel, isInPeriod } from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency, withCurrencyUnit } from '@/shared/lib/formatters'
import { CHART_MARGIN, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { AnalyticsData } from '../../model/analyticsData'

interface Props {
  data: AnalyticsData
  rowsA: AccidentRow[]
  rowsB: AccidentRow[]
}

// Динамика суммы возмещения по месяцам — две линии (по автоколонне).
export function CompensatedSumTrendChart({ data, rowsA, rowsB }: Props) {
  const gradientId = useGradientId()
  const chartData = data.trendMonths.map((ym, index) => ({
    ym,
    label: formatMonthShortLabel(ym),
    a: data.monthlyA[index]?.sumCompensated ?? 0,
    b: data.monthlyB[index]?.sumCompensated ?? 0,
  }))

  const handleClick = (ym: number) => {
    const monthPeriod = { mode: 'month' as const, value: ym }
    const rows = [
      ...rowsA.filter((row) => isInPeriod(row, monthPeriod)),
      ...rowsB.filter((row) => isInPeriod(row, monthPeriod)),
    ]
    drilldownStore.open(`Все ДТП — ${formatMonthLabel(ym)}`, rows)
  }

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((d) => d.label))

  const table: ChartDataTable = {
    columns: ['Месяц', data.a.name, data.b.name],
    rows: chartData.map((d) => [formatMonthLabel(d.ym), formatCurrency(d.a), formatCurrency(d.b)]),
  }

  return (
    <ChartCard
      table={table}
      title="Динамика суммы возмещения по месяцам"
      subtitle={withCurrencyUnit('Суммы по месяцам')}
      legend={[
        { label: data.a.name, color: COMPARISON_COLOR_A },
        { label: data.b.name, color: COMPARISON_COLOR_B },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={CHART_MARGIN}
            onClick={(state) => {
              const point = (state as { activePayload?: { payload: { ym: number } }[] } | null)
                ?.activePayload?.[0]?.payload
              if (point) handleClick(point.ym)
            }}
          >
            <defs>
              <AreaGradient id={`${gradientId}-0`} color={COMPARISON_COLOR_A} strong={false} />
              <AreaGradient id={`${gradientId}-1`} color={COMPARISON_COLOR_B} strong={false} />
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...X_AXIS_PROPS} {...xAxisProps} />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={formatCompactCurrency} />
            <Tooltip
              cursor={LINE_CURSOR}
              content={
                <ChartTooltip
                  valueFormatter={formatCurrency}
                  titleFormatter={(point) => formatMonthLabel(Number(point?.ym))}
                />
              }
            />
            <Area
              activeDot={activeLineDot(COMPARISON_COLOR_A)}
              fill={`url(#${gradientId}-0)`}
              {...ANIMATION}
              type="monotone"
              dataKey="a"
              name={data.a.name}
              stroke={COMPARISON_COLOR_A}
              strokeWidth={2}
              dot={lineDot(COMPARISON_COLOR_A)}
            />
            <Area
              activeDot={activeLineDot(COMPARISON_COLOR_B)}
              fill={`url(#${gradientId}-1)`}
              {...ANIMATION}
              type="monotone"
              dataKey="b"
              name={data.b.name}
              stroke={COMPARISON_COLOR_B}
              strokeWidth={2}
              dot={lineDot(COMPARISON_COLOR_B)}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
