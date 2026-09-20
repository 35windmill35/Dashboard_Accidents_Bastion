import type { AccidentRow } from '../model/types'
import { type Period, isInPeriod, getPreviousPeriod, getTrendMonths } from './period'
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

// Общий расчёт показателей одного среза (одна автоколонна за период) —
// используется и "Статистикой по автоколонне" (один срез), и "Аналитикой"
// (два среза рядом, для сравнения). Имя нейтральное (scope, а не
// motorcade), т.к. по сути это просто "метрики по произвольному
// подмножеству ДТП за период".
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
  previousKpi: AccidentScopeKpi | null
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
export function computeAccidentScope(scopeRows: AccidentRow[], period: Period): AccidentScopeData {
  const periodRows = scopeRows.filter((row) => isInPeriod(row, period))
  const causeSlices = buildCauseSlices(periodRows)

  const previousPeriod = getPreviousPeriod(period)
  const previousRows = previousPeriod
    ? scopeRows.filter((row) => isInPeriod(row, previousPeriod))
    : null

  const trendMonths = getTrendMonths(period, scopeRows)

  return {
    periodRows,
    kpi: buildScopeKpi(periodRows, causeSlices),
    previousKpi: previousRows ? buildScopeKpi(previousRows, buildCauseSlices(previousRows)) : null,
    causeSlices,
    driversRanking: rankDrivers(periodRows),
    vehiclesRanking: rankVehicles(periodRows),
    monthlyCounts: monthlyTrend(scopeRows, trendMonths),
  }
}
