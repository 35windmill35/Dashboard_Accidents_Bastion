import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { CauseDonut } from '@/widgets/cause-donut/CauseDonut'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { collapseSlices, type BreakdownSlice } from '@/entities/accident/lib/metrics'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { causerColor, sliceColor } from '@/shared/lib/chartColors'
import { formatNumber, formatPercent } from '@/shared/lib/formatters'
import { t } from '@/shared/i18n'

interface Props {
  slices: BreakdownSlice[]
  period: Period
}

interface CardProps extends Props {
  title: string
  subtitle: string
  column: string
  colorOf: (slice: BreakdownSlice, index: number) => string
}

function BreakdownDonutCard({ slices, period, title, subtitle, column, colorOf }: CardProps) {
  const periodLabel = formatPeriodLabel(period)
  const total = slices.reduce((sum, s) => sum + s.count, 0)

  if (total === 0) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <div style={{ color: 'var(--color-text-faint)', fontSize: 13 }}>
          {t('roadAccidents.common.noDataForPeriod')}
        </div>
      </ChartCard>
    )
  }

  // В таблице — все значения, на кольце — первые пять и «Прочие»
  const table: ChartDataTable = {
    columns: [column, t('roadAccidents.common.accidents'), t('roadAccidents.common.share')],
    rows: slices.map((s) => [s.label, formatNumber(s.count), formatPercent(s.count / total, 1)]),
  }

  return (
    <ChartCard table={table} title={title} subtitle={subtitle}>
      <CauseDonut
        slices={collapseSlices(slices)}
        colorOf={colorOf}
        onSelect={(slice) => drilldownStore.open(`${slice.label} — ${periodLabel}`, slice.rows)}
      />
    </ChartCard>
  )
}

export function CausesDonutCard(props: Props) {
  return (
    <BreakdownDonutCard
      {...props}
      title={t('roadAccidents.chart.causes')}
      subtitle={t('roadAccidents.chart.causesSubtitle')}
      column={t('roadAccidents.common.cause')}
      colorOf={(slice, index) => sliceColor(slice.key, index)}
    />
  )
}

export function CausersDonutCard(props: Props) {
  return (
    <BreakdownDonutCard
      {...props}
      title={t('roadAccidents.chart.causers')}
      subtitle={t('roadAccidents.chart.causersSubtitle')}
      column={t('roadAccidents.common.causer')}
      colorOf={(slice) => causerColor(slice.key)}
    />
  )
}
