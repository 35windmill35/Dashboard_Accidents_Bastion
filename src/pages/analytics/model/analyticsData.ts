import type { AccidentRow } from '@/entities/accident/model/types'
import { type Period, getTrendMonths } from '@/entities/accident/lib/period'
import { computeAccidentScope, type AccidentScopeData } from '@/entities/accident/lib/scope'
import {
  causerShare,
  OTHER_SLICE_KEY,
  compareByCountThenDamage,
  driversWithThreeOrMoreAccidents,
  monthlyTrend,
  type BreakdownSlice,
  type DriverAggregate,
  type MonthlyAggregate,
} from '@/entities/accident/lib/metrics'
import { t } from '@/shared/i18n'

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

export interface BreakdownComparisonRow {
  key: string
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
  causeComparison: BreakdownComparisonRow[]
  causerComparison: BreakdownComparisonRow[]
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
  return causerShare(driver.rows, 'ownDriver')
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

const COMPARISON_SLOTS = 6

// Общий топ по сумме ДТП обеих сторон; хвост — в «Прочие»
function buildBreakdownComparison(
  slicesA: BreakdownSlice[],
  slicesB: BreakdownSlice[],
  totalA: number,
  totalB: number
): BreakdownComparisonRow[] {
  const merged = new Map<string, BreakdownComparisonRow & { count: number; sumDamage: number }>()
  const add = (slice: BreakdownSlice, side: 'rowsA' | 'rowsB') => {
    const row = merged.get(slice.key) ?? {
      key: slice.key,
      label: slice.label,
      shareA: null,
      shareB: null,
      rowsA: [],
      rowsB: [],
      count: 0,
      sumDamage: 0,
    }
    row[side] = slice.rows
    row.count += slice.count
    row.sumDamage += slice.sumDamage
    merged.set(slice.key, row)
  }
  slicesA.forEach((slice) => add(slice, 'rowsA'))
  slicesB.forEach((slice) => add(slice, 'rowsB'))

  const ordered = Array.from(merged.values()).sort((x, y) =>
    compareByCountThenDamage({ ...x, name: x.label }, { ...y, name: y.label })
  )
  const head = ordered.length > COMPARISON_SLOTS ? ordered.slice(0, COMPARISON_SLOTS - 1) : ordered
  const tail = ordered.slice(head.length)
  const rows: BreakdownComparisonRow[] = head.map(({ key, label, rowsA, rowsB }) => ({
    key,
    label,
    shareA: null,
    shareB: null,
    rowsA,
    rowsB,
  }))
  if (tail.length > 0) {
    rows.push({
      key: OTHER_SLICE_KEY,
      label: t('roadAccidents.common.other'),
      shareA: null,
      shareB: null,
      rowsA: tail.flatMap((row) => row.rowsA),
      rowsB: tail.flatMap((row) => row.rowsB),
    })
  }

  return rows.map((row) => ({
    ...row,
    shareA: totalA > 0 ? row.rowsA.length / totalA : null,
    shareB: totalB > 0 ? row.rowsB.length / totalB : null,
  }))
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
    causeComparison: buildBreakdownComparison(
      a.scope.causeSlices,
      b.scope.causeSlices,
      a.scope.kpi.count,
      b.scope.kpi.count
    ),
    causerComparison: buildBreakdownComparison(
      a.scope.causerSlices,
      b.scope.causerSlices,
      a.scope.kpi.count,
      b.scope.kpi.count
    ),
    summaryRows: buildSummaryRows(a, b),
    worstDrivers: buildWorstDrivers(a, b),
    comparabilityWarnings: buildComparabilityWarnings(a, b),
  }
}
