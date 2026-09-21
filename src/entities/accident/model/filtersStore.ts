import { makeAutoObservable, reaction } from 'mobx'
import { accidentsStore } from './accidentsStore'
import { authStore } from '@/entities/user/model/authStore'
import { getAvailablePeriodValues, type Period, type PeriodMode } from '../lib/period'
import {
  getSelectableMotorcadeOptions,
  sortByAccidentCountDesc,
  sortByNameAsc,
  type MotorcadeOption,
} from '../lib/motorcade'

// Период общий для всех трёх экранов, автоколонны у каждого экрана свои
// (motorcadeKey — «Статистика по автоколонне», analyticsMotorcadeKeyA/B —
// «Аналитика»).
//
// Явный выбор пользователя хранится как есть, а "эффективное" значение
// (то, что реально на экране) считается геттерами: если выбора нет или он
// не существует в данных (опечатка в ссылке, другая учётка) — берётся
// значение по умолчанию. Так селектор в шапке и цифры на экране не могут
// разойтись (P0-2).
class FiltersStore {
  periodMode: PeriodMode = 'month'
  periodValue: number | null = null

  motorcadeKey: string | null = null

  analyticsMotorcadeKeyA: string | null = null
  analyticsMotorcadeKeyB: string | null = null

  constructor() {
    makeAutoObservable(this)

    reaction(
      () => authStore.sessionEpoch,
      () => this.reset()
    )
  }

  // Доступные значения для текущего режима, по убыванию.
  get periodValues(): number[] {
    return getAvailablePeriodValues(this.periodMode, accidentsStore.rows)
  }

  get period(): Period {
    const mode = this.periodMode
    if (mode === 'all') return { mode: 'all' }

    const values = this.periodValues
    const value =
      this.periodValue !== null && values.includes(this.periodValue) ? this.periodValue : values[0] // по умолчанию — последний период этого режима с данными

    // данных нет вовсе — показывать нечего, "весь период" даст пустой срез
    if (value === undefined) return { mode: 'all' }
    return { mode, value } as Period
  }

  // Смена режима сразу выбирает последний доступный период этого режима —
  // "Квартал" показывает квартал, а не месяц.
  setPeriodMode(mode: PeriodMode): void {
    if (mode === this.periodMode) return
    this.periodMode = mode
    this.periodValue = null
  }

  setPeriodValue(value: number): void {
    this.periodValue = value
  }

  setPeriod(period: Period): void {
    this.periodMode = period.mode
    this.periodValue = period.mode === 'all' ? null : period.value
  }

  get motorcadeOptions(): MotorcadeOption[] {
    return sortByNameAsc(getSelectableMotorcadeOptions(accidentsStore.rows))
  }

  private hasOption(key: string | null): key is string {
    return key !== null && this.motorcadeOptions.some((option) => option.key === key)
  }

  // по умолчанию — первая по алфавиту
  get selectedMotorcadeKey(): string | null {
    if (this.hasOption(this.motorcadeKey)) return this.motorcadeKey
    return this.motorcadeOptions[0]?.key ?? null
  }

  setMotorcadeKey(key: string): void {
    this.motorcadeKey = key
  }

  // по умолчанию — две крупнейшие по числу ДТП
  get analyticsDefaultKeys(): [string | null, string | null] {
    const byCount = sortByAccidentCountDesc(this.motorcadeOptions)
    return [byCount[0]?.key ?? null, byCount[1]?.key ?? null]
  }

  get selectedAnalyticsKeyA(): string | null {
    if (this.hasOption(this.analyticsMotorcadeKeyA)) return this.analyticsMotorcadeKeyA
    const [first, second] = this.analyticsDefaultKeys
    // явный выбор B мог совпасть с дефолтом A — тогда A берёт другую
    return this.hasOption(this.analyticsMotorcadeKeyB) && this.analyticsMotorcadeKeyB === first
      ? second
      : first
  }

  get selectedAnalyticsKeyB(): string | null {
    if (
      this.hasOption(this.analyticsMotorcadeKeyB) &&
      this.analyticsMotorcadeKeyB !== this.selectedAnalyticsKeyA
    ) {
      return this.analyticsMotorcadeKeyB
    }
    const keyA = this.selectedAnalyticsKeyA
    const fallback = sortByAccidentCountDesc(this.motorcadeOptions).find(
      (option) => option.key !== keyA
    )
    return fallback?.key ?? null
  }

  // выбор одинаковой автоколонны в обоих селекторах запрещён
  setAnalyticsMotorcadeA(key: string): void {
    if (key === this.selectedAnalyticsKeyB) return
    this.analyticsMotorcadeKeyA = key
  }

  setAnalyticsMotorcadeB(key: string): void {
    if (key === this.selectedAnalyticsKeyA) return
    this.analyticsMotorcadeKeyB = key
  }

  reset(): void {
    this.periodMode = 'month'
    this.periodValue = null
    this.motorcadeKey = null
    this.analyticsMotorcadeKeyA = null
    this.analyticsMotorcadeKeyB = null
  }
}

export const filtersStore = new FiltersStore()
