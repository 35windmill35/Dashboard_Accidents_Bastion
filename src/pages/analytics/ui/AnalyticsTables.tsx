import { DataTable, type DataTableColumn } from '@/widgets/data-table/DataTable'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDelta,
  calcDelta,
} from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
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
  { key: 'name', label: 'Водитель', grow: true, render: (r) => r.name, title: (r) => r.name },
  {
    key: 'motorcadeName',
    label: 'Автоколонна',
    dim: true,
    render: (r) => r.motorcadeName,
    title: (r) => r.motorcadeName,
  },
  {
    key: 'count',
    label: 'ДТП',
    align: 'right',
    render: (r) => formatNumber(r.count),
  },
  {
    key: 'sumDamage',
    label: 'Ущерб',
    align: 'right',
    render: (r) => formatCurrency(r.sumDamage),
  },
  {
    key: 'driverFaultShare',
    label: 'Вина водителя',
    align: 'right',
    render: (r) => formatPercent(r.driverFaultShare),
  },
]

export function AnalyticsTables({ data, period }: AnalyticsTablesProps) {
  const periodLabel = formatPeriodLabel(period)

  const summaryColumns: DataTableColumn<SummaryRow>[] = [
    { key: 'label', label: 'Показатель', grow: true, wrap: true, render: (r) => r.label },
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
      label: 'Разница',
      align: 'right',
      dim: true,
      render: (r) => formatDelta(calcDelta(r.valueB, r.valueA)),
    },
  ]

  return (
    <div className={styles.grid}>
      <DataTable
        title="Сводное сравнение показателей"
        columns={summaryColumns}
        rows={data.summaryRows}
        getRowKey={(r) => r.key}
        initialLimit={data.summaryRows.length}
      />
      <DataTable
        title="Топ-10 худших водителей (обе автоколонны)"
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
