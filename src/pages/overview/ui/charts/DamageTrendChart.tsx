import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { formatMonthShortLabel, formatMonthLabel, isInPeriod } from '@/entities/accident/lib/period'
import { CHART_1, CHART_2 } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency } from '@/shared/lib/formatters'
import { useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
}

// Динамика суммы ущерба/возмещения по месяцам — та же ось, что и на графике
// количества ДТП по месяцам (см. AccidentsTrendChart), но в тенге.
export function DamageTrendChart({ data }: Props) {
  const chartData = data.monthlyCounts.map((m) => ({
    ym: m.ym,
    label: formatMonthShortLabel(m.ym),
    sumDamage: m.sumDamage,
    sumCompensated: m.sumCompensated,
  }))

  const handleClick = (ym: number) => {
    const rows = accidentsStore.rows.filter((row) => isInPeriod(row, { mode: 'month', value: ym }))
    drilldownStore.open(`Все ДТП — ${formatMonthLabel(ym)}`, rows)
  }

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((d) => d.label))

  return (
    <ChartCard
      title="Динамика ущерба и возмещения по месяцам"
      legend={[
        { label: 'Ущерб', color: CHART_1 },
        { label: 'Возмещение', color: CHART_2 },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
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
              width={76}
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
              dataKey="sumDamage"
              name="Ущерб"
              stroke={CHART_1}
              strokeWidth={2}
              dot={{ r: 3, cursor: 'pointer' }}
            />
            <Line
              type="monotone"
              dataKey="sumCompensated"
              name="Возмещение"
              stroke={CHART_2}
              strokeWidth={2}
              dot={{ r: 3, cursor: 'pointer' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
