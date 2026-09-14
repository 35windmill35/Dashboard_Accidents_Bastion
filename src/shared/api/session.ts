// Хранилище текущей сессии — модульная переменная плюс копия в
// localStorage, чтобы сессия переживала перезагрузку страницы.
//
// Ключ отдельный от дашборда «Точки роста» — дашборды разворачиваются
// как независимые деплои, без общего входа между ними.

const STORAGE_KEY = 'road_accidents_session'

let sessionId: string | null = null
let remaining: number | null = null

interface SetSessionArgs {
  sessionId: string | null
  remaining: number | null
}

export function setSession({ sessionId: id, remaining: r }: SetSessionArgs): void {
  sessionId = id
  remaining = r
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ sessionId: id, remaining: r, savedAt: Date.now() })
  )
}

export function getSessionId(): string | null {
  if (sessionId) return sessionId
  restoreFromStorage()
  return sessionId
}

export function getRemaining(): number | null {
  return remaining
}

export function clearSession(): void {
  sessionId = null
  remaining = null
  localStorage.removeItem(STORAGE_KEY)
}

function restoreFromStorage(): void {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)
    sessionId = parsed.sessionId
    remaining = parsed.remaining
  } catch {
    clearSession()
  }
}
