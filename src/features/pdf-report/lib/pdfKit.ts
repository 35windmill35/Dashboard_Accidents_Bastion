import type { jsPDF } from 'jspdf'
import { rubikRegular } from './fonts/rubikRegular'
import { rubikMedium } from './fonts/rubikMedium'
import { rubikTabularRegular } from './fonts/rubikTabularRegular'
import { rubikTabularMedium } from './fonts/rubikTabularMedium'

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

// Палитра отчёта — светлая тема интерфейса (PDF всегда светлый, на белой
// бумаге), те же цвета, что на экране: см. app/styles/theme.css
// ([data-theme='light']) и shared/lib/chartColors.ts (LIGHT). Держать в паре.
export const COLOR = {
  ink: [23, 32, 51], // --color-text
  title: [11, 18, 32], // --color-title
  secondary: [86, 97, 120], // --color-text-secondary
  muted: [107, 117, 137], // --color-text-faint
  hairline: [237, 240, 245], // сетка графиков, разделители строк
  line: [226, 230, 237], // рамки карточек
  lineStrong: [205, 211, 222], // базовая линия осей, шапка таблиц
  accent: [29, 99, 237], // --color-accent / серия «ДТП», «Ущерб», автоколонна A
  teal: [0, 144, 156], // --color-chart-2 / автоколонна B
  compensation: [14, 138, 95], // --color-chart-compensation / «Возмещение»
  positive: [10, 127, 87], // --color-positive
  negative: [212, 42, 42], // --color-negative
  highlight: [241, 245, 254], // --color-accent-soft на белом
  surface: [250, 251, 253], // --color-surface-end: фон KPI-карточек
  white: [255, 255, 255],
} as const satisfies Record<string, Rgb>

// Rubik — тот же шрифт, что в интерфейсе. Два начертания: обычное и Medium
// (в jsPDF оно регистрируется как 'bold'). «mono» — Rubik с моноширинными
// цифрами (вшита OpenType-функция tnum): суммы в колонках таблиц и на осях
// выравниваются по разрядам, как tabular-nums на экране.
export const FONT_SANS = 'Rubik'
export const FONT_MONO = 'RubikTabular'

// Встроенные шрифты jsPDF (helvetica и прочие) физически не содержат
// кириллицы — вместо текста получается мусор вида "0H1>@4". Поэтому в
// документ подкладываются подмножества Rubik (см. fonts/).
export function registerPdfFonts(doc: jsPDF): void {
  doc.addFileToVFS('Rubik-Regular.ttf', rubikRegular)
  doc.addFont('Rubik-Regular.ttf', FONT_SANS, 'normal')
  doc.addFileToVFS('Rubik-Medium.ttf', rubikMedium)
  doc.addFont('Rubik-Medium.ttf', FONT_SANS, 'bold')
  doc.addFileToVFS('RubikTabular-Regular.ttf', rubikTabularRegular)
  doc.addFont('RubikTabular-Regular.ttf', FONT_MONO, 'normal')
  doc.addFileToVFS('RubikTabular-Medium.ttf', rubikTabularMedium)
  doc.addFont('RubikTabular-Medium.ttf', FONT_MONO, 'bold')
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
  drawRect(doc, x, y - box + 0.5, box, box, { fill: color, radius: 1.2 })
  const style: TextStyle = { size: 6.4, color: COLOR.secondary }
  drawText(doc, label, x + box + 3.5, y, style)
  return box + 3.5 + measureText(doc, label, style)
}
