import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flush, mockApi, row, statPage } from '@/test/fixtures'

const accident = (id: number, patch: Record<string, unknown> = {}) => ({
  ACCIDENT_ID: id,
  ACCIDENT_DATE: '2026-08-01',
  ...patch,
})

async function loadStores() {
  const { authStore } = await import('@/entities/user/model/authStore')
  const { accidentsStore } = await import('@/entities/accident/model/accidentsStore')
  const { drilldownStore } = await import('@/widgets/accident-drilldown/model/drilldownStore')
  return { authStore, accidentsStore, drilldownStore }
}

function standardApi(firms: unknown[], data: (db: number) => unknown) {
  mockApi((url) => {
    if (url.pathname.includes('loginAppUser')) return firms
    if (url.pathname.includes('UserRight')) return { Dashboard_Accidents: true }
    return data(Number(url.searchParams.get('DBIndex')))
  })
}

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('сессия и персональные данные', () => {
  it('выход закрывает детализацию и выбрасывает строки с ФИО', async () => {
    standardApi([{ DBIndex: 0, FIRM_SHORT_NAME: 'A' }], () => statPage([]))
    const { authStore, drilldownStore } = await loadStores()
    await authStore.login('79001234567', 'p')
    await flush()
    drilldownStore.open('Все ДТП', [row({ DRIVER_NAME: 'Иванов И.И.' })])
    authStore.logout()
    expect(drilldownStore.isOpen).toBe(false)
    expect(drilldownStore.rows).toHaveLength(0)
  })

  it('ответ 401 разлогинивает и закрывает детализацию', async () => {
    let expired = false
    mockApi((url) => {
      if (url.pathname.includes('loginAppUser')) return [{ DBIndex: 0, FIRM_SHORT_NAME: 'A' }]
      if (expired) return new Response('', { status: 401 })
      if (url.pathname.includes('UserRight')) return { Dashboard_Accidents: true }
      return statPage([])
    })
    const { authStore, accidentsStore, drilldownStore } = await loadStores()
    await authStore.login('79001234567', 'p')
    await flush()
    drilldownStore.open('Все ДТП', [row()])
    expired = true
    await accidentsStore.load()
    expect(authStore.sessionNotice).toBe('Сессия истекла — войдите заново')
    expect(drilldownStore.isOpen).toBe(false)
  })

  it('сессия истекает после 30 минут без запросов', async () => {
    localStorage.setItem(
      'road_accidents_session',
      JSON.stringify({
        sessionId: 'S',
        savedAt: Date.now() - 40 * 60e3,
        lastActivityAt: Date.now() - 31 * 60e3,
      })
    )
    const { getSessionId } = await import('@/shared/api/session')
    expect(getSessionId()).toBeNull()
  })
})

describe('загрузка данных', () => {
  it('DBIndex берётся из ответа логина, а не из позиции в списке', async () => {
    const requested: string[] = []
    mockApi((url) => {
      if (url.pathname.includes('loginAppUser')) return [{ DBIndex: 7, FIRM_SHORT_NAME: 'A' }]
      requested.push(url.searchParams.get('DBIndex') ?? '')
      if (url.pathname.includes('UserRight')) return { Dashboard_Accidents: true }
      return statPage([accident(1)])
    })
    const { authStore, accidentsStore } = await loadStores()
    await authStore.login('79001234567', 'p')
    await flush()
    await flush()
    expect(requested.every((value) => value === '7')).toBe(true)
    expect(accidentsStore.rows[0].DB_INDEX).toBe(7)
    expect(authStore.getFirmName(7)).toBe('A')
  })

  it('«Обновить» не теряет строки базы, которая не ответила', async () => {
    let failB = false
    mockApi((url) => {
      if (url.pathname.includes('loginAppUser'))
        return [
          { DBIndex: 0, FIRM_SHORT_NAME: 'A' },
          { DBIndex: 1, FIRM_SHORT_NAME: 'B' },
        ]
      if (url.pathname.includes('UserRight')) return { Dashboard_Accidents: true }
      const db = Number(url.searchParams.get('DBIndex'))
      if (db === 1 && failB) return new Response('err', { status: 500 })
      return statPage([1, 2, 3, 4, 5].map((id) => accident(id)))
    })
    const { authStore, accidentsStore } = await loadStores()
    await authStore.login('79001234567', 'p')
    await flush()
    await flush()
    expect(accidentsStore.rows).toHaveLength(10)
    failB = true
    await accidentsStore.load()
    expect(accidentsStore.rows).toHaveLength(10)
    expect(accidentsStore.failedFirms).toEqual(['B'])
    expect(accidentsStore.staleFirms.map((firm) => firm.name)).toEqual(['B'])
  })

  it('постраничная загрузка через Offset с дедупликацией', async () => {
    const all = Array.from({ length: 450 }, (_, i) => accident(i + 1))
    mockApi((url) => {
      const offset = Number(url.searchParams.get('Offset') ?? 0)
      return statPage(all.slice(offset, offset + 200), 450)
    })
    localStorage.setItem(
      'road_accidents_session',
      JSON.stringify({ sessionId: 'S', savedAt: Date.now(), lastActivityAt: Date.now() })
    )
    const { getAccidentStat } = await import('@/entities/accident/api/accidentApi')
    const result = await getAccidentStat(0)
    expect(result.rows).toHaveLength(450)
    expect(result.isComplete).toBe(true)
  })

  it('сервер без поддержки Offset — неполные данные видны, а не молча', async () => {
    const first = Array.from({ length: 200 }, (_, i) => accident(i + 1))
    mockApi(() => statPage(first, 450))
    localStorage.setItem(
      'road_accidents_session',
      JSON.stringify({ sessionId: 'S', savedAt: Date.now(), lastActivityAt: Date.now() })
    )
    const { getAccidentStat } = await import('@/entities/accident/api/accidentApi')
    const result = await getAccidentStat(0)
    expect(result.rows).toHaveLength(200)
    expect(result.isComplete).toBe(false)
  })

  it('некорректные строки отбрасываются и считаются для баннера', async () => {
    standardApi([{ DBIndex: 0, FIRM_SHORT_NAME: 'A' }], () =>
      statPage([
        accident(1, { ACCIDENT_DAMAGE: '1500' }),
        accident(2, { ACCIDENT_DATE: '2026-13-01' }),
        accident(3, { ACCIDENT_CAUSE_ID: 99 }),
      ])
    )
    const { authStore, accidentsStore } = await loadStores()
    await authStore.login('79001234567', 'p')
    await flush()
    await flush()
    expect(accidentsStore.rows).toHaveLength(2)
    expect(accidentsStore.rows[0].ACCIDENT_DAMAGE).toBe(1500)
    expect(accidentsStore.rejectedFirms).toEqual([
      { name: 'A', count: 1, details: 'некорректная дата — 1' },
    ])
    expect(accidentsStore.unknownCauseCount).toBe(1)
  })
})
