import { describe, expect, it } from 'vitest'
import { formatCompactCurrency, formatDate, formatTime, kpiDelta } from '../formatters'
import { buildCsv, escapeCsvCell } from '../csvExport'
import { encodeBasicCredentials } from '@/shared/api/httpClient'

describe('дельты KPI', () => {
  it('доли — в процентных пунктах', () => {
    expect(kpiDelta('percent', 0.5, 0.4)?.text).toBe('+10 п.п.')
  })
  it('количества и суммы — в процентах', () => {
    expect(kpiDelta('count', 15, 10)?.text).toBe('+50%')
    expect(kpiDelta('currency', 10, 0)).toBeNull()
  })
})

describe('короткие суммы оси', () => {
  const plain = (value: number) =>
    formatCompactCurrency(value).replace(/\s/g, ' ').replace(/ ?₸$/, '')
  it('без лишнего «,0»', () => {
    expect(plain(340_000_000)).toBe('340 млн')
    expect(plain(85_000_000)).toBe('85 млн')
    expect(plain(42_500_000)).toBe('42,5 млн')
    expect(plain(1_500_000_000)).toBe('1,5 млрд')
    expect(plain(7_500)).toBe('7,5 тыс')
  })
})

describe('даты', () => {
  it('дата без сдвига часового пояса', () => {
    expect(formatDate('2026-04-19T00:00:00Z')).toBe('19.04.2026')
  })
  it('12:00 и 00:00 — заглушки импорта, не время', () => {
    expect(formatTime('1900-01-01T12:00:00')).toBe('—')
    expect(formatTime('1900-01-01T00:00:00')).toBe('—')
    expect(formatTime('1900-01-01T08:35:00')).toBe('08:35')
  })
})

describe('CSV', () => {
  it('формулы превращаются в текст', () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil","x")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""x"")"'
    )
    expect(escapeCsvCell('+7 700 000')).toBe("'+7 700 000")
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })
  it('числа, в том числе отрицательные, не трогаются', () => {
    expect(escapeCsvCell('-500')).toBe('-500')
    expect(escapeCsvCell('1500')).toBe('1500')
  })
  it('перевод строки \\r берётся в кавычки', () => {
    expect(escapeCsvCell('a\rb')).toBe('"a\rb"')
  })
  it('BOM и разделитель ;', () => {
    expect(buildCsv(['А', 'Б'], [['1', '2']])).toBe('﻿А;Б\r\n1;2')
  })
})

describe('Basic-авторизация', () => {
  it('кириллица в пароле кодируется в UTF-8, а не роняет вход', () => {
    const encoded = encodeBasicCredentials('79001234567', 'пароль')
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
    expect(new TextDecoder().decode(bytes)).toBe('79001234567:пароль')
  })
})
