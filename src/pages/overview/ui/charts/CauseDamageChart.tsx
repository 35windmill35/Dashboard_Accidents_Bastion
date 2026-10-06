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
import { CHART_MARGIN, barPayload, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import { t } from '@/shared/i18n'
import type { CauseSlice, OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
  period: Period
}

export function CauseDamageChart({ data, period }: Props) {
  const gradientId = useGradientId()
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
    columns: [
      t('roadAccidents.common.category'),
      t('roadAccidents.common.damage'),
      t('roadAccidents.common.compensation'),
    ],
    rows: chartData.map((s) => [
      s.label,
      formatCurrency(s.sumDamage),
      formatCurrency(s.sumCompensated),
    ]),
  }

  return (
    <ChartCard
      table={table}
      title={t('roadAccidents.chart.damageByCause')}
      subtitle={withCurrencyUnit(t('roadAccidents.chart.sumsForPeriod'))}
      legend={[
        { label: t('roadAccidents.common.damage'), color: COLOR_DAMAGE },
        { label: t('roadAccidents.common.compensation'), color: COLOR_COMPENSATION },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              <BarGradient id={`${gradientId}-0`} color={COLOR_DAMAGE} />
              <BarGradient id={`${gradientId}-1`} color={COLOR_COMPENSATION} />
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...X_AXIS_PROPS} {...xAxisProps} />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={formatCompactCurrency} />
            <Tooltip
              cursor={BAR_CURSOR}
              content={<ChartTooltip valueFormatter={formatCurrency} />}
            />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="sumDamage"
              name={t('roadAccidents.common.damage')}
              fill={`url(#${gradientId}-0)`}
              radius={BAR_RADIUS}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openCause(barPayload<CauseSlice>(entry).category)}
            />
            <Bar
              maxBarSize={BAR_SIZE_GROUPED}
              {...ANIMATION}
              dataKey="sumCompensated"
              name={t('roadAccidents.common.compensation')}
              fill={`url(#${gradientId}-1)`}
              radius={BAR_RADIUS}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => openCause(barPayload<CauseSlice>(entry).category)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
