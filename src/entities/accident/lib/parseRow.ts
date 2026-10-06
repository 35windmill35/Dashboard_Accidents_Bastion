import { t } from '@/shared/i18n'
import type { AccidentRow } from '../model/types'

// Разбор строки ответа: числа-строки → числа, trim строк,
// строки без ID или с некорректной датой отбрасываются.

export type RejectReason = 'notObject' | 'noId' | 'badDate' | 'futureDate'

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  notObject: t('roadAccidents.reject.notObject'),
  noId: t('roadAccidents.reject.noId'),
  badDate: t('roadAccidents.reject.badDate'),
  futureDate: t('roadAccidents.reject.futureDate'),
}

export type ParsedRow =
  { ok: true; row: Omit<AccidentRow, 'DB_INDEX'> } | { ok: false; reason: RejectReason }

const NUMBER_FIELDS = [
  'ACCIDENT_ID',
  'DRIVER_ID',
  'CAR_ID',
  'MOTORCADE_ID',
  'ROUTE_ID',
  'INSURANCE_COMPANY_ID',
  'ACCIDENT_STATUS_ID',
  'ACCIDENT_CAUSE_ID',
  'ACCIDENT_DAMAGE',
  'ACCIDENT_COMPENSATED_DAMAGE',
] as const

const STRING_FIELDS = [
  'ACCIDENT_DATE',
  'ACCIDENT_TIME',
  'DRIVER_NAME',
  'GARAGE_NUM',
  'CAR_MAKE_MODEL',
  'MARK',
  'MODEL_NAME',
  'SUBMODEL',
  'FUEL_NAME',
  'CAR_OWNER',
  'CURRENCY_CODE',
  'CURRENCY_NAME',
  'MOTORCADE_NAME',
  'ROUTE_NAME',
  'ACCIDENT_ADDRESS',
  'INSURANCE_COMPANY_NAME',
  'ACCIDENT_INSURANCE_CASE_NUMBER',
  'ACCIDENT_INSURANCE_CASE_DATE',
  'ACCIDENT_STATUS_NAME',
  'ACCIDENT_CAUSE_NAME',
  'ACCIDENT_CAUSER_NAME',
  'ACCIDENT_DETAILS',
  'ACCIDENT_COMMENT',
  'ACCIDENT_VICTIM',
] as const

const MIN_YEAR = 1990

export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return null
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

export function toTrimmedOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

// Не позже завтра — запас на разницу часовых поясов
export function validateAccidentDate(
  value: string | null,
  today: Date = new Date()
): RejectReason | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (!match) return 'badDate'
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < MIN_YEAR || month < 1 || month > 12 || day < 1) return 'badDate'
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return 'badDate'
  const tomorrow = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  if (utc.getTime() > tomorrow) return 'futureDate'
  return null
}

export function parseAccidentRow(raw: unknown, today: Date = new Date()): ParsedRow {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'notObject' }
  }
  const source = raw as Record<string, unknown>
  const row: Record<string, unknown> = { ...source }

  NUMBER_FIELDS.forEach((field) => {
    row[field] = toNumberOrNull(source[field])
  })
  STRING_FIELDS.forEach((field) => {
    row[field] = toTrimmedOrNull(source[field])
  })
  row.ACCIDENT_IS_CASE_CLOSED = toBoolean(source.ACCIDENT_IS_CASE_CLOSED)

  if (row.ACCIDENT_ID === null) return { ok: false, reason: 'noId' }

  const dateError = validateAccidentDate(row.ACCIDENT_DATE as string | null, today)
  if (dateError) return { ok: false, reason: dateError }

  return { ok: true, row: row as unknown as Omit<AccidentRow, 'DB_INDEX'> }
}

export interface ParsedRows {
  rows: Omit<AccidentRow, 'DB_INDEX'>[]
  rejected: number
  rejectReasons: Partial<Record<RejectReason, number>>
}

export function parseAccidentRows(rawRows: unknown[], today: Date = new Date()): ParsedRows {
  const rows: Omit<AccidentRow, 'DB_INDEX'>[] = []
  const rejectReasons: Partial<Record<RejectReason, number>> = {}
  let rejected = 0

  rawRows.forEach((raw) => {
    const parsed = parseAccidentRow(raw, today)
    if (parsed.ok) {
      rows.push(parsed.row)
    } else {
      rejected += 1
      rejectReasons[parsed.reason] = (rejectReasons[parsed.reason] ?? 0) + 1
    }
  })

  return { rows, rejected, rejectReasons }
}
