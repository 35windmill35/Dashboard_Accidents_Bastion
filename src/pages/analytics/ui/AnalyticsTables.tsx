import { DataTable, type DataTableColumn } from '@/widgets/data-table/DataTable'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatCurrency, formatNumber, formatPercent, kpiDelta } from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { t } from '@/shared/i18n'
import type { AnalyticsData, SummaryRow, WorstDriverRow } from '../model/analyticsData'
import styles from './AnalyticsTables.module.css'

interface AnalyticsTablesProps {
  data: AnalyticsData
  period: Period
}

function formatByKind(kind: SummaryRow['kind'], value: number | null): string {
  if (kind === 'currency') return formatCurrency(value)
  if (kind === 'percent') return formatPercent(value)
  return formatNumber(value)
}

const worstDriverColumns: DataTableColumn<WorstDriverRow>[] = [
  {
    key: 'name',
    label: t('roadAccidents.common.driver'),
    grow: true,
    render: (r) => r.name,
    title: (r) => r.name,
  },
  {
    key: 'motorcadeName',
    label: t('roadAccidents.common.motorcade'),
    dim: true,
    render: (r) => r.motorcadeName,
    title: (r) => r.motorcadeName,
  },
  {
    key: 'count',
    label: t('roadAccidents.common.accidents'),
    align: 'right',
    render: (r) => formatNumber(r.count),
  },
  {
    key: 'sumDamage',
    label: t('roadAccidents.common.damage'),
    align: 'right',
    render: (r) => formatCurrency(r.sumDamage),
  },
  {
    key: 'driverFaultShare',
    label: t('roadAccidents.table.driverFaultShare'),
    align: 'right',
    render: (r) => formatPercent(r.driverFaultShare),
  },
]

export function AnalyticsTables({ data, period }: AnalyticsTablesProps) {
  const periodLabel = formatPeriodLabel(period)

  const summaryColumns: DataTableColumn<SummaryRow>[] = [
    {
      key: 'label',
      label: t('roadAccidents.common.indicator'),
      grow: true,
      wrap: true,
      render: (r) => r.label,
    },
    {
      key: 'valueA',
      label: data.a.name,
      align: 'right',
      render: (r) => formatByKind(r.kind, r.valueA),
    },
    {
      key: 'valueB',
      label: data.b.name,
      align: 'right',
      render: (r) => formatByKind(r.kind, r.valueB),
    },
    {
      key: 'diff',
      label: t('roadAccidents.common.difference'),
      align: 'right',
      dim: true,
      render: (r) => kpiDelta(r.kind, r.valueB, r.valueA)?.text ?? '—',
    },
  ]

  return (
    <div className={styles.grid}>
      <DataTable
        title={t('roadAccidents.table.summaryComparison')}
        columns={summaryColumns}
        rows={data.summaryRows}
        getRowKey={(r) => r.key}
        initialLimit={data.summaryRows.length}
      />
      <DataTable
        title={t('roadAccidents.table.topDriversBoth')}
        columns={worstDriverColumns}
        rows={data.worstDrivers}
        getRowKey={(r) => r.key}
        showRank
        initialLimit={data.worstDrivers.length}
        onRowClick={(r) =>
          drilldownStore.open(`${r.name} — ${r.motorcadeName}, ${periodLabel}`, r.rows)
        }
      />
    </div>
  )
}
