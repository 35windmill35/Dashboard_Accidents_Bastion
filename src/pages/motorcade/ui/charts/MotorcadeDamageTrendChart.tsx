import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { formatMonthShortLabel, formatMonthLabel } from '@/entities/accident/lib/period'
import { CHART_1, CHART_2 } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency } from '@/shared/lib/formatters'
import { CHART_MARGIN, Y_AXIS_WIDTH, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { MotorcadeData } from '../../model/motorcadeData'

interface Props {
  data: MotorcadeData
}

// Динамика суммы ущерба/возмещения по месяцам для выбранной автоколонны —
// та же ось, что и у графика количества ДТП (см. MotorcadeTrendChart).
export function MotorcadeDamageTrendChart({ data }: Props) {
  const chartData = data.monthlyCounts.map((m) => ({
    ym: m.ym,
    label: formatMonthShortLabel(m.ym),
    sumDamage: m.sumDamage,
    sumCompensated: m.sumCompensated,
  }))

  // ТЗ §4.3: клик по точке — период дашборда = этот месяц
  const handleClick = (ym: number) => filtersStore.setPeriod({ mode: 'month', value: ym })

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((d) => d.label))

  const table: ChartDataTable = {
    columns: ['Месяц', 'Ущерб', 'Возмещение'],
    rows: chartData.map((d) => [
      formatMonthLabel(d.ym),
      formatCurrency(d.sumDamage),
      formatCurrency(d.sumCompensated),
    ]),
  }

  return (
    <ChartCard
      table={table}
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
