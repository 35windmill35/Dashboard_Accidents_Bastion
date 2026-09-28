import { describe, expect, it } from 'vitest'
import { parseAccidentRow, parseAccidentRows, toNumberOrNull } from '../parseRow'

const today = new Date(2026, 8, 28)

describe('parseAccidentRow', () => {
  it('приводит суммы-строки к числам', () => {
    const parsed = parseAccidentRow(
      { ACCIDENT_ID: '7', ACCIDENT_DATE: '2026-08-01', ACCIDENT_DAMAGE: '1 500,50' },
      today
    )
    expect(parsed.ok && parsed.row.ACCIDENT_DAMAGE).toBe(1500.5)
    expect(parsed.ok && parsed.row.ACCIDENT_ID).toBe(7)
  })

  it('мусор в сумме — null, а не NaN', () => {
    expect(toNumberOrNull('abc')).toBeNull()
    expect(toNumberOrNull('')).toBeNull()
  })

  it('обрезает пробелы в строках, пустые — null', () => {
    const parsed = parseAccidentRow(
      {
        ACCIDENT_ID: 1,
        ACCIDENT_DATE: '2026-08-01',
        ACCIDENT_STATUS_NAME: 'Дело закрыто ',
        ROUTE_NAME: '  ',
      },
      today
    )
    expect(parsed.ok && parsed.row.ACCIDENT_STATUS_NAME).toBe('Дело закрыто')
    expect(parsed.ok && parsed.row.ROUTE_NAME).toBeNull()
  })

  it.each([
    ['19.08.2026', 'badDate'],
    ['2026-13-01', 'badDate'],
    ['2026-02-30', 'badDate'],
    ['1900-01-01', 'badDate'],
    ['2062-08-01', 'futureDate'],
  ])('отбрасывает дату %s', (date, reason) => {
    expect(parseAccidentRow({ ACCIDENT_ID: 1, ACCIDENT_DATE: date }, today)).toEqual({
      ok: false,
      reason,
    })
  })

  it('отбрасывает строку без ID', () => {
    expect(parseAccidentRow({ ACCIDENT_DATE: '2026-08-01' }, today)).toEqual({
      ok: false,
      reason: 'noId',
    })
  })

  it('считает отбракованные по причинам', () => {
    const result = parseAccidentRows(
      [
        { ACCIDENT_ID: 1, ACCIDENT_DATE: '2026-08-01' },
        { ACCIDENT_ID: 2, ACCIDENT_DATE: 'кривая' },
        { ACCIDENT_ID: 3, ACCIDENT_DATE: '2099-01-01' },
        null,
      ],
      today
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rejected).toBe(3)
    expect(result.rejectReasons).toEqual({ badDate: 1, futureDate: 1, notObject: 1 })
  })
})
