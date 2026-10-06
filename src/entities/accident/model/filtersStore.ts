import { makeAutoObservable, reaction } from 'mobx'
import { accidentsStore } from './accidentsStore'
import { authStore } from '@/entities/user/model/authStore'
import { getAvailablePeriodValues, type Period, type PeriodMode } from '../lib/period'
import {
  disambiguateMotorcadeNames,
  getMotorcadeOptions,
  sortByAccidentCountDesc,
  sortByNameAsc,
  type MotorcadeOption,
} from '../lib/motorcade'

// Выбор пользователя хранится как есть, геттеры отдают эффективное значение
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

  get periodValues(): number[] {
    return getAvailablePeriodValues(this.periodMode, accidentsStore.rows)
  }

  get period(): Period {
    const mode = this.periodMode
    if (mode === 'all') return { mode: 'all' }

    const values = this.periodValues
    const value =
      this.periodValue !== null && values.includes(this.periodValue) ? this.periodValue : values[0] // по умолчанию — последний период этого режима с данными

    if (value === undefined) return { mode: 'all' }
    return { mode, value } as Period
  }

  // Смена режима сбрасывает значение на последний период этого режима
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

  get allMotorcadeOptions(): MotorcadeOption[] {
    return disambiguateMotorcadeNames(getMotorcadeOptions(accidentsStore.rows), (dbIndex) =>
      authStore.getFirmName(dbIndex)
    )
  }

  get motorcadeLabels(): Map<string, string> {
    return new Map(this.allMotorcadeOptions.map((option) => [option.key, option.name]))
  }

  // Без «Не указана»
  get motorcadeOptions(): MotorcadeOption[] {
    return sortByNameAsc(this.allMotorcadeOptions.filter((option) => option.motorcadeId !== null))
  }

  private hasOption(key: string | null): key is string {
    return key !== null && this.motorcadeOptions.some((option) => option.key === key)
  }

  // По умолчанию — первая по алфавиту
  get selectedMotorcadeKey(): string | null {
    if (this.hasOption(this.motorcadeKey)) return this.motorcadeKey
    return this.motorcadeOptions[0]?.key ?? null
  }

  setMotorcadeKey(key: string): void {
    this.motorcadeKey = key
  }

  // По умолчанию — две крупнейшие по числу ДТП
  get analyticsDefaultKeys(): [string | null, string | null] {
    const byCount = sortByAccidentCountDesc(this.motorcadeOptions)
    return [byCount[0]?.key ?? null, byCount[1]?.key ?? null]
  }

  get selectedAnalyticsKeyA(): string | null {
    if (this.hasOption(this.analyticsMotorcadeKeyA)) return this.analyticsMotorcadeKeyA
    const [first, second] = this.analyticsDefaultKeys
    // Явный выбор B совпал с дефолтом A — A берёт другую
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

  // Автоколонна из ссылки отсутствует в данных пользователя
  get isLinkedMotorcadeMissing(): boolean {
    return this.motorcadeKey !== null && !this.hasOption(this.motorcadeKey)
  }

  get isLinkedAnalyticsMissing(): boolean {
    return [this.analyticsMotorcadeKeyA, this.analyticsMotorcadeKeyB].some(
      (key) => key !== null && !this.hasOption(key)
    )
  }

  // Сначала сбрасываем B, иначе «a=X&b=Y» поверх «a=Y» упрётся в запрет одинакового выбора
  setAnalyticsPair(keyA: string | null, keyB: string | null): void {
    if (keyA && keyB && keyA !== keyB) {
      this.analyticsMotorcadeKeyB = null
      this.setAnalyticsMotorcadeA(keyA)
      this.setAnalyticsMotorcadeB(keyB)
      return
    }
    if (keyA) this.setAnalyticsMotorcadeA(keyA)
    if (keyB) this.setAnalyticsMotorcadeB(keyB)
  }

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
