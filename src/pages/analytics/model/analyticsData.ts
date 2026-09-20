import type { AccidentRow } from '@/entities/accident/model/types'
import { type Period, getTrendMonths } from '@/entities/accident/lib/period'
import { computeAccidentScope, type AccidentScopeData } from '@/entities/accident/lib/scope'
import {
  buildCauseSlices,
  causeCategoryShare,
  driversWithThreeOrMoreAccidents,
  monthlyTrend,
  type DriverAggregate,
  type MonthlyAggregate,
} from '@/entities/accident/lib/metrics'
import type { CauseCategory } from '@/shared/config/accidentCauses'

export interface AnalyticsSide {
  key: string
  name: string
  scope: AccidentScopeData
  repeatDriversCount: number
}

export type SummaryMetricKind = 'count' | 'currency' | 'percent'

export interface SummaryRow {
  key: string
  label: string
  kind: SummaryMetricKind
  valueA: number | null
  valueB: number | null
}

export interface CauseComparisonRow {
  category: CauseCategory
  label: string
  shareA: number | null
  shareB: number | null
  rowsA: AccidentRow[]
  rowsB: AccidentRow[]
}

export interface WorstDriverRow {
  rank: number
  key: string
  name: string
  motorcadeName: string
  count: number
  sumDamage: number
  driverFaultShare: number | null
  rows: AccidentRow[]
}

export interface AnalyticsData {
  a: AnalyticsSide
  b: AnalyticsSide
  // Общая ось X для трёх линейных графиков динамики — считается по
  // объединению строк обеих автоколонн, а не по scope.monthlyCounts каждой
  // стороны отдельно: при периоде "весь период" у автоколонн может быть
  // разный диапазон дат, а графики сравнения требуют одну и ту же ось.
  trendMonths: number[]
  monthlyA: MonthlyAggregate[]
  monthlyB: MonthlyAggregate[]
  causeComparison: CauseComparisonRow[]
  summaryRows: SummaryRow[]
  worstDrivers: WorstDriverRow[]
}

function buildSide(key: string, name: string, rows: AccidentRow[], period: Period): AnalyticsSide {
  const scope = computeAccidentScope(rows, period)
  return {
    key,
    name,
    scope,
    repeatDriversCount: driversWithThreeOrMoreAccidents(scope.periodRows),
  }
}

// Доля "вина водителя" для конкретного водителя — та же формула, что и
// KPI-доли по автоколонне (causeCategoryShare), но по строкам одного
// водителя.
function driverFaultShareOf(driver: DriverAggregate): number | null {
  const slices = buildCauseSlices(driver.rows)
  return causeCategoryShare(slices, driver.count, 'driverFault')
}

// Топ-10 худших водителей сразу по обеим автоколоннам — объединяем оба
// рейтинга и берём топ по количеству ДТП.
function buildWorstDrivers(a: AnalyticsSide, b: AnalyticsSide): WorstDriverRow[] {
  const combined = [
    ...a.scope.driversRanking.map((driver) => ({ driver, motorcadeName: a.name })),
    ...b.scope.driversRanking.map((driver) => ({ driver, motorcadeName: b.name })),
  ]

  return combined
    .sort((x, y) => y.driver.count - x.driver.count)
    .slice(0, 10)
    .map(({ driver, motorcadeName }, index) => ({
      rank: index + 1,
      key: `${motorcadeName}:${driver.key}`,
      name: driver.name,
      motorcadeName,
      count: driver.count,
      sumDamage: driver.sumDamage,
      driverFaultShare: driverFaultShareOf(driver),
      rows: driver.rows,
    }))
}

// Доли причин ДТП для обеих автоколонн бок о бок — причины у обеих сторон
// всегда в одном порядке (см. CAUSE_ORDER в buildCauseSlices), поэтому
// массивы можно сопоставлять по индексу.
function buildCauseComparison(a: AnalyticsSide, b: AnalyticsSide): CauseComparisonRow[] {
  return a.scope.causeSlices.map((sliceA, index) => {
    const sliceB = b.scope.causeSlices[index]
    return {
      category: sliceA.category,
      label: sliceA.label,
      shareA: causeCategoryShare(a.scope.causeSlices, a.scope.kpi.count, sliceA.category),
      shareB: causeCategoryShare(b.scope.causeSlices, b.scope.kpi.count, sliceA.category),
      rowsA: sliceA.rows,
      rowsB: sliceB.rows,
    }
  })
}

function buildSummaryRows(a: AnalyticsSide, b: AnalyticsSide): SummaryRow[] {
  return [
    {
      key: 'count',
      label: 'Количество ДТП',
      kind: 'count',
      valueA: a.scope.kpi.count,
      valueB: b.scope.kpi.count,
    },
    {
      key: 'sumDamage',
      label: 'Сумма ущерба',
      kind: 'currency',
      valueA: a.scope.kpi.sumDamage,
      valueB: b.scope.kpi.sumDamage,
    },
    {
      key: 'compensationShare',
      label: 'Доля возмещения',
      kind: 'percent',
      valueA: a.scope.kpi.compensationShare,
      valueB: b.scope.kpi.compensationShare,
    },
    {
      key: 'averageDamage',
      label: 'Средний ущерб на 1 ДТП',
      kind: 'currency',
      valueA: a.scope.kpi.averageDamage,
      valueB: b.scope.kpi.averageDamage,
    },
  ]
}

// rowsA/rowsB — уже отфильтрованы по своей автоколонне (см. AnalyticsPage,
// getMotorcadeKey), но не по периоду — период применяется здесь же, как на
// "Автоколонне" (computeAccidentScope).
export function computeAnalytics(
  keyA: string,
  nameA: string,
  rowsA: AccidentRow[],
  keyB: string,
  nameB: string,
  rowsB: AccidentRow[],
  period: Period
): AnalyticsData {
  const a = buildSide(keyA, nameA, rowsA, period)
  const b = buildSide(keyB, nameB, rowsB, period)

  const trendMonths = getTrendMonths(period, [...rowsA, ...rowsB])

  return {
    a,
    b,
    trendMonths,
    monthlyA: monthlyTrend(rowsA, trendMonths),
    monthlyB: monthlyTrend(rowsB, trendMonths),
    causeComparison: buildCauseComparison(a, b),
    summaryRows: buildSummaryRows(a, b),
    worstDrivers: buildWorstDrivers(a, b),
  }
}
