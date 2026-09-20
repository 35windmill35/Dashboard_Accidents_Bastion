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
  { key: 'rank', label: '#', align: 'center', render: (r) => r.rank },
  { key: 'name', label: 'Водитель', render: (r) => r.name },
  { key: 'motorcadeName', label: 'Автоколонна', render: (r) => r.motorcadeName },
  { key: 'count', label: 'ДТП', align: 'center', render: (r) => formatNumber(r.count) },
  { key: 'sumDamage', label: 'Ущерб', align: 'center', render: (r) => formatCurrency(r.sumDamage) },
  {
    key: 'driverFaultShare',
    label: 'Доля «вина водителя»',
    align: 'center',
    render: (r) => formatPercent(r.driverFaultShare),
  },
]

export function AnalyticsTables({ data, period }: AnalyticsTablesProps) {
  const periodLabel = formatPeriodLabel(period)

  const summaryColumns: DataTableColumn<SummaryRow>[] = [
    { key: 'label', label: 'Показатель', render: (r) => r.label },
    {
      key: 'valueA',
      label: data.a.name,
      align: 'center',
      render: (r) => formatByKind(r.kind, r.valueA),
    },
    {
      key: 'valueB',
      label: data.b.name,
      align: 'center',
      render: (r) => formatByKind(r.kind, r.valueB),
    },
    {
      key: 'diff',
      label: 'Разница',
      align: 'center',
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
        initialLimit={data.worstDrivers.length}
        onRowClick={(r) =>
          drilldownStore.open(`${r.name} — ${r.motorcadeName}, ${periodLabel}`, r.rows)
        }
      />
    </div>
  )
}
