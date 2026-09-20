import type { AccidentRow } from '@/entities/accident/model/types'
import {
  type Period,
  isInPeriod,
  getPreviousPeriod,
  getTrendMonths,
} from '@/entities/accident/lib/period'
import {
  countAccidents,
  sumDamage,
  sumCompensated,
  compensationShare,
  averageDamagePerAccident,
  buildCauseSlices,
  causeCategoryShare,
  rankDrivers,
  rankVehicles,
  monthlyTrend,
  type CauseSlice,
} from '@/entities/accident/lib/metrics'

export interface MotorcadeKpi {
  count: number
  sumDamage: number
  sumCompensated: number
  compensationShare: number | null
  averageDamage: number | null
  driverFaultShare: number | null
  thirdPartyFaultShare: number | null
  noDamageShare: number | null
}

export interface MotorcadeData {
  periodRows: AccidentRow[]
  kpi: MotorcadeKpi
  previousKpi: MotorcadeKpi | null
  causeSlices: CauseSlice[]
  driversRanking: ReturnType<typeof rankDrivers>
  vehiclesRanking: ReturnType<typeof rankVehicles>
  monthlyCounts: ReturnType<typeof monthlyTrend>
}

function buildKpi(rows: AccidentRow[], slices: CauseSlice[]): MotorcadeKpi {
  const total = rows.length

  return {
    count: countAccidents(rows),
    sumDamage: sumDamage(rows),
    sumCompensated: sumCompensated(rows),
    compensationShare: compensationShare(rows),
    averageDamage: averageDamagePerAccident(rows),
    driverFaultShare: causeCategoryShare(slices, total, 'driverFault'),
    thirdPartyFaultShare: causeCategoryShare(slices, total, 'thirdPartyFault'),
    noDamageShare: causeCategoryShare(slices, total, 'noDamage'),
  }
}

// motorcadeRows на входе — уже отфильтрованы по выбранной автоколонне (см.
// MotorcadePage, getMotorcadeKey), но не по периоду — период фильтруется
// здесь так же, как на "Обзоре" (см. overviewData.ts).
export function computeMotorcade(motorcadeRows: AccidentRow[], period: Period): MotorcadeData {
  const periodRows = motorcadeRows.filter((row) => isInPeriod(row, period))
  const causeSlices = buildCauseSlices(periodRows)

  const previousPeriod = getPreviousPeriod(period)
  const previousRows = previousPeriod
    ? motorcadeRows.filter((row) => isInPeriod(row, previousPeriod))
    : null

  const trendMonths = getTrendMonths(period, motorcadeRows)

  return {
    periodRows,
    kpi: buildKpi(periodRows, causeSlices),
    previousKpi: previousRows ? buildKpi(previousRows, buildCauseSlices(previousRows)) : null,
    causeSlices,
    driversRanking: rankDrivers(periodRows),
    vehiclesRanking: rankVehicles(periodRows),
    monthlyCounts: monthlyTrend(motorcadeRows, trendMonths),
  }
}
