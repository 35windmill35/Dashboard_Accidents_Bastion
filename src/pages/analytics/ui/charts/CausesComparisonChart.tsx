import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { formatPercent } from '@/shared/lib/formatters'
import { CHART_MARGIN, Y_AXIS_WIDTH, barPayload, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { AnalyticsData, CauseComparisonRow } from '../../model/analyticsData'

interface Props {
  data: AnalyticsData
  period: Period
}

// Доли причин ДТП двух автоколонн бок о бок — 5 категорий на оси X,
// проценты (не абсолютные числа), чтобы автоколонны разного размера были
// сравнимы.
export function CausesComparisonChart({ data, period }: Props) {
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

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((r) => r.label), {
    mirrorPadding: true,
  })

  return (
    <ChartCard
      title="Сравнение структуры причин ДТП"
      legend={[
        { label: data.a.name, color: COMPARISON_COLOR_A },
        { label: data.b.name, color: COMPARISON_COLOR_B },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--color-text-secondary)" {...xAxisProps} />
            <YAxis
              stroke="var(--color-text-secondary)"
              fontSize={12}
              tickFormatter={(v: number) => formatPercent(v)}
              width={Y_AXIS_WIDTH}
            />
            <Tooltip
              formatter={(value) => formatPercent(Number(value))}
              contentStyle={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-text)',
              }}
            />
            <Bar
              dataKey="shareA"
              name={data.a.name}
              fill={COMPARISON_COLOR_A}
              radius={[4, 4, 0, 0]}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openCause(barPayload<CauseComparisonRow>(entry).category, 'a')}
            />
            <Bar
              dataKey="shareB"
              name={data.b.name}
              fill={COMPARISON_COLOR_B}
              radius={[4, 4, 0, 0]}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openCause(barPayload<CauseComparisonRow>(entry).category, 'b')}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
