import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  GRID_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
  ANIMATION,
  useGradientId,
  BAR_CURSOR,
  BAR_RADIUS,
  BAR_SIZE_GROUPED,
} from '@/shared/ui/chart/chartStyle'
import { BarGradient } from '@/shared/ui/chart/ChartGradients'
import { ChartTooltip } from '@/shared/ui/chart/ChartTooltip'
import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { formatPercent } from '@/shared/lib/formatters'
import { CHART_MARGIN, barPayload, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { AnalyticsData, CauseComparisonRow } from '../../model/analyticsData'

interface Props {
  data: AnalyticsData
  period: Period
}

// Доли причин ДТП двух автоколонн бок о бок — 5 категорий на оси X,
// проценты (не абсолютные числа), чтобы автоколонны разного размера были
// сравнимы.
export function CausesComparisonChart({ data, period }: Props) {
  const gradientId = useGradientId()
  const periodLabel = formatPeriodLabel(period)
  const chartData = data.causeComparison.filter(
    (row) => row.rowsA.length > 0 || row.rowsB.length > 0
  )

  const openCause = (category: string, side: 'a' | 'b') => {
    const row = chartData.find((r) => r.category === category)
    if (!row) return
    const name = side === 'a' ? data.a.name : data.b.name
    const rows = side === 'a' ? row.rowsA : row.rowsB
    drilldownStore.open(`${row.label} — ${name}, ${periodLabel}`, rows)
  }

  const { containerRef, xAxisProps } = useCategoryXAxis(
    chartData.map((r) => r.label),
    {
      mirrorPadding: true,
    }
  )

  const table: ChartDataTable = {
    columns: ['Категория', data.a.name, data.b.name],
    rows: chartData.map((r) => [r.label, formatPercent(r.shareA), formatPercent(r.shareB)]),
  }

  return (
    <ChartCard
      table={table}
      title="Сравнение структуры причин ДТП"
      subtitle={'Доля ДТП каждой категории'}
      legend={[
        { label: data.a.name, color: COMPARISON_COLOR_A },
        { label: data.b.name, color: COMPARISON_COLOR_B },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              <BarGradient id={`${gradientId}-0`} color={COMPARISON_COLOR_A} />
              <BarGradient id={`${gradientId}-1`} color={COMPARISON_COLOR_B} />
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...X_AXIS_PROPS} {...xAxisProps} />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={(v: number) => formatPercent(v)} />
            <Tooltip
              cursor={BAR_CURSOR}
              content={<ChartTooltip valueFormatter={formatPercent} />}
            />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="shareA"
              name={data.a.name}
              fill={`url(#${gradientId}-0)`}
              radius={BAR_RADIUS}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openCause(barPayload<CauseComparisonRow>(entry).category, 'a')}
            />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="shareB"
              name={data.b.name}
              fill={`url(#${gradientId}-1)`}
              radius={BAR_RADIUS}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openCause(barPayload<CauseComparisonRow>(entry).category, 'b')}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
