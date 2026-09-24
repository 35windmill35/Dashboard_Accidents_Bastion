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
import { COLOR_DAMAGE, COLOR_COMPENSATION } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency, withCurrencyUnit } from '@/shared/lib/formatters'
import { CATEGORY_AXIS_HEIGHT, CHART_MARGIN, barPayload } from '@/shared/lib/rechartsHelpers'
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
  const gradientId = useGradientId()
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

  const table: ChartDataTable = {
    columns: ['Автоколонна', 'Ущерб', 'Возмещение'],
    rows: chartData.map((p) => [
      p.name,
      formatCurrency(p.sumDamage),
      formatCurrency(p.sumCompensated),
    ]),
  }

  return (
    <ChartCard
      table={table}
      title="Сумма ущерба и возмещения"
      subtitle={withCurrencyUnit('Суммы за период')}
      legend={[
        { label: 'Ущерб', color: COLOR_DAMAGE },
        { label: 'Возмещение', color: COLOR_COMPENSATION },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <defs>
            <BarGradient id={`${gradientId}-0`} color={COLOR_DAMAGE} />
            <BarGradient id={`${gradientId}-1`} color={COLOR_COMPENSATION} />
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis {...X_AXIS_PROPS} dataKey="name" height={CATEGORY_AXIS_HEIGHT} />
          <YAxis {...Y_AXIS_PROPS} tickFormatter={formatCompactCurrency} />
          <Tooltip cursor={BAR_CURSOR} content={<ChartTooltip valueFormatter={formatCurrency} />} />
          <Bar
            maxBarSize={BAR_SIZE_GROUPED}
            {...ANIMATION}
            dataKey="sumDamage"
            name="Ущерб"
            fill={`url(#${gradientId}-0)`}
            radius={BAR_RADIUS}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => openSide(barPayload<Point>(entry).side)}
          />
          <Bar
            maxBarSize={BAR_SIZE_GROUPED}
            {...ANIMATION}
            dataKey="sumCompensated"
            name="Возмещение"
            fill={`url(#${gradientId}-1)`}
            radius={BAR_RADIUS}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => openSide(barPayload<Point>(entry).side)}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
