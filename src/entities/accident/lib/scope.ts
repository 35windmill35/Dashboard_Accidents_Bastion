import type { AccidentRow } from '../model/types'
import {
  type Period,
  type PeriodComparison,
  isInPeriod,
  isInComparisonWindow,
  getPeriodComparison,
  getTrendMonths,
} from './period'
import {
  countAccidents,
  sumDamage,
  sumCompensated,
  compensationShare,
  averageDamagePerAccident,
  groupByCause,
  groupByCauser,
  causerShare,
  rankDrivers,
  rankVehicles,
  rankRoutes,
  monthlyTrend,
  type BreakdownSlice,
} from './metrics'

// Единый расчёт показателей для всех трёх экранов
export interface AccidentScopeKpi {
  count: number
  sumDamage: number
  sumCompensated: number
  compensationShare: number | null
  averageDamage: number | null
  driverFaultShare: number | null
  thirdPartyFaultShare: number | null
}

export interface AccidentScopeData {
  periodRows: AccidentRow[]
  kpi: AccidentScopeKpi
  // Для незавершённого периода — за то же число дней
  previousKpi: AccidentScopeKpi | null
  comparison: PeriodComparison
  causeSlices: BreakdownSlice[]
  causerSlices: BreakdownSlice[]
  driversRanking: ReturnType<typeof rankDrivers>
  vehiclesRanking: ReturnType<typeof rankVehicles>
  routesRanking: ReturnType<typeof rankRoutes>
  monthlyCounts: ReturnType<typeof monthlyTrend>
}

function buildScopeKpi(rows: AccidentRow[]): AccidentScopeKpi {
  return {
    count: countAccidents(rows),
    sumDamage: sumDamage(rows),
    sumCompensated: sumCompensated(rows),
    compensationShare: compensationShare(rows),
    averageDamage: averageDamagePerAccident(rows),
    driverFaultShare: causerShare(rows, 'ownDriver'),
    thirdPartyFaultShare: causerShare(rows, 'otherParty'),
  }
}

// scopeRows уже отфильтрованы по подмножеству, но не по периоду
export function computeAccidentScope(
  scopeRows: AccidentRow[],
  period: Period,
  today: Date = new Date()
): AccidentScopeData {
  const periodRows = scopeRows.filter((row) => isInPeriod(row, period))

  const comparison = getPeriodComparison(period, today)
  const previousRows = comparison.previous
    ? scopeRows.filter((row) => isInComparisonWindow(row, comparison))
    : null

  const trendMonths = getTrendMonths(period, scopeRows)

  return {
    periodRows,
    kpi: buildScopeKpi(periodRows),
    previousKpi: previousRows ? buildScopeKpi(previousRows) : null,
    comparison,
    causeSlices: groupByCause(periodRows),
    causerSlices: groupByCauser(periodRows),
    driversRanking: rankDrivers(periodRows),
    vehiclesRanking: rankVehicles(periodRows),
    routesRanking: rankRoutes(periodRows),
    monthlyCounts: monthlyTrend(scopeRows, trendMonths),
  }
}
