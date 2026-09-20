import type { AccidentRow } from '@/entities/accident/model/types'
import {
  type Period,
  isInPeriod,
  getPreviousPeriod,
  getTrendMonths,
} from '@/entities/accident/lib/period'
import {
  groupByMotorcade,
  rankDrivers,
  rankVehicles,
  monthlyTrend,
  buildCauseSlices,
  type CauseSlice,
} from '@/entities/accident/lib/metrics'
import {
  countAccidents,
  sumDamage,
  sumCompensated,
  compensationShare,
  averageDamagePerAccident,
} from '@/entities/accident/lib/metrics'

// Реэкспорт — тип общий с "Автоколонной" (см. entities/accident/lib/metrics),
// но здесь он давно на виду у остального кода экрана "Обзор".
export type { CauseSlice } from '@/entities/accident/lib/metrics'

export interface OverviewKpi {
  count: number
  sumDamage: number
  sumCompensated: number
  compensationShare: number | null
  averageDamage: number | null
}

export interface OverviewData {
  periodRows: AccidentRow[]
  kpi: OverviewKpi
  previousKpi: OverviewKpi | null
  causeSlices: CauseSlice[]
  motorcadeAgg: ReturnType<typeof groupByMotorcade>
  driversRanking: ReturnType<typeof rankDrivers>
  vehiclesRanking: ReturnType<typeof rankVehicles>
  monthlyCounts: ReturnType<typeof monthlyTrend>
}

function buildKpi(rows: AccidentRow[]): OverviewKpi {
  return {
    count: countAccidents(rows),
    sumDamage: sumDamage(rows),
    sumCompensated: sumCompensated(rows),
    compensationShare: compensationShare(rows),
    averageDamage: averageDamagePerAccident(rows),
  }
}

export function computeOverview(allRows: AccidentRow[], period: Period): OverviewData {
  const periodRows = allRows.filter((row) => isInPeriod(row, period))

  const previousPeriod = getPreviousPeriod(period)
  const previousRows = previousPeriod
    ? allRows.filter((row) => isInPeriod(row, previousPeriod))
    : null

  const trendMonths = getTrendMonths(period, allRows)

  return {
    periodRows,
    kpi: buildKpi(periodRows),
    previousKpi: previousRows ? buildKpi(previousRows) : null,
    causeSlices: buildCauseSlices(periodRows),
    motorcadeAgg: groupByMotorcade(periodRows).sort((a, b) => b.count - a.count),
    driversRanking: rankDrivers(periodRows),
    vehiclesRanking: rankVehicles(periodRows),
    monthlyCounts: monthlyTrend(allRows, trendMonths),
  }
}
