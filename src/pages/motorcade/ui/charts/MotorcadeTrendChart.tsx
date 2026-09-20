import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatMonthShortLabel, formatMonthLabel, isInPeriod } from '@/entities/accident/lib/period'
import { CHART_1 } from '@/shared/lib/chartColors'
import { CHART_MARGIN, Y_AXIS_WIDTH, useCategoryXAxis } from '@/shared/lib/rechartsHelpers'
import type { AccidentRow } from '@/entities/accident/model/types'
import type { MotorcadeData } from '../../model/motorcadeData'

interface Props {
  data: MotorcadeData
  motorcadeRows: AccidentRow[]
}

interface TrendPoint {
  ym: number
  label: string
  count: number
}

interface DotProps {
  cx?: number
  cy?: number
  payload?: TrendPoint
  onPointClick: (ym: number) => void
}

// Точка графика кликабельна — открывает детализацию за этот месяц (в
// пределах уже выбранной автоколонны).
function TrendDot({ cx, cy, payload, onPointClick }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={CHART_1}
      style={{ cursor: 'pointer' }}
      onClick={() => onPointClick(payload.ym)}
    />
  )
}

// Динамика ДТП по месяцам для выбранной автоколонны — те же 12 месяцев, что
// и на "Обзоре" (см. getTrendMonths), но по её собственной истории.
export function MotorcadeTrendChart({ data, motorcadeRows }: Props) {
  const chartData: TrendPoint[] = data.monthlyCounts.map((m) => ({
    ym: m.ym,
    label: formatMonthShortLabel(m.ym),
    count: m.count,
  }))

  const handleClick = (ym: number) => {
    const rows = motorcadeRows.filter((row) => isInPeriod(row, { mode: 'month', value: ym }))
    drilldownStore.open(`Все ДТП — ${formatMonthLabel(ym)}`, rows)
  }

  const { containerRef, xAxisProps } = useCategoryXAxis(chartData.map((d) => d.label))

  return (
    <ChartCard title="Динамика ДТП по месяцам" legend={[{ label: 'ДТП', color: CHART_1 }]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--color-text-secondary)" {...xAxisProps} />
            <YAxis
              stroke="var(--color-text-secondary)"
              fontSize={12}
              allowDecimals={false}
              width={Y_AXIS_WIDTH}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-text)',
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="ДТП"
              stroke={CHART_1}
              strokeWidth={2}
              dot={<TrendDot onPointClick={handleClick} />}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
