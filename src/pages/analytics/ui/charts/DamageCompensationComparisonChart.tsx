import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { CHART_1, CHART_2 } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency } from '@/shared/lib/formatters'
import { barPayload } from '@/shared/lib/rechartsHelpers'
import type { AnalyticsData } from '../../model/analyticsData'

interface Props {
  data: AnalyticsData
  period: Period
}

interface Point {
  side: 'a' | 'b'
  name: string
  sumDamage: number
  sumCompensated: number
}

// Ущерб/возмещение по каждой автоколонне — ось X здесь автоколонна (в
// отличие от CauseDamageChart на "Обзоре"/"Автоколонне", где ось X —
// категория причины), легенда — по метрике, а не по автоколонне.
export function DamageCompensationComparisonChart({ data, period }: Props) {
  const periodLabel = formatPeriodLabel(period)

  const chartData: Point[] = [
    {
      side: 'a',
      name: data.a.name,
      sumDamage: data.a.scope.kpi.sumDamage,
      sumCompensated: data.a.scope.kpi.sumCompensated,
    },
    {
      side: 'b',
      name: data.b.name,
      sumDamage: data.b.scope.kpi.sumDamage,
      sumCompensated: data.b.scope.kpi.sumCompensated,
    },
  ]

  const openSide = (side: 'a' | 'b') => {
    const target = side === 'a' ? data.a : data.b
    drilldownStore.open(`Все ДТП — ${target.name}, ${periodLabel}`, target.scope.periodRows)
  }

  return (
    <ChartCard
      title="Сумма ущерба и возмещения"
      legend={[
        { label: 'Ущерб', color: CHART_1 },
        { label: 'Возмещение', color: CHART_2 },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
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
          <Bar
            dataKey="sumDamage"
            name="Ущерб"
            fill={CHART_1}
            radius={[4, 4, 0, 0]}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => openSide(barPayload<Point>(entry).side)}
          />
          <Bar
            dataKey="sumCompensated"
            name="Возмещение"
            fill={CHART_2}
            radius={[4, 4, 0, 0]}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => openSide(barPayload<Point>(entry).side)}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
