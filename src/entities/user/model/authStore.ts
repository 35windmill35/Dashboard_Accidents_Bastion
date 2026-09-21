import { makeAutoObservable, observableRef, runInAction } from 'mobx'
import { loginAppUser, checkAccidentsRight, type Firm } from '../api/authApi'
import {
  getSessionId,
  setSession,
  clearSession,
  hasStoredSession,
  isSessionExpired,
} from '@/shared/api/session'
import { setUnauthorizedHandler } from '@/shared/api/httpClient'
import { getDbGuidFromUrl } from '@/shared/config/dbGuid'
import { getErrorMessage } from '@/shared/api/errorMessage'
import { mapWithConcurrencyLimit } from '@/shared/lib/concurrencyLimit'

const FIRMS_STORAGE_KEY = 'road_accidents_firms'
const RIGHTS_CHECK_CONCURRENCY = 5

class AuthStore {
  firms: Firm[] = []

  // null — права ещё не проверялись в этой сессии. После проверки —
  // массив индексов баз с подтверждённым правом, может быть пустым.
  allowedDbIndexes: number[] | null = null

  // Имена баз, где проверка права упала с ошибкой, а не вернула явный
  // false — на них позже будет собираться баннер о недоступных базах.
  rightsCheckErrors: string[] = []

  isLoggingIn = false
  isCheckingRights = false
  loginError: string | null = null

  // Сообщение для экрана входа, почему пользователя разлогинило
  // (сессия истекла по времени или сервер ответил 401).
  sessionNotice: string | null = null

  // Номер "поколения" сессии: растёт при каждом входе и выходе. Асинхронные
  // операции запоминают его на старте и не пишут результат, если за время
  // запроса пользователь вышел или вошёл заново (P0-1).
  sessionEpoch = 0
  private rightsAbort: AbortController | null = null

  constructor() {
    makeAutoObservable(this, {
      firms: observableRef,
      allowedDbIndexes: observableRef,
    })
    this.restoreFirms()

    // Сохранённая сессия уже истекла — не притворяемся залогиненными.
    if (this.firms.length > 0 && hasStoredSession() && isSessionExpired()) {
      this.expireSession()
    }

    setUnauthorizedHandler(() => this.expireSession())
  }

  get isAuthenticated(): boolean {
    const hasFirms = this.firms.length > 0
    return Boolean(getSessionId()) && hasFirms
  }

  get isInitializing(): boolean {
    return this.isLoggingIn || this.isCheckingRights
  }

  get hasAccidentsAccess(): boolean {
    return (this.allowedDbIndexes?.length ?? 0) > 0
  }

  // Пользователь залогинен, но проверка прав в этой сессии ещё не
  // запускалась — например, сразу после восстановления firms из
  // localStorage при перезагрузке страницы.
  get rightsNeedCheck(): boolean {
    return this.isAuthenticated && this.allowedDbIndexes === null && !this.isCheckingRights
  }

  normalizePhone(rawPhone: string): string {
    return rawPhone.replace(/\D/g, '')
  }

  async login(rawPhone: string, password: string): Promise<boolean> {
    if (this.isLoggingIn) return false

    this.isLoggingIn = true
    this.loginError = null

    try {
      const dbGuid = getDbGuidFromUrl()
      const phone = this.normalizePhone(rawPhone)

      const { firms, sessionId, remaining } = await loginAppUser({ phone, password, dbGuid })

      if (!firms || firms.length === 0) {
        runInAction(() => {
          this.loginError =
            'Для этого аккаунта не найдено ни одной доступной базы. Проверьте ссылку доступа'
          this.isLoggingIn = false
        })

        return false
      }

      setSession({ sessionId: sessionId ?? null, remaining: remaining ?? null })

      runInAction(() => {
        this.sessionEpoch += 1
        this.firms = firms
        this.allowedDbIndexes = null
        this.rightsCheckErrors = []
        this.sessionNotice = null
        this.isLoggingIn = false
      })

      this.persistFirms()

      // Не дожидаемся результата — навигация происходит сразу после
      // логина, а загрузку/отказ доступа покажет RequireAccidentsAccess.
      void this.checkAccidentsAccess()

      return true
    } catch (err) {
      runInAction(() => {
        this.loginError = getErrorMessage(err, {
          fallback: 'Не удалось войти. Проверьте телефон и пароль.',
          statusMessages: { 401: 'Неверный телефон, пароль или ссылка доступа' },
        })
        this.isLoggingIn = false
      })

      return false
    }
  }

  // Проверяет право на дашборд ДТП по каждой базе параллельно (лимит 5
  // одновременных запросов), отказ одной базы не влияет на остальные.
  // Повторный вызов (кнопка "Повторить") отменяет предыдущую проверку.
  async checkAccidentsAccess(): Promise<void> {
    if (this.firms.length === 0) return

    this.rightsAbort?.abort()
    const abort = new AbortController()
    this.rightsAbort = abort
    const epoch = this.sessionEpoch

    this.isCheckingRights = true

    const dbIndexes = this.firms.map((_firm, index) => index)
    const results = await mapWithConcurrencyLimit(dbIndexes, RIGHTS_CHECK_CONCURRENCY, (dbIndex) =>
      checkAccidentsRight(dbIndex, abort.signal)
    )

    // Пока шли запросы, пользователь вышел/вошёл заново или проверку
    // перезапустили — этот результат уже не про текущую сессию.
    if (abort.signal.aborted || epoch !== this.sessionEpoch) return

    runInAction(() => {
      const allowed: number[] = []
      const errored: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value) allowed.push(index)
        } else {
          errored.push(this.getFirmName(index))
        }
      })

      this.allowedDbIndexes = allowed
      this.rightsCheckErrors = errored
      this.isCheckingRights = false
      this.rightsAbort = null
    })
  }

  // Ни одной базы с правом, но часть проверок упала — это не "нет доступа",
  // а "не удалось проверить" (сеть/бэкенд), показываем экран с повтором.
  get rightsCheckFailed(): boolean {
    return (
      this.allowedDbIndexes !== null &&
      this.allowedDbIndexes.length === 0 &&
      this.rightsCheckErrors.length > 0
    )
  }

  getFirmName(dbIndex: number): string {
    return this.firms[dbIndex]?.FIRM_SHORT_NAME || `база #${dbIndex}`
  }

  logout(): void {
    this.rightsAbort?.abort()
    this.rightsAbort = null
    this.sessionEpoch += 1
    this.firms = []
    this.allowedDbIndexes = null
    this.rightsCheckErrors = []
    this.isCheckingRights = false
    this.loginError = null
    clearSession()
    try {
      localStorage.removeItem(FIRMS_STORAGE_KEY)
    } catch {
      // хранилище недоступно — чистить нечего
    }
  }

  // Сессия истекла (по таймеру или сервер ответил 401) — выходим и
  // объясняем причину на экране входа.
  expireSession(): void {
    if (this.firms.length === 0 && !hasStoredSession()) return
    this.logout()
    this.sessionNotice = 'Сессия истекла — войдите заново'
  }

  // Периодическая проверка срока сессии (10 ч / 30 мин без запросов).
  checkSessionExpiry(): void {
    if (this.firms.length > 0 && isSessionExpired()) this.expireSession()
  }

  persistFirms(): void {
    try {
      localStorage.setItem(FIRMS_STORAGE_KEY, JSON.stringify(this.firms))
    } catch {
      // хранилище недоступно — список баз живёт до перезагрузки вкладки
    }
  }

  restoreFirms(): void {
    let raw: string | null
    try {
      raw = localStorage.getItem(FIRMS_STORAGE_KEY)
    } catch {
      return
    }
    if (!raw) return

    try {
      this.firms = JSON.parse(raw)
    } catch {
      this.firms = []
    }
  }
}

export const authStore = new AuthStore()
