// Экспорт таблиц в CSV — разделитель ";" (под русский Excel), UTF-8 с BOM,
// иначе кириллица и разделитель по умолчанию расходятся в локальной версии
// Excel пользователя.
function escapeCsvCell(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(';'))
  const content = '﻿' + lines.join('\r\n')

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}
