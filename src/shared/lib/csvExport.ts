// CSV: разделитель «;», UTF-8 с BOM — под русский Excel

// Защита от CSV-инъекции: ячейки, похожие на формулу, превращаются в текст
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

  // Ссылка в DOM и отложенный revoke — иначе Firefox не скачивает файл
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
