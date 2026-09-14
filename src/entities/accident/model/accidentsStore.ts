import { makeAutoObservable, observableRef, reaction, runInAction } from 'mobx'
import { getAccidentStat } from '../api/accidentApi'
import type { AccidentRow } from './types'
import { authStore } from '@/entities/user/model/authStore'
import { mapWithConcurrencyLimit } from '@/shared/lib/concurrencyLimit'

const DATA_LOAD_CONCURRENCY = 5

type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed'

class AccidentsStore {
  rows: AccidentRow[] = []
  status: LoadStatus = 'idle'

  // для индикатора "Загружено баз N из M"
  loadedCount = 0
  totalCount = 0

  // базы, где шаг 3 не отдал данные — источник баннера о неполных данных
  failedFirms: string[] = []

  constructor() {
    makeAutoObservable(this, { rows: observableRef })

    // Загрузка запускается один раз сама, как только шаг 2 подтвердил хотя
    // бы одну базу с доступом. Дальше — только по кнопке "Обновить данные".
    reaction(
      () => authStore.hasAccidentsAccess,
      (hasAccess) => {
        if (hasAccess && this.status === 'idle') void this.load()
      },
      { fireImmediately: true }
    )

    reaction(
      () => authStore.isAuthenticated,
      (isAuthenticated) => {
        if (!isAuthenticated) this.reset()
      }
    )
  }

  get isInitialLoad(): boolean {
    return this.status === 'idle' || this.status === 'loading'
  }

  get hasPartialFailure(): boolean {
    return this.status === 'ready' && this.failedFirms.length > 0
  }

  async load(): Promise<void> {
    if (this.status === 'loading') return

    const dbIndexes = authStore.allowedDbIndexes ?? []
    if (dbIndexes.length === 0) return

    this.status = 'loading'
    this.loadedCount = 0
    this.totalCount = dbIndexes.length
    this.failedFirms = []

    const results = await mapWithConcurrencyLimit(
      dbIndexes,
      DATA_LOAD_CONCURRENCY,
      async (dbIndex) => {
        const rows = await getAccidentStat(dbIndex)
        runInAction(() => {
          this.loadedCount += 1
        })
        return rows.map((row) => ({ ...row, DB_INDEX: dbIndex }))
      }
    )

    runInAction(() => {
      const merged: AccidentRow[] = []
      const failed: string[] = []

      results.forEach((result, i) => {
        const dbIndex = dbIndexes[i]
        if (result.status === 'fulfilled') {
          merged.push(...result.value)
        } else {
          failed.push(authStore.firms[dbIndex]?.FIRM_SHORT_NAME || `база #${dbIndex}`)
        }
      })

      this.rows = merged
      this.failedFirms = failed
      this.status = failed.length === dbIndexes.length ? 'failed' : 'ready'
    })
  }

  reload(): void {
    this.status = 'idle'
    void this.load()
  }

  reset(): void {
    this.rows = []
    this.status = 'idle'
    this.loadedCount = 0
    this.totalCount = 0
    this.failedFirms = []
  }
}

export const accidentsStore = new AccidentsStore()
