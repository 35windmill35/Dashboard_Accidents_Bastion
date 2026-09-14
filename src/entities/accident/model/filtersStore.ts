import { makeAutoObservable, reaction } from 'mobx'
import { accidentsStore } from './accidentsStore'
import { authStore } from '@/entities/user/model/authStore'
import { getLatestMonth, type Period, type PeriodMode } from '../lib/period'
import {
  getSelectableMotorcadeOptions,
  sortByAccidentCountDesc,
  sortByNameAsc,
  type MotorcadeOption,
} from '../lib/motorcade'

// Период общий для всех трёх экранов, автоколонны у каждого экрана свои
// (motorcadeKey — «Статистика по автоколонне», analyticsMotorcadeKeyA/B —
// «Аналитика»).
class FiltersStore {
  periodMode: PeriodMode = 'month'
  periodValue: number | null = null

  motorcadeKey: string | null = null

  analyticsMotorcadeKeyA: string | null = null
  analyticsMotorcadeKeyB: string | null = null

  constructor() {
    makeAutoObservable(this)

    reaction(
      () => authStore.isAuthenticated,
      (isAuthenticated) => {
        if (!isAuthenticated) this.reset()
      }
    )
  }

  get period(): Period {
    if (this.periodMode === 'all') return { mode: 'all' }
    if (this.periodValue !== null)
      return { mode: this.periodMode, value: this.periodValue } as Period

    // пока пользователь не выбрал период сам — последний месяц с данными
    const latest = getLatestMonth(accidentsStore.rows)
    return latest ? { mode: 'month', value: latest } : { mode: 'all' }
  }

  setPeriodMode(mode: PeriodMode): void {
    this.periodMode = mode
    this.periodValue = null
  }

  setPeriodValue(value: number): void {
    this.periodValue = value
  }

  get motorcadeOptions(): MotorcadeOption[] {
    return sortByNameAsc(getSelectableMotorcadeOptions(accidentsStore.rows))
  }

  // по умолчанию — первая по алфавиту
  get selectedMotorcadeKey(): string | null {
    return this.motorcadeKey ?? this.motorcadeOptions[0]?.key ?? null
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
    return this.analyticsMotorcadeKeyA ?? this.analyticsDefaultKeys[0]
  }

  get selectedAnalyticsKeyB(): string | null {
    return this.analyticsMotorcadeKeyB ?? this.analyticsDefaultKeys[1]
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
