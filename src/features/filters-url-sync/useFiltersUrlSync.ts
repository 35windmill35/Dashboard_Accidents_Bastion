import { useEffect, useRef } from 'react'
import { reaction } from 'mobx'
import { useLocation, useNavigate } from 'react-router-dom'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { parsePeriodParam, periodToParam } from '@/entities/accident/lib/period'

// Синхронизация фильтров с query-строкой hash-роутера (ТЗ §3.4), чтобы
// ссылку на конкретный срез можно было переслать:
//   #/?period=2026-08
//   #/motorcade?period=2026-Q3&motorcade=0:1
//   #/analytics?period=2026&a=0:1&b=1:4
//
// Направления:
// - URL → стор: при открытии ссылки и навигации. Отсутствующий параметр
//   стор не трогает — поэтому период сохраняется при смене экрана, а
//   автоколонны у каждого экрана свои.
// - стор → URL: при любой смене фильтра (replace, без новой записи в
//   истории). Пишутся эффективные значения — то, что реально на экране.
// Чужие параметры (например DB_GUID) сохраняются.

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
    const keyA = params.get(PARAM_A)
    const keyB = params.get(PARAM_B)
    // Сначала сбрасываем B, иначе ссылка "a=X&b=Y" поверх текущего
    // "a=Y" упрётся в запрет одинакового выбора.
    if (keyA && keyB && keyA !== keyB) {
      filtersStore.analyticsMotorcadeKeyB = null
      filtersStore.setAnalyticsMotorcadeA(keyA)
      filtersStore.setAnalyticsMotorcadeB(keyB)
    } else {
      if (keyA) filtersStore.setAnalyticsMotorcadeA(keyA)
      if (keyB) filtersStore.setAnalyticsMotorcadeB(keyB)
    }
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

  // URL → стор (кроме случая, когда URL только что записали мы сами)
  useEffect(() => {
    if (location.search === lastWrittenSearch.current) return
    applyUrlToStore(location.pathname, new URLSearchParams(location.search))
  }, [location.pathname, location.search])

  // стор → URL
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
