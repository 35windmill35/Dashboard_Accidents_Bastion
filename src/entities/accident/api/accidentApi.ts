import { ApiError, getAuthorized } from '@/shared/api/httpClient'
import { mapWithConcurrencyLimit } from '@/shared/lib/concurrencyLimit'
import { t } from '@/shared/i18n'
import type { AccidentRow } from '../model/types'
import { parseAccidentRows, type RejectReason } from '../lib/parseRow'

// Ответ приходит порциями, остальное дозапрашивается через Offset
const PAGE_CONCURRENCY = 3
// Предохранитель от бесконечного цикла
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
  totalRecords: number | null
  isComplete: boolean
  rejected: number
  rejectReasons: Partial<Record<RejectReason, number>>
}

async function fetchPage(dbIndex: number, offset: number, signal?: AbortSignal): Promise<StatPage> {
  const { data } = await getAuthorized<StatResponse>('/api-v2/Dashboard/DashboardAccidentStat', {
    params: offset > 0 ? { DBIndex: dbIndex, Offset: offset } : { DBIndex: dbIndex },
    signal,
  })

  const stat = data?.DashboardAccidentStat
  // Неожиданная форма ответа — ошибка базы, а не «ДТП нет»
  if (!stat || !Array.isArray(stat.data)) {
    throw new ApiError(-1, t('roadAccidents.error.badStatResponse'), data)
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

// Отказ любой страницы — отказ базы целиком
export async function getAccidentStat(
  dbIndex: number,
  signal?: AbortSignal
): Promise<AccidentStatResult> {
  const first = await fetchPage(dbIndex, 0, signal)
  const total = first.totalRecords
  // Размер порции — по сырому ответу, до отбраковки
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

  // Соседние страницы могут пересекаться — дедупликация по ACCIDENT_ID
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
