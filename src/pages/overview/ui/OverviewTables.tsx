import { DataTable, type DataTableColumn } from '@/widgets/data-table/DataTable'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatCurrency, formatNumber } from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import type { DriverAggregate, VehicleAggregate } from '@/entities/accident/lib/metrics'
import type { CauseSlice, OverviewData } from '../model/overviewData'
import styles from './OverviewTables.module.css'

interface OverviewTablesProps {
  data: OverviewData
  period: Period
}

const driverColumns: DataTableColumn<DriverAggregate>[] = [
  { key: 'name', label: 'Водитель', render: (r) => r.name },
  { key: 'count', label: 'ДТП', align: 'right', render: (r) => formatNumber(r.count) },
  { key: 'sumDamage', label: 'Ущерб', align: 'right', render: (r) => formatCurrency(r.sumDamage) },
]

const vehicleColumns: DataTableColumn<VehicleAggregate>[] = [
  { key: 'name', label: 'ТС', render: (r) => r.name },
  { key: 'count', label: 'ДТП', align: 'right', render: (r) => formatNumber(r.count) },
  { key: 'sumDamage', label: 'Ущерб', align: 'right', render: (r) => formatCurrency(r.sumDamage) },
]

const causeColumns: DataTableColumn<CauseSlice>[] = [
  { key: 'label', label: 'Категория', render: (r) => r.label },
  { key: 'count', label: 'ДТП', align: 'right', render: (r) => formatNumber(r.count) },
  { key: 'sumDamage', label: 'Ущерб', align: 'right', render: (r) => formatCurrency(r.sumDamage) },
  {
    key: 'sumCompensated',
    label: 'Возмещение',
    align: 'right',
    render: (r) => formatCurrency(r.sumCompensated),
  },
]

export function OverviewTables({ data, period }: OverviewTablesProps) {
  const periodLabel = formatPeriodLabel(period)

  return (
    <div className={styles.grid}>
      <DataTable
        title="Топ-8 водителей по числу ДТП"
        columns={driverColumns}
        rows={data.driversRanking}
        getRowKey={(r) => r.key}
        onRowClick={(r) => drilldownStore.open(`${r.name} — ${periodLabel}`, r.rows)}
      />
      <DataTable
        title="Топ-8 автобусов по числу ДТП"
        columns={vehicleColumns}
        rows={data.vehiclesRanking}
        getRowKey={(r) => r.key}
        onRowClick={(r) => drilldownStore.open(`${r.name} — ${periodLabel}`, r.rows)}
      />
      <DataTable
        title="Ущерб и возмещение по категориям причин"
        columns={causeColumns}
        rows={data.causeSlices}
        getRowKey={(r) => r.category}
        initialLimit={5}
        onRowClick={(r) => drilldownStore.open(`${r.label} — ${periodLabel}`, r.rows)}
      />
    </div>
  )
}
