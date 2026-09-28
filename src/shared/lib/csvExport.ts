// Экспорт таблиц в CSV — разделитель ";" (под русский Excel), UTF-8 с BOM,
// иначе кириллица и разделитель по умолчанию расходятся в локальной версии
// Excel пользователя.

// Ячейка, начинающаяся с этих символов, Excel/LibreOffice считают формулой
// (CSV-injection). Такие значения приходят из полей, которые вводят люди
// (адрес, ФИО, комментарий), поэтому перед ними ставится апостроф — он
// превращает ячейку в текст и в самой таблице не виден.
const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function escapeCsvCell(raw: string): string {
  const isPlainNumber = /^-?\d+([.,]\d+)?$/.test(raw)
  const value = !isPlainNumber && FORMULA_PREFIX.test(raw) ? `'${raw}` : raw
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(';'))
  return '\uFEFF' + lines.join('\r\n')
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const blob = new Blob([buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  // Ссылка должна быть в документе, а URL — жить до начала скачивания:
  // Firefox и старый Safari иначе молча ничего не скачивают.
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()

  setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 0)
}
