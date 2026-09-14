import { getAuthorized } from '@/shared/api/httpClient'
import type { AccidentRow } from '../model/types'

// Шаг 3 инициализации — вся статистика по одной базе одним запросом, без
// серверных фильтров. DB_INDEX в строках ответа нет, его добавляет
// accidentsStore при склейке результатов по базам.
export async function getAccidentStat(dbIndex: number): Promise<AccidentRow[]> {
  const { data } = await getAuthorized<{ DashboardAccidentStat?: { data?: AccidentRow[] } }>(
    '/api-v2/Dashboard/DashboardAccidentStat',
    { params: { DBIndex: dbIndex } }
  )

  return data?.DashboardAccidentStat?.data || []
}
