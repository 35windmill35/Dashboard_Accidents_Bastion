import type { AccidentRow } from '@/entities/accident/model/types'
let id = 1
export function row(p: Partial<AccidentRow> = {}): AccidentRow {
  return {
    ACCIDENT_ID: id++,
    ACCIDENT_DATE: '2026-08-10T00:00:00',
    DB_INDEX: 0,
    ACCIDENT_DAMAGE: 1000,
    ACCIDENT_COMPENSATED_DAMAGE: 500,
    ACCIDENT_CAUSE_ID: 5,
    MOTORCADE_ID: 1,
    MOTORCADE_NAME: 'Павлодар',
    ...p,
  } as AccidentRow
}
// ответ API в формате { result: { Status, Response }, SESSIONID }
export function apiOk(response: unknown, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ result: { Status: 0, Message: '', Response: response }, ...extra }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
