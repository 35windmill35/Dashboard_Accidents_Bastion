import { vi } from 'vitest'
import type { AccidentRow } from '@/entities/accident/model/types'

export const row = (patch: Partial<AccidentRow> = {}): AccidentRow => ({
  ACCIDENT_ID: 1,
  ACCIDENT_DATE: '2026-08-10T00:00:00',
  DB_INDEX: 0,
  ...patch,
})

// Подмена fetch: handler получает URL запроса и возвращает Response
// или тело Response поля result (Status 0).
export function mockApi(handler: (url: URL) => unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const result = handler(new URL(input))
      if (result instanceof Response) return result
      return new Response(
        JSON.stringify({
          result: { Status: 0, Response: result },
          SESSIONID: 'S1',
          remaining: 100,
        }),
        { status: 200 }
      )
    })
  )
}

export const flush = () => new Promise((resolve) => setTimeout(resolve, 20))

export const statPage = (data: unknown[], totalRecords = data.length) => ({
  DashboardAccidentStat: { data, totalRecords },
})
