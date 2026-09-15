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
} from '@/entities/accident/lib/metrics'
import {
  countAccidents,
  sumDamage,
  sumCompensated,
  compensationShare,
  averageDamagePerAccident,
  groupByCauseCategory,
} from '@/entities/accident/lib/metrics'
import { CAUSE_CATEGORY_LABELS, type CauseCategory } from '@/shared/config/accidentCauses'

export interface OverviewKpi {
  count: number
  sumDamage: number
  sumCompensated: number
  compensationShare: number | null
  averageDamage: number | null
}

export interface CauseSlice {
  category: CauseCategory
  label: string
  count: number
  sumDamage: number
  sumCompensated: number
  rows: AccidentRow[]
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

const CAUSE_ORDER: CauseCategory[] = [
  'driverFault',
  'thirdPartyFault',
  'noDamage',
  'undetermined',
  'underReview',
]

export function computeOverview(allRows: AccidentRow[], period: Period): OverviewData {
  const periodRows = allRows.filter((row) => isInPeriod(row, period))

  const previousPeriod = getPreviousPeriod(period)
  const previousRows = previousPeriod
    ? allRows.filter((row) => isInPeriod(row, previousPeriod))
    : null

  const grouped = groupByCauseCategory(periodRows)
  const causeSlices: CauseSlice[] = CAUSE_ORDER.map((category) => {
    const rows = grouped[category]
    return {
      category,
      label: CAUSE_CATEGORY_LABELS[category],
      count: rows.length,
      sumDamage: sumDamage(rows),
      sumCompensated: sumCompensated(rows),
      rows,
    }
  })

  const trendMonths = getTrendMonths(period, allRows)

  return {
    periodRows,
    kpi: buildKpi(periodRows),
    previousKpi: previousRows ? buildKpi(previousRows) : null,
    causeSlices,
    motorcadeAgg: groupByMotorcade(periodRows).sort((a, b) => b.count - a.count),
    driversRanking: rankDrivers(periodRows),
    vehiclesRanking: rankVehicles(periodRows),
    monthlyCounts: monthlyTrend(allRows, trendMonths),
  }
}
