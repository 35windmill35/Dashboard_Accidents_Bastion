import {
  CartesianGrid,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import {
  GRID_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
  ANIMATION,
  useGradientId,
  LINE_CURSOR,
  activeLineDot,
  lineDot,
} from '@/shared/ui/chart/chartStyle'
import { AreaGradient } from '@/shared/ui/chart/ChartGradients'
import { ChartTooltip } from '@/shared/ui/chart/ChartTooltip'
import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { formatMonthShortLabel, formatMonthLabel } from '@/entities/accident/lib/period'
import { COLOR_DAMAGE, COLOR_COMPENSATION } from '@/shared/lib/chartColors'
import { formatCurrency, formatCompactCurrency, withCurrencyUnit } from '@/shared/lib/formatters'
import { CHART_MARGIN, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import { t } from '@/shared/i18n'
import type { MotorcadeData } from '../../model/motorcadeData'

interface Props {
  data: MotorcadeData
}

// Динамика суммы ущерба/возмещения по месяцам для выбранной автоколонны —
// та же ось, что и у графика количества ДТП (см. MotorcadeTrendChart).
export function MotorcadeDamageTrendChart({ data }: Props) {
  const gradientId = useGradientId()
  const chartData = data.monthlyCounts.map((m) => ({
    ym: m.ym,
    label: formatMonthShortLabel(m.ym),
    sumDamage: m.sumDamage,
    sumCompensated: m.sumCompensated,
  }))

  // Клик по точке — период дашборда = этот месяц
  const handleClick = (ym: number) => filtersStore.setPeriod({ mode: 'month', value: ym })

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((d) => d.label))

  const table: ChartDataTable = {
    columns: [
      t('roadAccidents.common.month'),
      t('roadAccidents.common.damage'),
      t('roadAccidents.common.compensation'),
    ],
    rows: chartData.map((d) => [
      formatMonthLabel(d.ym),
      formatCurrency(d.sumDamage),
      formatCurrency(d.sumCompensated),
    ]),
  }

  return (
    <ChartCard
      table={table}
      title={t('roadAccidents.chart.damageTrend')}
      subtitle={withCurrencyUnit(t('roadAccidents.chart.sumsByMonth'))}
      legend={[
        { label: t('roadAccidents.common.damage'), color: COLOR_DAMAGE },
        { label: t('roadAccidents.common.compensation'), color: COLOR_COMPENSATION },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={CHART_MARGIN}
            onClick={(state) => {
              const point = (state as { activePayload?: { payload: { ym: number } }[] } | null)
                ?.activePayload?.[0]?.payload
              if (point) handleClick(point.ym)
            }}
          >
            <defs>
              <AreaGradient id={`${gradientId}-0`} color={COLOR_DAMAGE} strong={false} />
              <AreaGradient id={`${gradientId}-1`} color={COLOR_COMPENSATION} strong={false} />
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...X_AXIS_PROPS} {...xAxisProps} />
            <YAxis {...Y_AXIS_PROPS} tickFormatter={formatCompactCurrency} />
            <Tooltip
              cursor={LINE_CURSOR}
              content={
                <ChartTooltip
                  valueFormatter={formatCurrency}
                  titleFormatter={(point) => formatMonthLabel(Number(point?.ym))}
                />
              }
            />
            <Area
              activeDot={activeLineDot(COLOR_DAMAGE)}
              fill={`url(#${gradientId}-0)`}
              {...ANIMATION}
              type="monotone"
              dataKey="sumDamage"
              name={t('roadAccidents.common.damage')}
              stroke={COLOR_DAMAGE}
              strokeWidth={2}
              dot={lineDot(COLOR_DAMAGE)}
            />
            <Area
              activeDot={activeLineDot(COLOR_COMPENSATION)}
              fill={`url(#${gradientId}-1)`}
              {...ANIMATION}
              type="monotone"
              dataKey="sumCompensated"
              name={t('roadAccidents.common.compensation')}
              stroke={COLOR_COMPENSATION}
              strokeWidth={2}
              dot={lineDot(COLOR_COMPENSATION)}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
