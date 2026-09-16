import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import type { PdfReportFilename, PdfReportMeta, PdfSection } from './pdfTypes'

const MARGIN = 24
const SECTION_GAP = 14
const CAPTURE_SCALE = 2
// PDF всегда светлый вне зависимости от текущей темы интерфейса — фон под
// растровые секции должен совпадать со светлой темой, иначе прозрачные
// края карточек дадут тёмную рамку.
const LIGHT_CAPTURE_BG = '#f5f6f8'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function buildFilename({ screenSlug, periodSlug }: PdfReportFilename): string {
  const now = new Date()
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(
    now.getHours()
  )}${pad2(now.getMinutes())}`
  return `dtp-${screenSlug}-${periodSlug}-${stamp}.pdf`
}

// Временно переключает <html data-theme> на светлую тему на время захвата
// html2canvas — по решению заказчика PDF всегда светлый, независимо от
// темы, в которой пользователь смотрит дашборд. Двойной requestAnimationFrame
// даёт браузеру пересчитать стили и перерисовать DOM перед снимком.
async function withLightTheme<T>(fn: () => Promise<T>): Promise<T> {
  const root = document.documentElement
  const previous = root.getAttribute('data-theme')
  root.setAttribute('data-theme', 'light')

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  try {
    return await fn()
  } finally {
    if (previous === null) root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', previous)
  }
}

function ensureSpace(
  doc: jsPDF,
  cursorY: number,
  neededHeight: number,
  pageHeight: number
): number {
  if (cursorY + neededHeight <= pageHeight - MARGIN) return cursorY
  doc.addPage()
  return MARGIN
}

function drawTitleBlock(doc: jsPDF, meta: PdfReportMeta, pageWidth: number): number {
  let y = MARGIN + 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(23, 24, 28)
  doc.text(`Дашборд ДТП — ${meta.screenName}`, MARGIN, y)
  y += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(99, 103, 111)
  meta.filtersLines.forEach((line) => {
    doc.text(line, MARGIN, y)
    y += 13
  })

  const generatedLabel = `Сформировано: ${new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())}`
  doc.text(generatedLabel, MARGIN, y)
  y += 10

  doc.setDrawColor(220, 223, 228)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)

  return y + SECTION_GAP
}

async function captureImageSection(
  doc: jsPDF,
  ref: Extract<PdfSection, { kind: 'image' }>['ref'],
  cursorY: number,
  pageWidth: number,
  pageHeight: number
): Promise<number> {
  const node = ref.current
  if (!node) throw new Error('раздел не найден в DOM (нет ссылки на элемент)')

  const canvas = await html2canvas(node, {
    scale: CAPTURE_SCALE,
    backgroundColor: LIGHT_CAPTURE_BG,
    useCORS: true,
    logging: false,
  })

  const contentWidth = pageWidth - MARGIN * 2
  const maxHeight = pageHeight - MARGIN * 2
  const aspect = canvas.height / canvas.width

  let drawWidth = contentWidth
  let drawHeight = drawWidth * aspect
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = drawHeight / aspect
  }

  const y = ensureSpace(doc, cursorY, drawHeight, pageHeight)
  const x = MARGIN + (contentWidth - drawWidth) / 2
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawWidth, drawHeight)

  return y + drawHeight + SECTION_GAP
}

function drawTableSection(
  doc: jsPDF,
  section: Extract<PdfSection, { kind: 'table' }>,
  cursorY: number,
  pageHeight: number
): number {
  const titleHeight = 16
  // Грубая оценка — только чтобы решить, начинать ли раздел на этой
  // странице; точное непрерывное позиционирование строк — на autoTable
  // (pageBreak: 'avoid' переносит таблицу целиком на новую страницу, а не
  // разрезает её посередине).
  const estimatedRowHeight = 16
  const estimatedTableHeight = Math.min(
    estimatedRowHeight * (section.rows.length + 1) + titleHeight + SECTION_GAP,
    pageHeight - MARGIN * 2
  )

  let y = ensureSpace(doc, cursorY, estimatedTableHeight, pageHeight)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(23, 24, 28)
  doc.text(section.title, MARGIN, y + 10)
  y += titleHeight

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [section.columns.map((c) => c.header)],
    body: section.rows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, textColor: [23, 24, 28], lineColor: [220, 223, 228] },
    headStyles: { fillColor: [238, 240, 243], textColor: [23, 24, 28] },
    columnStyles: Object.fromEntries(
      section.columns.map((c, i) => [i, { halign: c.align === 'right' ? 'right' : 'left' }])
    ),
    pageBreak: 'avoid',
  })

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y
  y = finalY + 10

  if (section.caption) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(99, 103, 111)
    doc.text(section.caption, MARGIN, y)
    y += 12
  }

  return y + SECTION_GAP
}

// Собирает PDF по описанию разделов: заголовок один раз, дальше секции
// подряд (картинка графика/KPI-строки либо таблица) с переносом на новую
// страницу, если раздел целиком не помещается на текущей. Отказ одной
// секции (не нашли DOM-узел, html2canvas упал и т.п.) не должен прерывать
// формирование остальных — тот же принцип частичного отказа, что и при
// параллельной загрузке данных по базам на шаге 3.
export async function generatePdfReport(
  meta: PdfReportMeta,
  sections: PdfSection[],
  filename: PdfReportFilename,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  await withLightTheme(async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    let cursorY = drawTitleBlock(doc, meta, pageWidth)

    for (let i = 0; i < sections.length; i += 1) {
      const section = sections[i]
      try {
        if (section.kind === 'image') {
          cursorY = await captureImageSection(doc, section.ref, cursorY, pageWidth, pageHeight)
        } else {
          cursorY = drawTableSection(doc, section, cursorY, pageHeight)
        }
      } catch (err) {
        console.error(`[pdf-report] секция "${section.key}" не сформирована:`, err)
      }
      onProgress?.(i + 1, sections.length)
    }

    doc.save(buildFilename(filename))
  })
}
