import { useEffect, useRef } from 'react'
import { reaction } from 'mobx'
import { useLocation, useNavigate } from 'react-router-dom'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { parsePeriodParam, periodToParam } from '@/entities/accident/lib/period'

// Синхронизация фильтров с query-строкой: #/motorcade?period=2026-Q3&motorcade=0:1.
// Пишутся эффективные значения, чужие параметры (DB_GUID) сохраняются.

const PARAM_PERIOD = 'period'
const PARAM_MOTORCADE = 'motorcade'
const PARAM_A = 'a'
const PARAM_B = 'b'

function applyUrlToStore(pathname: string, params: URLSearchParams): void {
  const period = parsePeriodParam(params.get(PARAM_PERIOD))
  if (period) filtersStore.setPeriod(period)

  if (pathname === '/motorcade') {
    const key = params.get(PARAM_MOTORCADE)
    if (key) filtersStore.setMotorcadeKey(key)
  }

  if (pathname === '/analytics') {
    filtersStore.setAnalyticsPair(params.get(PARAM_A), params.get(PARAM_B))
  }
}

function buildSearch(pathname: string, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch)
  params.delete(PARAM_PERIOD)
  params.delete(PARAM_MOTORCADE)
  params.delete(PARAM_A)
  params.delete(PARAM_B)

  params.set(PARAM_PERIOD, periodToParam(filtersStore.period))

  if (pathname === '/motorcade' && filtersStore.selectedMotorcadeKey) {
    params.set(PARAM_MOTORCADE, filtersStore.selectedMotorcadeKey)
  }
  if (pathname === '/analytics') {
    if (filtersStore.selectedAnalyticsKeyA) params.set(PARAM_A, filtersStore.selectedAnalyticsKeyA)
    if (filtersStore.selectedAnalyticsKeyB) params.set(PARAM_B, filtersStore.selectedAnalyticsKeyB)
  }

  const search = params.toString()
  return search ? `?${search}` : ''
}

export function useFiltersUrlSync(): void {
  const location = useLocation()
  const navigate = useNavigate()
  const lastWrittenSearch = useRef<string | null>(null)

  // Кроме URL, который только что записали сами
  useEffect(() => {
    if (location.search === lastWrittenSearch.current) return
    applyUrlToStore(location.pathname, new URLSearchParams(location.search))
  }, [location.pathname, location.search])

  useEffect(
    () =>
      reaction(
        () => buildSearch(location.pathname, location.search),
        (search) => {
          if (search === location.search) return
          lastWrittenSearch.current = search
          navigate({ pathname: location.pathname, search }, { replace: true })
        },
        { fireImmediately: true }
      ),
    [location.pathname, location.search, navigate]
  )
}
