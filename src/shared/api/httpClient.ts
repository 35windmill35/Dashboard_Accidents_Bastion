import { BASE_URL } from '@/shared/config/api'
import { getSessionId } from '@/shared/api/session'

// Ошибка API — хранит код статуса ответа и данные, которые сервер мог
// прислать вместе с ним.
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

// Вложенные объекты вида Params: { DB_GUID: '...' } превращаются в
// Params[DB_GUID]=...
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

// Ответ сервера имеет форму
// { result: { Status, Message, Response }, SESSIONID, remaining }
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

// Дедупликация одинаковых запросов, улетающих одновременно — на форме
// логина иногда уходит два сабмита подряд.
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

interface BasicAuthOptions {
  username: string
  password: string
  params?: QueryParams
  headers?: Record<string, string>
}

// Basic Auth — только для auth-методов, пока ещё нет SESSIONID.
export async function getWithBasicAuth<T = unknown>(
  path: string,
  { username, password, params, headers }: BasicAuthOptions
): Promise<ApiResult<T>> {
  const url = buildUrl(path, params)
  const authHeader = `Basic ${btoa(`${username}:${password}`)}`
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
}

// Bearer SESSIONID — для всех запросов после логина.
export async function getAuthorized<T = unknown>(
  path: string,
  { params }: AuthorizedOptions = {}
): Promise<ApiResult<T>> {
  const sessionId = getSessionId()

  if (!sessionId) {
    throw new ApiError(401, 'Нет активной сессии — требуется повторный вход')
  }

  const response = await fetch(buildUrl(path, params), {
    headers: {
      Authorization: `Bearer ${sessionId}`,
    },
  })

  return parseResponse<T>(response)
}
