import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AccidentRow } from '@/entities/accident/model/types'

const row = (p: Partial<AccidentRow>): AccidentRow =>
  ({ ACCIDENT_ID: 1, ACCIDENT_DATE: '2026-08-10T00:00:00', DB_INDEX: 0, ...p }) as AccidentRow

function mockApi(handler: (url: URL) => unknown) {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input)
    const r = handler(url)
    if (r instanceof Response) return r
    return new Response(JSON.stringify({ result: { Status: 0, Response: r }, SESSIONID: 'S1', remaining: 100 }), { status: 200 })
  }))
}
const flush = () => new Promise((r) => setTimeout(r, 30))

describe('данные и метрики', () => {
  it('BUG P0-3: «Доля ДТП без повреждений» = 0% при ДТП без ущерба', async () => {
    const { computeAccidentScope } = await import('@/entities/accident/lib/scope')
    const rows = [row({ ACCIDENT_ID: 1, ACCIDENT_DAMAGE: 1000, ACCIDENT_CAUSE_ID: 5 }), row({ ACCIDENT_ID: 2, ACCIDENT_DAMAGE: null, ACCIDENT_CAUSE_ID: 5 })]
    const d = computeAccidentScope(rows, { mode: 'month', value: 202608 })
    expect(d.kpi.noDamageShare).toBe(0)
  })
  it('BUG N-2: ущерб строкой склеивается, а не складывается', async () => {
    const { sumDamage } = await import('@/entities/accident/lib/metrics')
    expect(sumDamage([row({ ACCIDENT_DAMAGE: '1500' as unknown as number }), row({ ACCIDENT_DAMAGE: 500 })])).toBe('01500500' as unknown as number)
  })
  it('BUG N-2: месяц 13 превращается в «5 квартал»', async () => {
    const p = await import('@/entities/accident/lib/period')
    const q = p.getAvailableQuarters([row({ ACCIDENT_DATE: '2026-13-01' })])
    expect(p.formatQuarterLabel(q[0])).toBe('5 квартал 2026')
  })
  it('BUG N-2: дата с опечаткой 2062 становится периодом по умолчанию', async () => {
    const p = await import('@/entities/accident/lib/period')
    expect(p.getAvailableMonths([row({ ACCIDENT_DATE: '2026-08-01' }), row({ ACCIDENT_DATE: '2062-08-01' })])[0]).toBe(206208)
  })
  it('BUG P1-13: дельта доли 40%→50% показывается как +25%', async () => {
    const f = await import('@/shared/lib/formatters')
    expect(f.formatDelta(f.calcDelta(0.5, 0.4))).toBe('+25%')
  })
  it('BUG P1-15: порядок рейтинга при равенстве зависит от порядка строк API', async () => {
    const { rankDrivers } = await import('@/entities/accident/lib/metrics')
    const a = row({ ACCIDENT_ID: 1, DRIVER_ID: 1, DRIVER_NAME: 'Б' }), b = row({ ACCIDENT_ID: 2, DRIVER_ID: 2, DRIVER_NAME: 'А' })
    expect(rankDrivers([a, b]).map((d) => d.name)).not.toEqual(rankDrivers([b, a]).map((d) => d.name))
  })
  it('BUG P2-9: запись без DRIVER_ID выпадает из рейтинга — сумма таблицы ≠ итог', async () => {
    const { rankDrivers } = await import('@/entities/accident/lib/metrics')
    const r = rankDrivers([row({ DRIVER_ID: 1 }), row({ ACCIDENT_ID: 2, DRIVER_ID: null })])
    expect(r.reduce((s, d) => s + d.count, 0)).toBe(1)
  })
})

describe('CSV', () => {
  it('BUG P1-7: формула из поля пишется в CSV как есть, \\r не экранируется', async () => {
    let captured = ''
    const OrigBlob = globalThis.Blob
    vi.stubGlobal('Blob', class extends OrigBlob { constructor(parts: BlobPart[], o?: BlobPropertyBag) { captured = String(parts[0]); super(parts, o) } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const { downloadCsv } = await import('@/shared/lib/csvExport')
    downloadCsv('x.csv', ['Адрес'], [['=HYPERLINK("http://evil","x")'], ['=1+1'], ['a\rb']])
    expect(captured).toContain('"=HYPERLINK(') // кавычки CSV не мешают Excel выполнить формулу
    expect(captured).toContain('\r\n=1+1\r\n')
    expect(captured).toContain('a\rb')
    vi.stubGlobal('Blob', OrigBlob)
  })
})

describe('авторизация и сессия', () => {
  beforeEach(() => { vi.resetModules(); localStorage.clear() })
  it('BUG P1-8: кириллица в пароле — сырое «Invalid character» пользователю', async () => {
    mockApi(() => [])
    const { authStore } = await import('@/entities/user/model/authStore')
    await authStore.login('+7 (900) 123-45-67', 'пароль')
    expect(authStore.loginError ?? '').toMatch(/invalid character/i)
  })
  it('BUG N-1: модалка детализации с ПДн остаётся открытой после выхода', async () => {
    mockApi((u) => u.pathname.includes('loginAppUser') ? [{ FIRM_SHORT_NAME: 'A' }] : u.pathname.includes('UserRight') ? { Dashboard_Accidents: true } : { DashboardAccidentStat: { data: [], totalRecords: 0 } })
    const { authStore } = await import('@/entities/user/model/authStore')
    const { drilldownStore } = await import('@/widgets/accident-drilldown/model/drilldownStore')
    await authStore.login('79001234567', 'p'); await flush()
    drilldownStore.open('Все ДТП', [row({ DRIVER_NAME: 'Иванов И.И.' })])
    authStore.logout()
    expect(drilldownStore.isOpen).toBe(true)
    expect(drilldownStore.rows[0].DRIVER_NAME).toBe('Иванов И.И.')
  })
  it('BUG N-5: «Обновить» теряет строки базы, которая временно не ответила', async () => {
    let failB = false
    mockApi((u) => {
      if (u.pathname.includes('loginAppUser')) return [{ FIRM_SHORT_NAME: 'A' }, { FIRM_SHORT_NAME: 'B' }]
      if (u.pathname.includes('UserRight')) return { Dashboard_Accidents: true }
      const db = Number(u.searchParams.get('DBIndex'))
      if (db === 1 && failB) return new Response('err', { status: 500 })
      return { DashboardAccidentStat: { data: [1, 2, 3, 4, 5].map((i) => ({ ACCIDENT_ID: i, ACCIDENT_DATE: '2026-08-01' })), totalRecords: 5 } }
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { authStore } = await import('@/entities/user/model/authStore')
    const { accidentsStore } = await import('@/entities/accident/model/accidentsStore')
    await authStore.login('79001234567', 'p'); await flush(); await flush()
    expect(accidentsStore.rows.length).toBe(10)
    failB = true
    await accidentsStore.load()
    expect(accidentsStore.rows.length).toBe(5)
  })
  it('BUG N-6: ключ базы = позиция в массиве, Firm.DBIndex игнорируется', async () => {
    const seen: string[] = []
    mockApi((u) => {
      if (u.pathname.includes('loginAppUser')) return [{ DBIndex: 7, FIRM_SHORT_NAME: 'A' }]
      seen.push(u.searchParams.get('DBIndex') ?? '')
      return u.pathname.includes('UserRight') ? { Dashboard_Accidents: true } : { DashboardAccidentStat: { data: [], totalRecords: 0 } }
    })
    const { authStore } = await import('@/entities/user/model/authStore')
    await authStore.login('79001234567', 'p'); await flush()
    expect(seen[0]).toBe('0')
  })
  it('OK: пагинация Offset дозапрашивает страницы и убирает дубли', async () => {
    const all = Array.from({ length: 450 }, (_, i) => ({ ACCIDENT_ID: i + 1, ACCIDENT_DATE: '2026-08-01' }))
    mockApi((u) => { const off = Number(u.searchParams.get('Offset') ?? 0); return { DashboardAccidentStat: { data: all.slice(off, off + 200), totalRecords: 450 } } })
    localStorage.setItem('road_accidents_session', JSON.stringify({ sessionId: 'S', savedAt: Date.now(), lastActivityAt: Date.now() }))
    const { getAccidentStat } = await import('@/entities/accident/api/accidentApi')
    const r = await getAccidentStat(0)
    expect(r.rows.length).toBe(450); expect(r.isComplete).toBe(true)
  })
  it('OK: сессия истекает через 30 мин простоя', async () => {
    localStorage.setItem('road_accidents_session', JSON.stringify({ sessionId: 'S', savedAt: Date.now() - 40 * 60e3, lastActivityAt: Date.now() - 31 * 60e3 }))
    const s = await import('@/shared/api/session')
    expect(s.getSessionId()).toBeNull()
  })
})
