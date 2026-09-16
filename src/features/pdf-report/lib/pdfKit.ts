import type { jsPDF } from 'jspdf'
import { plexSansRegular } from './fonts/plexSansRegular'
import { plexSansSemiBold } from './fonts/plexSansSemiBold'
import { plexMonoRegular } from './fonts/plexMonoRegular'
import { plexMonoSemiBold } from './fonts/plexMonoSemiBold'

export type Rgb = readonly [number, number, number]

// A4 книжная, единицы — типографские пункты.
export const PAGE = {
  width: 595.28,
  height: 841.89,
  marginX: 36,
  marginTop: 30,
  marginBottom: 38,
} as const

export const CONTENT_WIDTH = PAGE.width - PAGE.marginX * 2

// Палитра отчёта — печатная, не совпадает с темой интерфейса: PDF всегда
// светлый, на белой бумаге.
export const COLOR = {
  ink: [26, 32, 38],
  secondary: [96, 106, 116],
  muted: [145, 152, 159],
  hairline: [239, 241, 243],
  line: [229, 232, 235],
  lineStrong: [212, 216, 221],
  accent: [31, 108, 176],
  teal: [59, 172, 166],
  positive: [52, 108, 66],
  negative: [160, 64, 52],
  highlight: [241, 246, 250],
  white: [255, 255, 255],
} as const satisfies Record<string, Rgb>

export const FONT_SANS = 'PlexSans'
export const FONT_MONO = 'PlexMono'

// Встроенные шрифты jsPDF (helvetica и прочие) физически не содержат
// кириллицы — вместо текста получается мусор вида "0H1>@4". Поэтому в
// документ подкладываются подмножества IBM Plex.
export function registerPdfFonts(doc: jsPDF): void {
  doc.addFileToVFS('PlexSans-Regular.ttf', plexSansRegular)
  doc.addFont('PlexSans-Regular.ttf', FONT_SANS, 'normal')
  doc.addFileToVFS('PlexSans-SemiBold.ttf', plexSansSemiBold)
  doc.addFont('PlexSans-SemiBold.ttf', FONT_SANS, 'bold')
  doc.addFileToVFS('PlexMono-Regular.ttf', plexMonoRegular)
  doc.addFont('PlexMono-Regular.ttf', FONT_MONO, 'normal')
  doc.addFileToVFS('PlexMono-SemiBold.ttf', plexMonoSemiBold)
  doc.addFont('PlexMono-SemiBold.ttf', FONT_MONO, 'bold')
}

export interface TextStyle {
  font?: 'sans' | 'mono'
  weight?: 'normal' | 'bold'
  size?: number
  color?: Rgb
  align?: 'left' | 'center' | 'right'
  charSpace?: number
}

function applyTextStyle(doc: jsPDF, style: TextStyle): void {
  doc.setFont(style.font === 'mono' ? FONT_MONO : FONT_SANS, style.weight ?? 'normal')
  doc.setFontSize(style.size ?? 8)
  const color = style.color ?? COLOR.ink
  doc.setTextColor(color[0], color[1], color[2])
  doc.setCharSpace(style.charSpace ?? 0)
}

export function drawText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  style: TextStyle = {}
): void {
  applyTextStyle(doc, style)
  doc.text(text, x, y, { align: style.align ?? 'left', baseline: 'alphabetic' })
  doc.setCharSpace(0)
}

export function measureText(doc: jsPDF, text: string, style: TextStyle = {}): number {
  applyTextStyle(doc, style)
  const width = doc.getTextWidth(text) + (style.charSpace ?? 0) * Math.max(0, text.length - 1)
  doc.setCharSpace(0)
  return width
}

// Обрезает строку по ширине колонки с многоточием — длинные ФИО и адреса в
// таблицах не должны наезжать на соседние колонки.
export function fitText(doc: jsPDF, text: string, maxWidth: number, style: TextStyle = {}): string {
  if (measureText(doc, text, style) <= maxWidth) return text

  let cut = text
  while (cut.length > 1 && measureText(doc, `${cut}…`, style) > maxWidth) {
    cut = cut.slice(0, -1)
  }
  return `${cut.trimEnd()}…`
}

// Перенос по словам с ограничением по числу строк (последняя обрезается).
export function wrapText(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  style: TextStyle = {},
  maxLines = 2
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word
    if (measureText(doc, candidate, style) <= maxWidth || !current) {
      current = candidate
      return
    }
    lines.push(current)
    current = word
  })

  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines

  const trimmed = lines.slice(0, maxLines)
  trimmed[maxLines - 1] = fitText(doc, trimmed[maxLines - 1], maxWidth, style)
  return trimmed
}

export function drawLine(
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: Rgb = COLOR.line,
  width = 0.5
): void {
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setLineWidth(width)
  doc.line(x1, y1, x2, y2)
}

interface RectOptions {
  fill?: Rgb
  stroke?: Rgb
  lineWidth?: number
  radius?: number
}

export function drawRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  options: RectOptions = {}
): void {
  const { fill, stroke, lineWidth = 0.5, radius = 0 } = options
  if (!fill && !stroke) return

  if (fill) doc.setFillColor(fill[0], fill[1], fill[2])
  if (stroke) {
    doc.setDrawColor(stroke[0], stroke[1], stroke[2])
    doc.setLineWidth(lineWidth)
  }

  const mode = fill && stroke ? 'FD' : fill ? 'F' : 'S'
  if (radius > 0) doc.roundedRect(x, y, w, h, radius, radius, mode)
  else doc.rect(x, y, w, h, mode)
}

// Плашка легенды: цветной квадрат + подпись, возвращает занятую ширину.
export function drawLegendChip(
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
  color: Rgb
): number {
  const box = 5
  drawRect(doc, x, y - box + 1, box, box, { fill: color, radius: 1 })
  const style: TextStyle = { font: 'mono', size: 6.2, color: COLOR.secondary }
  drawText(doc, label, x + box + 3.5, y, style)
  return box + 3.5 + measureText(doc, label, style)
}
