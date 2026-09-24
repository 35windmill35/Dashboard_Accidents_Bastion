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
import { getMotorcadeKey } from '@/entities/accident/lib/motorcade'
import { COLOR_DAMAGE, COLOR_COMPENSATION } from '@/shared/lib/chartColors'
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
  withCurrencyUnit,
} from '@/shared/lib/formatters'
import { CHART_MARGIN, barPayload, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { MotorcadeAggregate } from '@/entities/accident/lib/metrics'
import type { OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
  period: Period
}

// Ущерб/возмещение по автоколоннам — одна ось (обе величины в тенге), два
// ряда рядом, не наложение.
export function MotorcadeDamageChart({ data, period }: Props) {
  const gradientId = useGradientId()
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

  const table: ChartDataTable = {
    columns: ['Автоколонна', 'Ущерб', 'Возмещение', 'Доля возмещения'],
    rows: data.motorcadeAgg.map((m) => [
      m.name,
      formatCurrency(m.sumDamage),
      formatCurrency(m.sumCompensated),
      formatPercent(m.sumDamage > 0 ? m.sumCompensated / m.sumDamage : null),
    ]),
  }

  return (
    <ChartCard
      table={table}
      title="Ущерб и возмещение по автоколоннам"
      subtitle={withCurrencyUnit('Суммы за период')}
      legend={[
        { label: 'Ущерб', color: COLOR_DAMAGE },
        { label: 'Возмещение', color: COLOR_COMPENSATION },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.motorcadeAgg} margin={CHART_MARGIN}>
            <defs>
              <BarGradient id={`${gradientId}-0`} color={COLOR_DAMAGE} />
              <BarGradient id={`${gradientId}-1`} color={COLOR_COMPENSATION} />
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="name" {...X_AXIS_PROPS} {...xAxisProps} />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={formatCompactCurrency} />
            <Tooltip
              cursor={BAR_CURSOR}
              content={<ChartTooltip valueFormatter={formatCurrency} />}
            />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="sumDamage"
              name="Ущерб"
              fill={`url(#${gradientId}-0)`}
              radius={BAR_RADIUS}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openMotorcade(barPayload<MotorcadeAggregate>(entry).key)}
            />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="sumCompensated"
              name="Возмещение"
              fill={`url(#${gradientId}-1)`}
              radius={BAR_RADIUS}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openMotorcade(barPayload<MotorcadeAggregate>(entry).key)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
