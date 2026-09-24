import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiOk } from './helpers'

type Handler = (url: URL) => Response | Promise<Response>
function mockFetch(handler: Handler) {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input)
    calls.push(url.pathname + url.search)
    if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError')
    return handler(url)
  }))
  return calls
}
const flush = () => new Promise((r) => setTimeout(r, 0))
async function settle(n = 20) { for (let i = 0; i < n; i++) await flush() }

function statRows(prefix: string, n: number, dbIndex = 0) {
  return Array.from({ length: n }, (_, i) => ({
    ACCIDENT_ID: i + 1 + dbIndex * 10000,
    ACCIDENT_DATE: '2026-08-10T00:00:00',
    ACCIDENT_DAMAGE: 100,
    DRIVER_NAME: `${prefix}-${i}`,
    MOTORCADE_ID: 1,
    MOTORCADE_NAME: `${prefix} колонна`,
  }))
}

async function loadModules() {
  vi.resetModules()
  const { authStore } = await import('@/entities/user/model/authStore')
  const { accidentsStore } = await import('@/entities/accident/model/accidentsStore')
  const { filtersStore } = await import('@/entities/accident/model/filtersStore')
  const { drilldownStore } = await import('@/widgets/accident-drilldown/model/drilldownStore')
  return { authStore, accidentsStore, filtersStore, drilldownStore }
}

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('авторизация', () => {
  it('BUG: кириллица в пароле — вход падает, пользователю показано сырое "Invalid character"', async () => {
    mockFetch(() => apiOk([{ FIRM_SHORT_NAME: 'Павлодар' }], { SESSIONID: 's1' }))
    const { authStore } = await loadModules()
    const ok = await authStore.login('+7 (900) 123-45-67', 'пароль')
    expect(ok).toBe(false)
    expect(authStore.loginError).toMatch(/Invalid character|invalid/i)
  })

  it('DB_INDEX = позиция в массиве, поле Firm.DBIndex из ответа игнорируется', async () => {
    const calls = mockFetch((url) => {
      if (url.pathname.includes('loginAppUser'))
        return apiOk([{ DBIndex: 7, FIRM_SHORT_NAME: 'A' }], { SESSIONID: 's1' })
      if (url.pathname.includes('UserRight')) return apiOk({ Dashboard_Accidents: true })
      return apiOk({ DashboardAccidentStat: { data: [], totalRecords: 0 } })
    })
    const { authStore } = await loadModules()
    await authStore.login('79001234567', 'pass')
    await settle()
    expect(calls.find((c) => c.includes('UserRight'))).toContain('DBIndex=0')
  })
})

describe('загрузка данных', () => {
  it('ИСПРАВЛЕНО (P0-1): выход во время загрузки не показывает данные A пользователю B', async () => {
    let user = 'A'
    let releaseA: (() => void) | null = null
    mockFetch(async (url) => {
      if (url.pathname.includes('loginAppUser')) return apiOk([{ FIRM_SHORT_NAME: user }], { SESSIONID: user })
      if (url.pathname.includes('UserRight')) return apiOk({ Dashboard_Accidents: true })
      const who = user
      if (who === 'A') await new Promise<void>((r) => (releaseA = r))
      return apiOk({ DashboardAccidentStat: { data: statRows(who, 3), totalRecords: 3 } })
    })
    const { authStore, accidentsStore } = await loadModules()
    await authStore.login('79001234567', 'a')
    await settle()
    authStore.logout()
    user = 'B'
    await authStore.login('79001234568', 'b')
    await settle()
    releaseA?.()
    await settle()
    expect(accidentsStore.rows.every((r) => String(r.DRIVER_NAME).startsWith('B'))).toBe(true)
  })

  it('ИСПРАВЛЕНО (P0-2): «Квартал» реально переключает период', async () => {
    mockFetch((url) => {
      if (url.pathname.includes('loginAppUser')) return apiOk([{ FIRM_SHORT_NAME: 'A' }], { SESSIONID: 's' })
      if (url.pathname.includes('UserRight')) return apiOk({ Dashboard_Accidents: true })
      return apiOk({ DashboardAccidentStat: { data: statRows('A', 2), totalRecords: 2 } })
    })
    const { authStore, filtersStore } = await loadModules()
    await authStore.login('79001234567', 'a')
    await settle()
    filtersStore.setPeriodMode('quarter')
    expect(filtersStore.period).toEqual({ mode: 'quarter', value: 20263 })
  })

  it('BUG: сервер игнорирует Offset → лишние запросы, баннер «загружены не все», данные занижены', async () => {
    const calls = mockFetch((url) => {
      if (url.pathname.includes('loginAppUser')) return apiOk([{ FIRM_SHORT_NAME: 'A' }], { SESSIONID: 's' })
      if (url.pathname.includes('UserRight')) return apiOk({ Dashboard_Accidents: true })
      return apiOk({ DashboardAccidentStat: { data: statRows('A', 200), totalRecords: 1448 } })
    })
    const { authStore, accidentsStore } = await loadModules()
    await authStore.login('79001234567', 'a')
    await settle(60)
    expect(calls.filter((c) => c.includes('DashboardAccidentStat')).length).toBe(8)
    expect(accidentsStore.rows.length).toBe(200)
    expect(accidentsStore.incompleteFirms[0]).toMatchObject({ received: 200, totalRecords: 1448 })
  })

  it('BUG: «Обновить» при отказе одной из баз стирает ранее загруженные строки этой базы', async () => {
    let failB = false
    mockFetch((url) => {
      if (url.pathname.includes('loginAppUser'))
        return apiOk([{ FIRM_SHORT_NAME: 'A' }, { FIRM_SHORT_NAME: 'B' }], { SESSIONID: 's' })
      if (url.pathname.includes('UserRight')) return apiOk({ Dashboard_Accidents: true })
      const db = Number(url.searchParams.get('DBIndex'))
      if (db === 1 && failB) return new Response('', { status: 500 })
      return apiOk({ DashboardAccidentStat: { data: statRows(db ? 'B' : 'A', 5, db), totalRecords: 5 } })
    })
    const { authStore, accidentsStore } = await loadModules()
    await authStore.login('79001234567', 'a')
    await settle()
    expect(accidentsStore.rows.length).toBe(10)
    failB = true
    accidentsStore.reload()
    await settle()
    expect(accidentsStore.rows.length).toBe(5) // строки базы B исчезли с экрана
    expect(accidentsStore.failedFirms).toEqual(['B'])
  })
})

describe('конфиденциальность', () => {
  it('BUG: модалка детализации с ПДн остаётся открытой после выхода/истечения сессии', async () => {
    mockFetch((url) => {
      if (url.pathname.includes('loginAppUser')) return apiOk([{ FIRM_SHORT_NAME: 'A' }], { SESSIONID: 's' })
      if (url.pathname.includes('UserRight')) return apiOk({ Dashboard_Accidents: true })
      return apiOk({ DashboardAccidentStat: { data: statRows('A', 3), totalRecords: 3 } })
    })
    const { authStore, accidentsStore, drilldownStore } = await loadModules()
    await authStore.login('79001234567', 'a')
    await settle()
    drilldownStore.open('Все ДТП', accidentsStore.rows)
    authStore.expireSession()
    expect(authStore.isAuthenticated).toBe(false)
    expect(drilldownStore.isOpen).toBe(true)
    expect(drilldownStore.rows.length).toBe(3)
  })

  it('BUG: CSV без защиты от формул; ячейка с \\r не экранируется', async () => {
    const { downloadCsv } = await import('@/shared/lib/csvExport')
    let captured: Blob | null = null
    const origCreate = URL.createObjectURL
    URL.createObjectURL = (b: Blob) => { captured = b; return 'blob:x' }
    URL.revokeObjectURL = () => {}
    downloadCsv('x.csv', ['Адрес'], [['=HYPERLINK("http://evil","клик")'], ['a\rb']])
    URL.createObjectURL = origCreate
    const text = await (captured as unknown as Blob).text()
    expect(text).toContain('"=HYPERLINK(""http://evil"",""клик"")"')
    expect(text).toContain('\r\na\rb')
  })
})
