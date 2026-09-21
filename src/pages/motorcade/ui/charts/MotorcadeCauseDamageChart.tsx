import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { CHART_1, CHART_2 } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency } from '@/shared/lib/formatters'
import {
  CHART_MARGIN,
  Y_AXIS_WIDTH,
  barPayload,
  useCategoryXAxis,
} from '@/shared/lib/rechartsHelpers'
import type { CauseSlice } from '@/entities/accident/lib/metrics'
import type { MotorcadeData } from '../../model/motorcadeData'

interface Props {
  data: MotorcadeData
  period: Period
}

// Сумма ущерба/возмещения по категориям причин для одной автоколонны —
// та же логика, что и на "Обзоре" (см. CauseDamageChart), но по её данным.
export function MotorcadeCauseDamageChart({ data, period }: Props) {
  const periodLabel = formatPeriodLabel(period)
  const chartData = data.causeSlices.filter((s) => s.count > 0)

  const openCause = (category: string) => {
    const slice = chartData.find((s) => s.category === category)
    if (slice) drilldownStore.open(`${slice.label} — ${periodLabel}`, slice.rows)
  }

  const { containerRef, xAxisProps } = useCategoryXAxis(
    chartData.map((s) => s.label),
    {
      mirrorPadding: true,
    }
  )

  const table: ChartDataTable = {
    columns: ['Категория', 'Ущерб', 'Возмещение'],
    rows: chartData.map((s) => [
      s.label,
      formatCurrency(s.sumDamage),
      formatCurrency(s.sumCompensated),
    ]),
  }

  return (
    <ChartCard
      table={table}
      title="Ущерб и возмещение по категориям причин"
      legend={[
        { label: 'Ущерб', color: CHART_1 },
        { label: 'Возмещение', color: CHART_2 },
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
            <Bar
              dataKey="sumDamage"
              name="Ущерб"
              fill={CHART_1}
              radius={[4, 4, 0, 0]}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openCause(barPayload<CauseSlice>(entry).category)}
            />
            <Bar
              dataKey="sumCompensated"
              name="Возмещение"
              fill={CHART_2}
              radius={[4, 4, 0, 0]}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openCause(barPayload<CauseSlice>(entry).category)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
