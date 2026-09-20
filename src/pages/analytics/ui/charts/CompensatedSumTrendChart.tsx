import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatMonthShortLabel, formatMonthLabel, isInPeriod } from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency } from '@/shared/lib/formatters'
import { CHART_MARGIN, Y_AXIS_WIDTH, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { AnalyticsData } from '../../model/analyticsData'

interface Props {
  data: AnalyticsData
  rowsA: AccidentRow[]
  rowsB: AccidentRow[]
}

// Динамика суммы возмещения по месяцам — две линии (по автоколонне).
export function CompensatedSumTrendChart({ data, rowsA, rowsB }: Props) {
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

  return (
    <ChartCard
      title="Динамика суммы возмещения по месяцам"
      legend={[
        { label: data.a.name, color: COMPARISON_COLOR_A },
        { label: data.b.name, color: COMPARISON_COLOR_B },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={CHART_MARGIN}
            onClick={(state) => {
              const point = (state as { activePayload?: { payload: { ym: number } }[] } | null)
                ?.activePayload?.[0]?.payload
              if (point) handleClick(point.ym)
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--color-text-secondary)" {...xAxisProps} />
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
            <Line
              type="monotone"
              dataKey="a"
              name={data.a.name}
              stroke={COMPARISON_COLOR_A}
              strokeWidth={2}
              dot={{ r: 3, cursor: 'pointer' }}
            />
            <Line
              type="monotone"
              dataKey="b"
              name={data.b.name}
              stroke={COMPARISON_COLOR_B}
              strokeWidth={2}
              dot={{ r: 3, cursor: 'pointer' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
