import type { AccidentRow } from '@/entities/accident/model/types'
import { type Period, getTrendMonths } from '@/entities/accident/lib/period'
import { computeAccidentScope, type AccidentScopeData } from '@/entities/accident/lib/scope'
import {
  buildCauseSlices,
  causeCategoryShare,
  compareByCountThenDamage,
  driversWithThreeOrMoreAccidents,
  monthlyTrend,
  type DriverAggregate,
  type MonthlyAggregate,
} from '@/entities/accident/lib/metrics'
import { t } from '@/shared/i18n'
import type { CauseCategory } from '@/shared/config/accidentCauses'

export interface AnalyticsSide {
  key: string
  name: string
  dbIndex: number
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
  // Колонка скрыта по решению заказчика
  comment: string
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
  // Общая ось X по строкам обеих автоколонн
  trendMonths: number[]
  monthlyA: MonthlyAggregate[]
  monthlyB: MonthlyAggregate[]
  causeComparison: CauseComparisonRow[]
  summaryRows: SummaryRow[]
  worstDrivers: WorstDriverRow[]
  comparabilityWarnings: string[]
}

// Ниже — доли и средние слишком шумные
export const MIN_COMPARABLE_SAMPLE = 10
const SCALE_GAP_RATIO = 3

function buildSide(
  key: string,
  name: string,
  dbIndex: number,
  rows: AccidentRow[],
  period: Period
): AnalyticsSide {
  const scope = computeAccidentScope(rows, period)
  return {
    key,
    name,
    dbIndex,
    scope,
    repeatDriversCount: driversWithThreeOrMoreAccidents(scope.periodRows),
  }
}

function driverFaultShareOf(driver: DriverAggregate): number | null {
  const slices = buildCauseSlices(driver.rows)
  return causeCategoryShare(slices, driver.count, 'driverFault')
}

// Без строки «Водитель не указан»
function buildWorstDrivers(a: AnalyticsSide, b: AnalyticsSide): WorstDriverRow[] {
  const combined = [a, b].flatMap((side) =>
    side.scope.driversRanking
      .filter((driver) => driver.key !== 'unknown')
      .map((driver) => ({ driver, motorcadeName: side.name }))
  )

  return combined
    .sort((x, y) => compareByCountThenDamage(x.driver, y.driver))
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

// Порядок категорий у обеих сторон одинаковый — сопоставляем по индексу
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

// Размера парка и пробега в данных нет
const SCALE_DEPENDENT_COMMENT = t('roadAccidents.analytics.comment.scaleDependent')

function describeSmallSides(sides: AnalyticsSide[]): string {
  return sides.map((side) => `${side.name}: ${side.scope.kpi.count}`).join(', ')
}

function relativeComment(
  a: AnalyticsSide,
  b: AnalyticsSide,
  valueA: number | null,
  valueB: number | null
): string {
  if (valueA === null || valueB === null) return t('roadAccidents.analytics.comment.noData')
  const small = [a, b].filter((side) => side.scope.kpi.count < MIN_COMPARABLE_SAMPLE)
  if (small.length > 0) {
    return t('roadAccidents.analytics.comment.smallSample', { sides: describeSmallSides(small) })
  }
  return t('roadAccidents.analytics.comment.comparable')
}

function buildSummaryRows(a: AnalyticsSide, b: AnalyticsSide): SummaryRow[] {
  const ka = a.scope.kpi
  const kb = b.scope.kpi
  return [
    {
      key: 'count',
      label: t('roadAccidents.kpi.accidentCount'),
      kind: 'count',
      valueA: ka.count,
      valueB: kb.count,
      comment: SCALE_DEPENDENT_COMMENT,
    },
    {
      key: 'sumDamage',
      label: t('roadAccidents.kpi.damageSum'),
      kind: 'currency',
      valueA: ka.sumDamage,
      valueB: kb.sumDamage,
      comment: SCALE_DEPENDENT_COMMENT,
    },
    {
      key: 'compensationShare',
      label: t('roadAccidents.kpi.compensationShare'),
      kind: 'percent',
      valueA: ka.compensationShare,
      valueB: kb.compensationShare,
      comment: relativeComment(a, b, ka.compensationShare, kb.compensationShare),
    },
    {
      key: 'averageDamage',
      label: t('roadAccidents.kpi.averageDamage'),
      kind: 'currency',
      valueA: ka.averageDamage,
      valueB: kb.averageDamage,
      comment: relativeComment(a, b, ka.averageDamage, kb.averageDamage),
    },
  ]
}

function currencyCodesOf(rows: AccidentRow[]): string[] {
  const codes = new Set<string>()
  rows.forEach((row) => {
    const code = row.CURRENCY_CODE?.trim()
    if (code) codes.add(code)
  })
  return Array.from(codes).sort()
}

function buildComparabilityWarnings(a: AnalyticsSide, b: AnalyticsSide): string[] {
  const warnings = [t('roadAccidents.analytics.warning.notNormalized')]

  const countA = a.scope.kpi.count
  const countB = b.scope.kpi.count
  const min = Math.min(countA, countB)
  const max = Math.max(countA, countB)
  if (min > 0 && max / min >= SCALE_GAP_RATIO) {
    warnings.push(
      t('roadAccidents.analytics.warning.scaleGap', {
        ratio: Math.round((max / min) * 10) / 10,
        a: a.name,
        countA: countA,
        b: b.name,
        countB: countB,
      })
    )
  }

  const small = [a, b].filter((side) => side.scope.kpi.count < MIN_COMPARABLE_SAMPLE)
  if (small.length > 0) {
    warnings.push(
      t('roadAccidents.analytics.warning.smallSample', { sides: describeSmallSides(small) })
    )
  }

  if (a.dbIndex !== b.dbIndex) {
    warnings.push(t('roadAccidents.analytics.warning.differentBases'))
  }

  const currencies = currencyCodesOf([...a.scope.periodRows, ...b.scope.periodRows])
  if (currencies.length > 1) {
    warnings.push(
      t('roadAccidents.analytics.warning.currencies', { currencies: currencies.join(', ') })
    )
  }

  return warnings
}

// Строки отфильтрованы по автоколонне, но не по периоду
export interface AnalyticsSideInput {
  key: string
  name: string
  dbIndex: number
  rows: AccidentRow[]
}

export function computeAnalytics(
  inputA: AnalyticsSideInput,
  inputB: AnalyticsSideInput,
  period: Period
): AnalyticsData {
  const rowsA = inputA.rows
  const rowsB = inputB.rows
  const a = buildSide(inputA.key, inputA.name, inputA.dbIndex, rowsA, period)
  const b = buildSide(inputB.key, inputB.name, inputB.dbIndex, rowsB, period)

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
    comparabilityWarnings: buildComparabilityWarnings(a, b),
  }
}
