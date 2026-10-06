import { BASE_URL } from '@/shared/config/api'
import { getSessionId, touchSession } from '@/shared/api/session'
import { t } from '@/shared/i18n'

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message?: string, data?: unknown) {
    super(message || `API error, status=${status}`)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

type QueryParamPrimitive = string | number | boolean

type QueryParamValue =
  QueryParamPrimitive | null | undefined | Record<string, QueryParamPrimitive | null | undefined>

export type QueryParams = Record<string, QueryParamValue>

// Params: { DB_GUID } → Params[DB_GUID]=...
function buildUrl(path: string, params: QueryParams = {}): string {
  const url = new URL(path, BASE_URL)

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        if (nestedValue !== undefined && nestedValue !== null) {
          url.searchParams.set(`${key}[${nestedKey}]`, String(nestedValue))
        }
      })
      return
    }

    url.searchParams.set(key, String(value))
  })

  return url.toString()
}

export interface ApiResult<T = unknown> {
  data: T
  sessionId?: string
  remaining?: number
}

// Ответ: { result: { Status, Message, Response }, SESSIONID, remaining }
async function parseResponse<T = unknown>(response: Response): Promise<ApiResult<T>> {
  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`)
  }

  const body = await response.json()
  const { Status, Message, Response: data } = body.result || {}

  if (Status !== 0) {
    throw new ApiError(Status, Message, data)
  }

  return {
    data,
    sessionId: body.SESSIONID,
    remaining: body.remaining,
  }
}

// Дедупликация одновременных одинаковых запросов (двойной сабмит логина)
const inFlightRequests = new Map<string, Promise<ApiResult>>()

function dedupedFetch<T>(
  key: string,
  performFetch: () => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  if (inFlightRequests.has(key)) return inFlightRequests.get(key) as Promise<ApiResult<T>>

  const promise = performFetch().finally(() => {
    inFlightRequests.delete(key)
  })

  inFlightRequests.set(key, promise as Promise<ApiResult>)
  return promise
}

// btoa не принимает кириллицу — сначала кодируем в UTF-8
export function encodeBasicCredentials(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

interface BasicAuthOptions {
  username: string
  password: string
  params?: QueryParams
  headers?: Record<string, string>
}

export async function getWithBasicAuth<T = unknown>(
  path: string,
  { username, password, params, headers }: BasicAuthOptions
): Promise<ApiResult<T>> {
  const url = buildUrl(path, params)
  const authHeader = `Basic ${encodeBasicCredentials(username, password)}`
  const key = `${url}::${authHeader}`

  return dedupedFetch(key, async () => {
    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        ...headers,
      },
    })

    return parseResponse<T>(response)
  })
}

interface AuthorizedOptions {
  params?: QueryParams
  signal?: AbortSignal
}

// Коды «сессии больше нет»
const AUTH_ERROR_STATUSES = new Set<number>([401])

export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && AUTH_ERROR_STATUSES.has(err.status)
}

// Обработчик регистрирует authStore (shared не импортирует entities)
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export async function getAuthorized<T = unknown>(
  path: string,
  { params, signal }: AuthorizedOptions = {}
): Promise<ApiResult<T>> {
  const sessionId = getSessionId()

  if (!sessionId) {
    const err = new ApiError(401, t('roadAccidents.error.noSession'))
    unauthorizedHandler?.()
    throw err
  }

  const url = buildUrl(path, params)

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${sessionId}`,
      },
      signal,
    })

    const result = await parseResponse<T>(response)
    touchSession()
    return result
  } catch (err) {
    // Отменённый запрос — не ошибка API
    if (signal?.aborted) throw err

    console.error(
      '[api]',
      { path, params, status: err instanceof ApiError ? err.status : null },
      err
    )
    if (isAuthError(err)) unauthorizedHandler?.()
    throw err
  }
}
