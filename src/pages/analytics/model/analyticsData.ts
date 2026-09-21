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
  // "Комментарий о сопоставимости" (ТЗ §4.5) — колонка временно скрыта
  // по решению заказчика (экран и PDF), значение по-прежнему считается
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
  // Предупреждения о сопоставимости — баннер на экране и в PDF (ТЗ §4.5, §6)
  comparabilityWarnings: string[]
}

// Меньше этого числа ДТП за период доли и средние слишком шумные, чтобы
// делать по ним выводы.
export const MIN_COMPARABLE_SAMPLE = 10
// Во сколько раз должно различаться число ДТП, чтобы суммы уже нельзя было
// сравнивать "в лоб".
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

// Размера парка и пробега в данных нет — абсолютные числа не нормированы.
const SCALE_DEPENDENT_COMMENT = 'Зависит от размера парка — не сравнивать'

// Комментарий для относительных показателей (доли, средние): сопоставимы,
// если у обеих сторон достаточно ДТП и есть знаменатель.
function relativeComment(
  a: AnalyticsSide,
  b: AnalyticsSide,
  valueA: number | null,
  valueB: number | null
): string {
  if (valueA === null || valueB === null) return 'Нет данных для расчёта у одной из сторон'
  const small = [a, b].filter((side) => side.scope.kpi.count < MIN_COMPARABLE_SAMPLE)
  if (small.length > 0) {
    return `Мало ДТП (${small.map((side) => `${side.name}: ${side.scope.kpi.count}`).join(', ')}) — неустойчиво`
  }
  return 'Сопоставимо (относительный показатель)'
}

function buildSummaryRows(a: AnalyticsSide, b: AnalyticsSide): SummaryRow[] {
  const ka = a.scope.kpi
  const kb = b.scope.kpi
  return [
    {
      key: 'count',
      label: 'Количество ДТП',
      kind: 'count',
      valueA: ka.count,
      valueB: kb.count,
      comment: SCALE_DEPENDENT_COMMENT,
    },
    {
      key: 'sumDamage',
      label: 'Сумма ущерба',
      kind: 'currency',
      valueA: ka.sumDamage,
      valueB: kb.sumDamage,
      comment: SCALE_DEPENDENT_COMMENT,
    },
    {
      key: 'compensationShare',
      label: 'Доля возмещения',
      kind: 'percent',
      valueA: ka.compensationShare,
      valueB: kb.compensationShare,
      comment: relativeComment(a, b, ka.compensationShare, kb.compensationShare),
    },
    {
      key: 'averageDamage',
      label: 'Средний ущерб на 1 ДТП',
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

// Почему сравнение двух автоколонн может вводить в заблуждение. Первая
// строка — всегда: размера парка/пробега в данных нет, поэтому абсолютные
// числа (ДТП, суммы) не нормированы.
function buildComparabilityWarnings(a: AnalyticsSide, b: AnalyticsSide): string[] {
  const warnings = [
    'Количество ДТП и суммы не нормированы на размер парка и пробег — для сравнения используйте доли и средние.',
  ]

  const countA = a.scope.kpi.count
  const countB = b.scope.kpi.count
  const min = Math.min(countA, countB)
  const max = Math.max(countA, countB)
  if (min > 0 && max / min >= SCALE_GAP_RATIO) {
    warnings.push(
      `Число ДТП различается в ${Math.round((max / min) * 10) / 10} раза (${a.name}: ${countA}, ${b.name}: ${countB}) — автоколонны разного масштаба.`
    )
  }

  const small = [a, b].filter((side) => side.scope.kpi.count < MIN_COMPARABLE_SAMPLE)
  if (small.length > 0) {
    warnings.push(
      `Мало ДТП за период (${small.map((side) => `${side.name}: ${side.scope.kpi.count}`).join(', ')}) — доли и средние неустойчивы, выводы делать рано.`
    )
  }

  if (a.dbIndex !== b.dbIndex) {
    warnings.push(
      'Автоколонны из разных баз — справочники причин и правила заполнения могут отличаться.'
    )
  }

  const currencies = currencyCodesOf([...a.scope.periodRows, ...b.scope.periodRows])
  if (currencies.length > 1) {
    warnings.push(
      `Суммы в разных валютах (${currencies.join(', ')}) — денежные показатели не сравнимы.`
    )
  }

  return warnings
}

// rowsA/rowsB — уже отфильтрованы по своей автоколонне (см. AnalyticsPage,
// getMotorcadeKey), но не по периоду — период применяется здесь же, как на
// "Автоколонне" (computeAccidentScope).
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
