// Хранилище текущей сессии — модульная переменная плюс копия в
// localStorage, чтобы сессия переживала перезагрузку страницы.
//
// Ключ отдельный от дашборда «Точки роста» — дашборды разворачиваются
// как независимые деплои, без общего входа между ними.
//
// Сроки жизни (ТЗ §2.3): сессия живёт максимум 10 часов с момента входа и
// истекает после 30 минут без запросов к API. Сервер считает неактивность
// по запросам, поэтому "активность" здесь — это успешный запрос с
// SESSIONID (см. touchSession в httpClient), а не движение мыши.

const STORAGE_KEY = 'road_accidents_session'

export const SESSION_MAX_AGE_MS = 10 * 60 * 60 * 1000
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000

interface StoredSession {
  sessionId: string | null
  remaining: number | null
  savedAt: number
  lastActivityAt: number
}

let current: StoredSession | null = null

interface SetSessionArgs {
  sessionId: string | null
  remaining: number | null
}

function persist(): void {
  try {
    if (current) localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // приватный режим/запрет хранилища — сессия живёт только в памяти вкладки
  }
}

function restoreFromStorage(): void {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return
  }
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    if (typeof parsed.sessionId !== 'string' || !parsed.sessionId) {
      clearSession()
      return
    }
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0
    current = {
      sessionId: parsed.sessionId,
      remaining: typeof parsed.remaining === 'number' ? parsed.remaining : null,
      savedAt,
      // старый формат без lastActivityAt — считаем активностью момент входа
      lastActivityAt: typeof parsed.lastActivityAt === 'number' ? parsed.lastActivityAt : savedAt,
    }
  } catch {
    clearSession()
  }
}

export function setSession({ sessionId, remaining }: SetSessionArgs): void {
  const now = Date.now()
  current = { sessionId, remaining, savedAt: now, lastActivityAt: now }
  persist()
}

// Истёкшая по времени сессия не отдаётся вовсе — запрос с ней всё равно
// получит отказ, а пользователь увидел бы "нет доступа" вместо входа.
export function getSessionId(): string | null {
  if (!current) restoreFromStorage()
  if (!current) return null
  if (isSessionExpired()) return null
  return current.sessionId
}

export function getRemaining(): number | null {
  return current?.remaining ?? null
}

// Вызывается после каждого успешного авторизованного запроса.
export function touchSession(): void {
  if (!current) return
  current.lastActivityAt = Date.now()
  persist()
}

export function isSessionExpired(now: number = Date.now()): boolean {
  if (!current) restoreFromStorage()
  if (!current) return false
  return (
    now - current.savedAt > SESSION_MAX_AGE_MS ||
    now - current.lastActivityAt > SESSION_IDLE_TIMEOUT_MS
  )
}

// Есть ли сохранённая (пусть и истёкшая) сессия — нужно, чтобы отличить
// "сессия истекла" от "пользователь ещё не входил".
export function hasStoredSession(): boolean {
  if (!current) restoreFromStorage()
  return Boolean(current?.sessionId)
}

export function clearSession(): void {
  current = null
  persist()
}
