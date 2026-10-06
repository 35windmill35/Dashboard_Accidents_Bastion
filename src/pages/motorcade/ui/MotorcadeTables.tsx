import { DataTable, type DataTableColumn } from '@/widgets/data-table/DataTable'
import { drilldownStore } from '@/widgets/accident-drilldown/model/drilldownStore'
import { formatCurrency, formatNumber } from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { t } from '@/shared/i18n'
import type { DriverAggregate, VehicleAggregate, CauseSlice } from '@/entities/accident/lib/metrics'
import type { MotorcadeData } from '../model/motorcadeData'
import styles from './MotorcadeTables.module.css'

interface MotorcadeTablesProps {
  data: MotorcadeData
  period: Period
}

const driverColumns: DataTableColumn<DriverAggregate>[] = [
  {
    key: 'name',
    label: t('roadAccidents.common.driver'),
    grow: true,
    render: (r) => r.name,
    title: (r) => r.name,
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
]

const vehicleColumns: DataTableColumn<VehicleAggregate>[] = [
  {
    key: 'name',
    label: t('roadAccidents.common.vehicle'),
    grow: true,
    render: (r) => r.name,
    title: (r) => r.name,
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
]

const causeColumns: DataTableColumn<CauseSlice>[] = [
  {
    key: 'label',
    label: t('roadAccidents.common.category'),
    grow: true,
    wrap: true,
    render: (r) => r.label,
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
    key: 'sumCompensated',
    label: t('roadAccidents.common.compensation'),
    align: 'right',
    render: (r) => formatCurrency(r.sumCompensated),
  },
]

export function MotorcadeTables({ data, period }: MotorcadeTablesProps) {
  const periodLabel = formatPeriodLabel(period)

  return (
    <div className={styles.grid}>
      <DataTable
        title={t('roadAccidents.table.topDrivers', { count: 8 })}
        columns={driverColumns}
        rows={data.driversRanking}
        getRowKey={(r) => r.key}
        showRank
        onRowClick={(r) => drilldownStore.open(`${r.name} — ${periodLabel}`, r.rows)}
      />
      <DataTable
        title={t('roadAccidents.table.topVehicles', { count: 8 })}
        columns={vehicleColumns}
        rows={data.vehiclesRanking}
        getRowKey={(r) => r.key}
        showRank
        onRowClick={(r) => drilldownStore.open(`${r.name} — ${periodLabel}`, r.rows)}
      />
      <div className={styles.fullRow}>
        <DataTable
          title={t('roadAccidents.chart.damageByCause')}
          columns={causeColumns}
          rows={data.causeSlices}
          getRowKey={(r) => r.category}
          initialLimit={5}
          onRowClick={(r) => drilldownStore.open(`${r.label} — ${periodLabel}`, r.rows)}
        />
      </div>
    </div>
  )
}
