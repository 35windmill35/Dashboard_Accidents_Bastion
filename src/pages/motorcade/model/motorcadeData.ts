// Расчёт вынесен в entities/accident/lib/scope.ts (общий с "Аналитикой",
// которой нужен тот же расчёт сразу для двух автоколонн) — здесь только
// псевдонимы под именование этого экрана.
export { computeAccidentScope as computeMotorcade } from '@/entities/accident/lib/scope'
export type {
  AccidentScopeData as MotorcadeData,
  AccidentScopeKpi as MotorcadeKpi,
} from '@/entities/accident/lib/scope'
