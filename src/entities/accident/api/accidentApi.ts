import { ApiError, getAuthorized } from '@/shared/api/httpClient'
import { mapWithConcurrencyLimit } from '@/shared/lib/concurrencyLimit'
import type { AccidentRow } from '../model/types'
import { parseAccidentRows, type RejectReason } from '../lib/parseRow'

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

type RawRow = Omit<AccidentRow, 'DB_INDEX'>

interface StatPage {
  rawCount: number
  rows: RawRow[]
  rejected: number
  rejectReasons: Partial<Record<RejectReason, number>>
  totalRecords: number | null
}

export interface AccidentStatResult {
  rows: RawRow[]
  // Сколько строк сервер заявил в totalRecords (null — не сообщил)
  totalRecords: number | null
  // Получены все заявленные строки
  isComplete: boolean
  // Строки, отброшенные при разборе (нет ID, некорректная дата)
  rejected: number
  rejectReasons: Partial<Record<RejectReason, number>>
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
  const parsed = parseAccidentRows(stat.data)
  return {
    rawCount: stat.data.length,
    rows: parsed.rows,
    rejected: parsed.rejected,
    rejectReasons: parsed.rejectReasons,
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
  // Размер порции — по сырому ответу, до отбраковки строк
  const pageSize = first.rawCount

  const collected: StatPage[] = [first]

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
      collected.push(page.value)
    }
  }

  // Между запросами страниц в базе могли добавиться/сторнироваться записи —
  // тогда соседние страницы пересекаются. Один ДТП = один ACCIDENT_ID.
  // ACCIDENT_ID после разбора всегда число.
  const seen = new Set<number>()
  const rows: RawRow[] = []
  let rejected = 0
  const rejectReasons: Partial<Record<RejectReason, number>> = {}
  collected.forEach((page) => {
    rejected += page.rejected
    Object.entries(page.rejectReasons).forEach(([reason, count]) => {
      const key = reason as RejectReason
      rejectReasons[key] = (rejectReasons[key] ?? 0) + (count ?? 0)
    })
    page.rows.forEach((row) => {
      if (seen.has(row.ACCIDENT_ID)) return
      seen.add(row.ACCIDENT_ID)
      rows.push(row)
    })
  })

  // Полнота — по числу уникальных полученных записей, включая отбракованные:
  // отбраковка показывается отдельным предупреждением.
  const isComplete = total === null || rows.length + rejected >= total
  if (!isComplete) {
    console.warn('[api] DashboardAccidentStat: получено меньше строк, чем totalRecords', {
      dbIndex,
      received: rows.length,
      totalRecords: total,
    })
  }

  return { rows, totalRecords: total, isComplete, rejected, rejectReasons }
}
