import { ChartCard, type ChartDataTable } from '@/widgets/chart-card/ChartCard'
import { CauseDonut } from '@/widgets/cause-donut/CauseDonut'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { formatNumber, formatPercent } from '@/shared/lib/formatters'
import { t } from '@/shared/i18n'
import type { OverviewData } from '../../model/overviewData'

interface Props {
  data: OverviewData
  period: Period
}

export function CausesPieChart({ data, period }: Props) {
  const slices = data.causeSlices.filter((s) => s.count > 0)
  const periodLabel = formatPeriodLabel(period)

  if (slices.length === 0) {
    return (
      <ChartCard
        title={t('roadAccidents.chart.causes')}
        subtitle={t('roadAccidents.chart.causesSubtitle')}
      >
        <div style={{ color: 'var(--color-text-faint)', fontSize: 13 }}>
          {t('roadAccidents.common.noDataForPeriod')}
        </div>
      </ChartCard>
    )
  }

  const slicesTotal = slices.reduce((sum, s) => sum + s.count, 0)
  const table: ChartDataTable = {
    columns: [
      t('roadAccidents.common.category'),
      t('roadAccidents.common.accidents'),
      t('roadAccidents.common.share'),
    ],
    rows: slices.map((s) => [
      s.label,
      formatNumber(s.count),
      formatPercent(slicesTotal > 0 ? s.count / slicesTotal : null, 1),
    ]),
  }

  return (
    <ChartCard
      table={table}
      title={t('roadAccidents.chart.causes')}
      subtitle={t('roadAccidents.chart.causesSubtitle')}
    >
      <CauseDonut
        slices={slices}
        onSelect={(slice) => drilldownStore.open(`${slice.label} — ${periodLabel}`, slice.rows)}
      />
    </ChartCard>
  )
}
