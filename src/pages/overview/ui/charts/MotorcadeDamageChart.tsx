import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { getMotorcadeKey } from '@/entities/accident/lib/motorcade'
import { CHART_1, CHART_2 } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency } from '@/shared/lib/formatters'
import { CHART_MARGIN, Y_AXIS_WIDTH, barPayload, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { MotorcadeAggregate } from '@/entities/accident/lib/metrics'
import type { OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
  period: Period
}

// Ущерб/возмещение по автоколоннам — одна ось (обе величины в тенге), два
// ряда рядом, не наложение.
export function MotorcadeDamageChart({ data, period }: Props) {
  const periodLabel = formatPeriodLabel(period)

  const openMotorcade = (key: string) => {
    const agg = data.motorcadeAgg.find((m) => m.key === key)
    if (!agg) return
    const rows = data.periodRows.filter((row) => getMotorcadeKey(row) === key)
    drilldownStore.open(`${agg.name} — ${periodLabel}`, rows)
  }

  const { containerRef, xAxisProps } = useCategoryXAxis(
    data.motorcadeAgg.map((a) => a.name),
    { mirrorPadding: true }
  )

  return (
    <ChartCard
      title="Ущерб и возмещение по автоколоннам"
      legend={[
        { label: 'Ущерб', color: CHART_1 },
        { label: 'Возмещение', color: CHART_2 },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.motorcadeAgg} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--color-text-secondary)" {...xAxisProps} />
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
              onClick={(entry) => openMotorcade(barPayload<MotorcadeAggregate>(entry).key)}
            />
            <Bar
              dataKey="sumCompensated"
              name="Возмещение"
              fill={CHART_2}
              radius={[4, 4, 0, 0]}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openMotorcade(barPayload<MotorcadeAggregate>(entry).key)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
