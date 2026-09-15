import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartCard } from '@/widgets/chart-card/ChartCard'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { CAUSE_CATEGORY_COLORS } from '@/shared/lib/chartColors'
import { formatNumber } from '@/shared/lib/formatters'
import type { OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
  period: Period
}

interface CauseSliceLike {
  label: string
  count: number
}

// Структура причин ДТП за период, 5 категорий (см. shared/config/accidentCauses).
// Прямые подписи со значением на каждом секторе — часть категорий по
// цвету ниже контрастного порога на светлой теме, полагаться только на
// цвет нельзя.
export function CausesPieChart({ data, period }: Props) {
  const slices = data.causeSlices.filter((s) => s.count > 0)
  const periodLabel = formatPeriodLabel(period)

  if (slices.length === 0) {
    return (
      <ChartCard title="Структура причин ДТП">
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          Нет данных за период
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Структура причин ДТП">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="count"
            nameKey="label"
            innerRadius="45%"
            outerRadius="75%"
            paddingAngle={2}
            label={(entry) => {
              const slice = entry.payload as CauseSliceLike
              return `${slice.label}: ${formatNumber(slice.count)}`
            }}
            onClick={(entry) => {
              const category = (entry as { category?: string }).category
              const slice = slices.find((s) => s.category === category)
              if (slice) drilldownStore.open(`${slice.label} — ${periodLabel}`, slice.rows)
            }}
            style={{ cursor: 'pointer' }}
          >
            {slices.map((slice) => (
              <Cell key={slice.category} fill={CAUSE_CATEGORY_COLORS[slice.category]} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
          <Tooltip
            formatter={(value, name) => [formatNumber(Number(value)), name]}
            contentStyle={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
