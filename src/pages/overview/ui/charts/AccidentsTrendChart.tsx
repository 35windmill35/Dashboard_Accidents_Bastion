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
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { formatMonthShortLabel, formatMonthLabel, isInPeriod } from '@/entities/accident/lib/period'
import { CHART_1 } from '@/shared/lib/chartColors'
import { CATEGORY_X_AXIS_PROPS } from '@/shared/lib/rechartsHelpers'
import type { OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
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

// Точка графика кликабельна — открывает детализацию за этот месяц.
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

// Динамика ДТП по месяцам — всегда 12 месяцев, заканчивая выбранным
// периодом (см. getTrendMonths).
export function AccidentsTrendChart({ data }: Props) {
  const chartData: TrendPoint[] = data.monthlyCounts.map((m) => ({
    ym: m.ym,
    label: formatMonthShortLabel(m.ym),
    count: m.count,
  }))

  const handleClick = (ym: number) => {
    const rows = accidentsStore.rows.filter((row) => isInPeriod(row, { mode: 'month', value: ym }))
    drilldownStore.open(`Все ДТП — ${formatMonthLabel(ym)}`, rows)
  }

  return (
    <ChartCard title="Динамика ДТП по месяцам" legend={[{ label: 'ДТП', color: CHART_1 }]}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--color-text-secondary)" {...CATEGORY_X_AXIS_PROPS} />
          <YAxis stroke="var(--color-text-secondary)" fontSize={12} allowDecimals={false} />
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
    </ChartCard>
  )
}
