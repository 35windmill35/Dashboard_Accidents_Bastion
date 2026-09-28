import { describe, expect, it, vi } from 'vitest'
import { sanitizePdfText } from '../pdfKit'

describe('символы PDF', () => {
  it('казахские буквы и тенге есть в шрифте', () => {
    const text = 'Сулеймен Нурлан Летайұлы, Әлібек Қожа, Ғани, Өмір, Үміт, Һ — 1 500 ₸ №3'
    expect(sanitizePdfText(text)).toBe(text)
  })
  it('узкие пробелы и неразрывный дефис заменяются на имеющиеся', () => {
    expect(sanitizePdfText('1 500‑А​')).toBe('1 500-А')
  })
  it('неизвестный символ — «?» с предупреждением', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(sanitizePdfText('знак ⚠')).toBe('знак ?')
    expect(warn).toHaveBeenCalledOnce()
  })
})
