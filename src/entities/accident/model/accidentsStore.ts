import { makeAutoObservable, observableRef, reaction, runInAction } from 'mobx'
import { getAccidentStat } from '../api/accidentApi'
import type { AccidentRow } from './types'
import { authStore } from '@/entities/user/model/authStore'
import { mapWithConcurrencyLimit } from '@/shared/lib/concurrencyLimit'
import { setCurrencyCode } from '@/shared/lib/formatters'

const DATA_LOAD_CONCURRENCY = 5

type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed'

export interface IncompleteFirm {
  name: string
  received: number
  totalRecords: number
}

class AccidentsStore {
  rows: AccidentRow[] = []
  status: LoadStatus = 'idle'

  // Идёт повторная загрузка поверх уже показанных данных ("Обновить
  // данные"/"Повторить") — экран не размонтируется, старые цифры видны
  // до прихода новых.
  isRefreshing = false

  // для индикатора "Загружено баз N из M"
  loadedCount = 0
  totalCount = 0

  // базы, где шаг 3 не отдал данные — источник баннера о неполных данных
  failedFirms: string[] = []

  // базы, где сервер отдал меньше строк, чем заявил в totalRecords
  incompleteFirms: IncompleteFirm[] = []

  // Момент последней успешной загрузки — "данные на ..." в шапке/PDF.
  loadedAt: Date | null = null

  // Защита от гонок (P0-1): каждая загрузка получает свой номер и свой
  // AbortController. Выход, новый вход или новая загрузка увеличивают
  // номер — результат устаревшей загрузки молча отбрасывается и не
  // попадает к следующему пользователю.
  private loadEpoch = 0
  private abortController: AbortController | null = null

  constructor() {
    makeAutoObservable(this, { rows: observableRef })

    // Загрузка запускается сама, как только шаг 2 подтвердил хотя бы одну
    // базу с доступом (в том числе после каждого нового входа). Дальше —
    // только по кнопке "Обновить данные".
    reaction(
      () => authStore.hasAccidentsAccess,
      (hasAccess) => {
        if (hasAccess && this.status === 'idle') void this.load()
      },
      { fireImmediately: true }
    )

    // Любая смена сессии (выход, вход под другим пользователем) — старые
    // данные и незавершённые запросы выбрасываются.
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

  // Валюты, встречающиеся в данных. Больше одной — суммы по компании
  // складывать нельзя, экран показывает предупреждение.
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

    // Новая загрузка отменяет предыдущую, а не игнорируется: иначе "Повторить"
    // во время зависшего запроса ничего бы не делало.
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
          rows: result.rows.map((row) => ({ ...row, DB_INDEX: dbIndex })),
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
      const merged: AccidentRow[] = []
      const failed: string[] = []
      const incomplete: IncompleteFirm[] = []

      results.forEach((result, i) => {
        const dbIndex = dbIndexes[i]
        if (result.status === 'fulfilled') {
          const { rows, totalRecords, isComplete } = result.value
          merged.push(...rows)
          if (!isComplete && totalRecords !== null) {
            incomplete.push({
              name: authStore.getFirmName(dbIndex),
              received: rows.length,
              totalRecords,
            })
          }
        } else {
          failed.push(authStore.getFirmName(dbIndex))
        }
      })

      this.abortController = null
      this.isRefreshing = false
      this.failedFirms = failed

      if (failed.length === dbIndexes.length) {
        // При обновлении поверх готовых данных полный отказ не стирает то,
        // что уже на экране — баннер покажет, что обновить не удалось.
        if (!hasData) {
          this.rows = []
          this.status = 'failed'
        }
        return
      }

      this.rows = merged
      this.incompleteFirms = incomplete
      this.loadedAt = new Date()
      this.status = 'ready'
      setCurrencyCode(this.currencyCodes.length === 1 ? this.currencyCodes[0] : null)
    })
  }

  reload(): void {
    void this.load()
  }

  // "Повторить" в баннере о неполных данных: если часть баз не прошла даже
  // проверку права (шаг 2) — сначала перепроверяем права, затем данные.
  async retry(): Promise<void> {
    if (authStore.rightsCheckErrors.length > 0) {
      await authStore.checkAccidentsAccess()
      if (!authStore.hasAccidentsAccess) return
      // право появилось впервые — загрузку уже запустила реакция выше
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
    this.loadedAt = null
    setCurrencyCode(null)
  }
}

export const accidentsStore = new AccidentsStore()
