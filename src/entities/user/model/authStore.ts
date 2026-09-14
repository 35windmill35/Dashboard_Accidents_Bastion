import { makeAutoObservable, observableRef, runInAction } from 'mobx'
import { loginAppUser, checkAccidentsRight, type Firm } from '../api/authApi'
import { getSessionId, setSession, clearSession } from '@/shared/api/session'
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

  constructor() {
    makeAutoObservable(this, { firms: observableRef, allowedDbIndexes: observableRef })
    this.restoreFirms()
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
        this.firms = firms
        this.allowedDbIndexes = null
        this.rightsCheckErrors = []
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
  async checkAccidentsAccess(): Promise<void> {
    if (this.isCheckingRights || this.firms.length === 0) return

    this.isCheckingRights = true

    const dbIndexes = this.firms.map((_firm, index) => index)
    const results = await mapWithConcurrencyLimit(
      dbIndexes,
      RIGHTS_CHECK_CONCURRENCY,
      checkAccidentsRight
    )

    runInAction(() => {
      const allowed: number[] = []
      const errored: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value) allowed.push(index)
        } else {
          errored.push(this.firms[index]?.FIRM_SHORT_NAME || `база #${index}`)
        }
      })

      this.allowedDbIndexes = allowed
      this.rightsCheckErrors = errored
      this.isCheckingRights = false
    })
  }

  logout(): void {
    this.firms = []
    this.allowedDbIndexes = null
    this.rightsCheckErrors = []
    this.loginError = null
    clearSession()
    localStorage.removeItem(FIRMS_STORAGE_KEY)
  }

  persistFirms(): void {
    localStorage.setItem(FIRMS_STORAGE_KEY, JSON.stringify(this.firms))
  }

  restoreFirms(): void {
    const raw = localStorage.getItem(FIRMS_STORAGE_KEY)
    if (!raw) return

    try {
      this.firms = JSON.parse(raw)
    } catch {
      this.firms = []
    }
  }
}

export const authStore = new AuthStore()
