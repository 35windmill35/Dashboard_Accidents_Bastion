import type { AccidentRow } from '@/entities/accident/model/types'
import type { Period } from '@/entities/accident/lib/period'
import { groupByMotorcade, compareByCountThenDamage } from '@/entities/accident/lib/metrics'
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
  return { ...scope, motorcadeAgg }
}
