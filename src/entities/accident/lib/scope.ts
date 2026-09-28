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
  buildCauseSlices,
  causeCategoryShare,
  rankDrivers,
  rankVehicles,
  monthlyTrend,
  type CauseSlice,
} from './metrics'

// Единый расчёт показателей среза ДТП за период — для «Обзора» (вся
// компания), «Статистики по автоколонне» (одна автоколонна) и «Аналитики»
// (две автоколонны рядом). Один расчёт на все экраны — цифры не могут
// разойтись между ними.
export interface AccidentScopeKpi {
  count: number
  sumDamage: number
  sumCompensated: number
  compensationShare: number | null
  averageDamage: number | null
  driverFaultShare: number | null
  thirdPartyFaultShare: number | null
  noDamageShare: number | null
}

export interface AccidentScopeData {
  periodRows: AccidentRow[]
  kpi: AccidentScopeKpi
  // KPI периода сравнения; для незавершённого периода — за то же число
  // дней от начала (см. comparison)
  previousKpi: AccidentScopeKpi | null
  comparison: PeriodComparison
  causeSlices: CauseSlice[]
  driversRanking: ReturnType<typeof rankDrivers>
  vehiclesRanking: ReturnType<typeof rankVehicles>
  monthlyCounts: ReturnType<typeof monthlyTrend>
}

function buildScopeKpi(rows: AccidentRow[], slices: CauseSlice[]): AccidentScopeKpi {
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

// scopeRows на входе — уже отфильтрованы по нужному подмножеству (одна
// автоколонна и т.п.), но не по периоду — период фильтруется здесь.
export function computeAccidentScope(
  scopeRows: AccidentRow[],
  period: Period,
  today: Date = new Date()
): AccidentScopeData {
  const periodRows = scopeRows.filter((row) => isInPeriod(row, period))
  const causeSlices = buildCauseSlices(periodRows)

  const comparison = getPeriodComparison(period, today)
  const previousRows = comparison.previous
    ? scopeRows.filter((row) => isInComparisonWindow(row, comparison))
    : null

  const trendMonths = getTrendMonths(period, scopeRows)

  return {
    periodRows,
    kpi: buildScopeKpi(periodRows, causeSlices),
    previousKpi: previousRows ? buildScopeKpi(previousRows, buildCauseSlices(previousRows)) : null,
    comparison,
    causeSlices,
    driversRanking: rankDrivers(periodRows),
    vehiclesRanking: rankVehicles(periodRows),
    monthlyCounts: monthlyTrend(scopeRows, trendMonths),
  }
}
