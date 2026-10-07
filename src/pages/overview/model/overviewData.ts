import type { AccidentRow } from '@/entities/accident/model/types'
import type { Period } from '@/entities/accident/lib/period'
import {
  groupByMotorcade,
  compareByCountThenDamage,
  rankRoutes,
} from '@/entities/accident/lib/metrics'
import {
  computeAccidentScope,
  type AccidentScopeData,
  type AccidentScopeKpi,
} from '@/entities/accident/lib/scope'

export type OverviewKpi = AccidentScopeKpi

export interface OverviewData extends AccidentScopeData {
  motorcadeAgg: ReturnType<typeof groupByMotorcade>
}

export function computeOverview(
  allRows: AccidentRow[],
  period: Period,
  motorcadeLabels?: Map<string, string>,
  today: Date = new Date()
): OverviewData {
  const scope = computeAccidentScope(allRows, period, today)
  const motorcadeAgg = groupByMotorcade(scope.periodRows)
    .map((item) => ({ ...item, name: motorcadeLabels?.get(item.key) ?? item.name }))
    .sort(compareByCountThenDamage)
  // Подписи автоколонн у маршрутов — те же, что в остальных блоках обзора
  const routesRanking = rankRoutes(scope.periodRows, motorcadeLabels)
  return { ...scope, motorcadeAgg, routesRanking }
}
