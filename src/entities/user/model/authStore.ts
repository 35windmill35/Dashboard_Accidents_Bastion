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
import { t } from '@/shared/i18n'

const FIRMS_STORAGE_KEY = 'road_accidents_firms'

// Firm.DBIndex, позиция в массиве — только запасной вариант
function firmDbIndex(firm: Firm, index: number): number {
  return typeof firm.DBIndex === 'number' && Number.isInteger(firm.DBIndex) ? firm.DBIndex : index
}
const RIGHTS_CHECK_CONCURRENCY = 5

class AuthStore {
  firms: Firm[] = []

  // null — права ещё не проверялись
  allowedDbIndexes: number[] | null = null

  // Базы, где проверка права упала с ошибкой
  rightsCheckErrors: string[] = []

  isLoggingIn = false
  isCheckingRights = false
  loginError: string | null = null

  sessionNotice: string | null = null

  // Поколение сессии: результат запроса из старой сессии отбрасывается
  sessionEpoch = 0
  private rightsAbort: AbortController | null = null

  constructor() {
    makeAutoObservable(this, {
      firms: observableRef,
      allowedDbIndexes: observableRef,
    })
    this.restoreFirms()

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
          this.loginError = t('roadAccidents.login.noBases')
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

      void this.checkAccidentsAccess()

      return true
    } catch (err) {
      runInAction(() => {
        this.loginError = getErrorMessage(err, {
          fallback: t('roadAccidents.login.failed'),
          statusMessages: { 401: t('roadAccidents.login.wrongCredentials') },
        })
        this.isLoggingIn = false
      })

      return false
    }
  }

  async checkAccidentsAccess(): Promise<void> {
    if (this.firms.length === 0) return

    this.rightsAbort?.abort()
    const abort = new AbortController()
    this.rightsAbort = abort
    const epoch = this.sessionEpoch

    this.isCheckingRights = true

    const dbIndexes = this.firms.map((firm, index) => firmDbIndex(firm, index))
    const results = await mapWithConcurrencyLimit(dbIndexes, RIGHTS_CHECK_CONCURRENCY, (dbIndex) =>
      checkAccidentsRight(dbIndex, abort.signal)
    )

    if (abort.signal.aborted || epoch !== this.sessionEpoch) return

    runInAction(() => {
      const allowed: number[] = []
      const errored: string[] = []

      results.forEach((result, i) => {
        const dbIndex = dbIndexes[i]
        if (result.status === 'fulfilled') {
          if (result.value) allowed.push(dbIndex)
        } else {
          errored.push(this.getFirmName(dbIndex))
        }
      })

      this.allowedDbIndexes = allowed
      this.rightsCheckErrors = errored
      this.isCheckingRights = false
      this.rightsAbort = null
    })
  }

  // Ни одной базы с правом и есть ошибки — «не удалось проверить», а не «нет доступа»
  get rightsCheckFailed(): boolean {
    return (
      this.allowedDbIndexes !== null &&
      this.allowedDbIndexes.length === 0 &&
      this.rightsCheckErrors.length > 0
    )
  }

  getFirmName(dbIndex: number): string {
    const firm = this.firms.find((item, index) => firmDbIndex(item, index) === dbIndex)
    return firm?.FIRM_SHORT_NAME || t('roadAccidents.common.baseFallback', { index: dbIndex })
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
      // хранилище недоступно
    }
  }

  expireSession(): void {
    if (this.firms.length === 0 && !hasStoredSession()) return
    this.logout()
    this.sessionNotice = t('roadAccidents.login.sessionExpired')
  }

  checkSessionExpiry(): void {
    if (this.firms.length > 0 && isSessionExpired()) this.expireSession()
  }

  persistFirms(): void {
    try {
      localStorage.setItem(FIRMS_STORAGE_KEY, JSON.stringify(this.firms))
    } catch {
      // хранилище недоступно
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
