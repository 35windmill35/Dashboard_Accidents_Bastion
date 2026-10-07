import { makeAutoObservable, observableRef, reaction, runInAction } from 'mobx'
import { getAccidentStat } from '../api/accidentApi'
import type { AccidentRow } from './types'
import { authStore } from '@/entities/user/model/authStore'
import { mapWithConcurrencyLimit } from '@/shared/lib/concurrencyLimit'
import { setCurrencyCode } from '@/shared/lib/formatters'
import { REJECT_REASON_LABELS, type RejectReason } from '../lib/parseRow'

const DATA_LOAD_CONCURRENCY = 5

type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed'

export interface IncompleteFirm {
  name: string
  received: number
  totalRecords: number
}

export interface RejectedFirm {
  name: string
  count: number
  details: string
}

interface FirmSnapshot {
  rows: AccidentRow[]
  loadedAt: Date
}

function describeRejects(reasons: Partial<Record<RejectReason, number>>): string {
  return Object.entries(reasons)
    .map(([reason, count]) => `${REJECT_REASON_LABELS[reason as RejectReason]} — ${count}`)
    .join(', ')
}

class AccidentsStore {
  rows: AccidentRow[] = []
  status: LoadStatus = 'idle'

  // Перезагрузка поверх показанных данных
  isRefreshing = false

  loadedCount = 0
  totalCount = 0

  failedFirms: string[] = []

  // Меньше строк, чем в totalRecords
  incompleteFirms: IncompleteFirm[] = []

  rejectedFirms: RejectedFirm[] = []

  // Не ответили при обновлении — показаны данные прошлой загрузки
  staleFirms: { name: string; loadedAt: Date }[] = []

  // Последние удачные данные по каждой базе
  private snapshots = new Map<number, FirmSnapshot>()

  loadedAt: Date | null = null

  // Защита от гонок: результат устаревшей загрузки отбрасывается
  private loadEpoch = 0
  private abortController: AbortController | null = null

  constructor() {
    makeAutoObservable<AccidentsStore, 'snapshots'>(this, {
      rows: observableRef,
      snapshots: false,
    })

    // Первая загрузка — как только подтверждена хотя бы одна база
    reaction(
      () => authStore.hasAccidentsAccess,
      (hasAccess) => {
        if (hasAccess && this.status === 'idle') void this.load()
      },
      { fireImmediately: true }
    )

    reaction(
      () => authStore.sessionEpoch,
      () => this.reset()
    )
  }

  get isInitialLoad(): boolean {
    return this.status === 'idle' || this.status === 'loading'
  }

  get isBusy(): boolean {
    return this.status === 'loading' || this.isRefreshing
  }

  get hasPartialFailure(): boolean {
    return this.status === 'ready' && this.failedFirms.length > 0
  }

  get currencyCodes(): string[] {
    const codes = new Set<string>()
    this.rows.forEach((row) => {
      const code = row.CURRENCY_CODE?.trim()
      if (code) codes.add(code)
    })
    return Array.from(codes).sort()
  }

  get hasMixedCurrencies(): boolean {
    return this.currencyCodes.length > 1
  }

  async load(): Promise<void> {
    const dbIndexes = authStore.allowedDbIndexes ?? []
    if (dbIndexes.length === 0) return

    this.abortController?.abort()
    const abort = new AbortController()
    this.abortController = abort
    this.loadEpoch += 1
    const epoch = this.loadEpoch
    const sessionEpoch = authStore.sessionEpoch

    const hasData = this.status === 'ready'
    if (hasData) {
      this.isRefreshing = true
    } else {
      this.status = 'loading'
    }
    this.loadedCount = 0
    this.totalCount = dbIndexes.length

    const results = await mapWithConcurrencyLimit(
      dbIndexes,
      DATA_LOAD_CONCURRENCY,
      async (dbIndex) => {
        const result = await getAccidentStat(dbIndex, abort.signal)
        runInAction(() => {
          if (epoch === this.loadEpoch) this.loadedCount += 1
        })
        return {
          ...result,
          rows: result.rows.map((row): AccidentRow => ({ ...row, DB_INDEX: dbIndex })),
        }
      }
    )

    if (
      abort.signal.aborted ||
      epoch !== this.loadEpoch ||
      sessionEpoch !== authStore.sessionEpoch
    ) {
      return
    }

    runInAction(() => {
      const failed: string[] = []
      const stale: { name: string; loadedAt: Date }[] = []
      const incomplete: IncompleteFirm[] = []
      const rejected: RejectedFirm[] = []
      const now = new Date()

      results.forEach((result, i) => {
        const dbIndex = dbIndexes[i]
        const name = authStore.getFirmName(dbIndex)
        if (result.status === 'fulfilled') {
          const {
            rows,
            totalRecords,
            isComplete,
            rejected: rejectedCount,
            rejectReasons,
          } = result.value
          this.snapshots.set(dbIndex, { rows, loadedAt: now })
          if (!isComplete && totalRecords !== null) {
            incomplete.push({ name, received: rows.length, totalRecords })
          }
          if (rejectedCount > 0) {
            rejected.push({ name, count: rejectedCount, details: describeRejects(rejectReasons) })
          }
        } else {
          failed.push(name)
          const previous = this.snapshots.get(dbIndex)
          if (previous) stale.push({ name, loadedAt: previous.loadedAt })
        }
      })

      this.abortController = null
      this.isRefreshing = false
      this.failedFirms = failed
      this.staleFirms = stale

      if (failed.length === dbIndexes.length && !hasData) {
        this.rows = []
        this.status = 'failed'
        return
      }

      const merged: AccidentRow[] = []
      dbIndexes.forEach((dbIndex) => {
        const snapshot = this.snapshots.get(dbIndex)
        if (snapshot) merged.push(...snapshot.rows)
      })

      this.rows = merged
      this.incompleteFirms = incomplete
      this.rejectedFirms = rejected
      if (failed.length < dbIndexes.length) this.loadedAt = now
      this.status = 'ready'
      setCurrencyCode(this.currencyCodes.length === 1 ? this.currencyCodes[0] : null)
    })
  }

  reload(): void {
    void this.load()
  }

  // Если часть баз не прошла проверку права — сначала права, затем данные
  async retry(): Promise<void> {
    if (authStore.rightsCheckErrors.length > 0) {
      await authStore.checkAccidentsAccess()
      if (!authStore.hasAccidentsAccess) return
      // Загрузку уже запустила реакция
      if (this.status === 'loading') return
    }
    await this.load()
  }

  reset(): void {
    this.abortController?.abort()
    this.abortController = null
    this.loadEpoch += 1
    this.rows = []
    this.status = 'idle'
    this.isRefreshing = false
    this.loadedCount = 0
    this.totalCount = 0
    this.failedFirms = []
    this.incompleteFirms = []
    this.rejectedFirms = []
    this.staleFirms = []
    this.snapshots.clear()
    this.loadedAt = null
    setCurrencyCode(null)
  }
}

export const accidentsStore = new AccidentsStore()
