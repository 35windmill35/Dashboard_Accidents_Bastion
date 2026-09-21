import { ApiError, getAuthorized } from '@/shared/api/httpClient'
import { mapWithConcurrencyLimit } from '@/shared/lib/concurrencyLimit'
import type { AccidentRow } from '../model/types'

// Сервер отдаёт DashboardAccidentStat порциями (на практике по 200 строк) и
// сообщает полный объём в totalRecords. Остальное дозапрашивается тем же
// методом с параметром Offset = сколько строк уже получено.
const PAGE_CONCURRENCY = 3
// Предохранитель от бесконечного цикла, если сервер вернёт странный
// totalRecords: 1000 страниц по 200 = 200 тыс. строк на базу.
const MAX_PAGES = 1000

interface StatResponse {
  DashboardAccidentStat?: {
    data?: unknown
    totalRecords?: unknown
  }
}

interface StatPage {
  rows: AccidentRow[]
  totalRecords: number | null
}

export interface AccidentStatResult {
  rows: AccidentRow[]
  // Сколько строк сервер заявил в totalRecords (null — не сообщил)
  totalRecords: number | null
  // Получены все заявленные строки
  isComplete: boolean
}

async function fetchPage(dbIndex: number, offset: number, signal?: AbortSignal): Promise<StatPage> {
  const { data } = await getAuthorized<StatResponse>('/api-v2/Dashboard/DashboardAccidentStat', {
    // первую страницу запрашиваем без Offset — ровно как раньше
    params: offset > 0 ? { DBIndex: dbIndex, Offset: offset } : { DBIndex: dbIndex },
    signal,
  })

  const stat = data?.DashboardAccidentStat
  // Неожиданная форма ответа — это ошибка базы, а не "ДТП нет".
  if (!stat || !Array.isArray(stat.data)) {
    throw new ApiError(-1, 'Некорректный ответ DashboardAccidentStat: нет массива data', data)
  }

  const total = Number(stat.totalRecords)
  return {
    rows: stat.data as AccidentRow[],
    totalRecords: Number.isFinite(total) && total >= 0 ? total : null,
  }
}

// Шаг 3 инициализации — вся статистика по одной базе. Первая страница
// говорит, сколько строк всего и какого размера порция; остальные страницы
// запрашиваются параллельно (не больше PAGE_CONCURRENCY одновременно).
// Отказ любой страницы = отказ базы целиком: неполные данные без
// предупреждения хуже, чем баннер "база недоступна".
//
// DB_INDEX в строках ответа нет, его добавляет accidentsStore при склейке
// результатов по базам.
export async function getAccidentStat(
  dbIndex: number,
  signal?: AbortSignal
): Promise<AccidentStatResult> {
  const first = await fetchPage(dbIndex, 0, signal)
  const total = first.totalRecords
  const pageSize = first.rows.length

  const collected: AccidentRow[][] = [first.rows]

  if (total !== null && pageSize > 0 && total > pageSize) {
    const offsets: number[] = []
    for (let offset = pageSize; offset < total && offsets.length < MAX_PAGES; offset += pageSize) {
      offsets.push(offset)
    }

    const pages = await mapWithConcurrencyLimit(offsets, PAGE_CONCURRENCY, (offset) =>
      fetchPage(dbIndex, offset, signal)
    )

    for (const page of pages) {
      if (page.status === 'rejected') throw page.reason
      collected.push(page.value.rows)
    }
  }

  // Между запросами страниц в базе могли добавиться/сторнироваться записи —
  // тогда соседние страницы пересекаются. Один ДТП = один ACCIDENT_ID.
  const seen = new Set<number>()
  const rows: AccidentRow[] = []
  collected.flat().forEach((row) => {
    const id = row.ACCIDENT_ID
    if (typeof id === 'number') {
      if (seen.has(id)) return
      seen.add(id)
    }
    rows.push(row)
  })

  const isComplete = total === null || rows.length >= total
  if (!isComplete) {
    console.warn('[api] DashboardAccidentStat: получено меньше строк, чем totalRecords', {
      dbIndex,
      received: rows.length,
      totalRecords: total,
    })
  }

  return { rows, totalRecords: total, isComplete }
}
