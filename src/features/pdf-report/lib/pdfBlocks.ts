import type { jsPDF } from 'jspdf'
import {
  COLOR,
  drawLegendChip,
  drawLine,
  drawRect,
  drawText,
  fitText,
  measureText,
  wrapText,
  type Rgb,
  type TextStyle,
} from './pdfKit'
import type { Block } from './pdfFlow'

const CARD_PAD_X = 10
const CARD_PAD_TOP = 9
const CARD_PAD_BOTTOM = 9
const CARD_TITLE_OFFSET = 8
const CARD_BODY_OFFSET = 23
const CARD_LEGEND_LINE = 11
const NOTE_OFFSET = 8

export interface LegendItem {
  label: string
  color: Rgb
}

interface CardOptions {
  title?: string
  legend?: LegendItem[]
  bodyHeight: number
  note?: string
  drawBody: (bodyX: number, bodyY: number, bodyWidth: number) => void
}

// Общая рамка карточки: заголовок слева, легенда справа, тело фиксированной
// высоты, необязательная подпись-вывод под телом.
export function card(doc: jsPDF, x: number, width: number, options: CardOptions): Block {
  const { title, legend, bodyHeight, note, drawBody } = options
  const titleStyle: TextStyle = { weight: 'bold', size: 8.6, color: COLOR.title }
  const innerWidth = width - CARD_PAD_X * 2

  const legendWidths = (legend ?? []).map(
    (item) => 8.5 + measureText(doc, item.label, { size: 6.4 })
  )
  const legendWidth =
    legendWidths.length > 0
      ? legendWidths.reduce((sum, w) => sum + w, 0) + (legendWidths.length - 1) * 8
      : 0

  // В узкой карточке легенда не влезает в одну строку с заголовком — тогда
  // она уезжает на свою строку, а тело карточки сдвигается вниз.
  const legendInline =
    legendWidth === 0 ||
    !title ||
    measureText(doc, title, titleStyle) + legendWidth + 12 <= innerWidth

  const bodyOffset =
    (title ? CARD_BODY_OFFSET : CARD_PAD_TOP) +
    (legendWidth > 0 && !legendInline ? CARD_LEGEND_LINE : 0)

  const noteStyle: TextStyle = { size: 6.4, color: COLOR.secondary }
  const noteLines = note ? wrapText(doc, note, innerWidth, noteStyle, 2) : []
  const height =
    bodyOffset +
    bodyHeight +
    (noteLines.length > 0 ? NOTE_OFFSET + noteLines.length * 8 : 0) +
    CARD_PAD_BOTTOM

  return {
    height,
    draw: (y) => {
      drawRect(doc, x, y, width, height, {
        stroke: COLOR.line,
        lineWidth: 0.6,
        radius: 4,
      })

      const titleBaseline = y + CARD_PAD_TOP + CARD_TITLE_OFFSET
      if (title) {
        drawText(
          doc,
          fitText(doc, title, innerWidth, titleStyle),
          x + CARD_PAD_X,
          titleBaseline,
          titleStyle
        )
      }

      if (legend && legend.length > 0) {
        const legendBaseline = legendInline ? titleBaseline : titleBaseline + CARD_LEGEND_LINE
        let legendX = legendInline ? x + width - CARD_PAD_X - legendWidth : x + CARD_PAD_X
        legend.forEach((item, index) => {
          drawLegendChip(doc, item.label, legendX, legendBaseline, item.color)
          legendX += legendWidths[index] + 8
        })
      }

      const bodyX = x + CARD_PAD_X
      const bodyY = y + bodyOffset
      drawBody(bodyX, bodyY, innerWidth)

      noteLines.forEach((noteLine, index) => {
        drawText(doc, noteLine, bodyX, bodyY + bodyHeight + NOTE_OFFSET + index * 8, noteStyle)
      })
    },
  }
}

// "Красивый" максимум оси: округляет вверх до 1/2/5 × 10^n, чтобы подписи
// делений были целыми.
function niceMax(value: number, steps: number): number {
  if (value <= 0) return steps
  const rough = value / steps
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  return nice * magnitude * steps
}

// Для счётных осей деления должны быть целыми, иначе подписи дублируются
// ("2, 2, 1, 1, 0" при максимуме 2).
function resolveSteps(top: number, integerTicks: boolean): number {
  if (!integerTicks) return 4
  const candidates = [4, 5, 3, 2, 1]
  return candidates.find((steps) => steps <= top && Number.isInteger(top / steps)) ?? 1
}

interface AxisChartOptions {
  height: number
  formatTick: (value: number) => string
  labelLines: 1 | 2
  integerTicks?: boolean
}

interface AxisGeometry {
  plotX: number
  plotW: number
  plotTop: number
  baseline: number
  scale: (value: number) => number
}

function drawAxis(
  doc: jsPDF,
  bodyX: number,
  bodyY: number,
  bodyWidth: number,
  maxValue: number,
  options: AxisChartOptions
): AxisGeometry {
  // Пустой период: шкалу рисовать не из чего, показываем только нулевую
  // линию — деления "4 ₸, 3 ₸, 2 ₸" на пустых данных выглядят как ошибка.
  const isEmpty = maxValue <= 0
  const top = isEmpty ? 0 : niceMax(maxValue, 4)
  const ticks = isEmpty ? 0 : resolveSteps(top, options.integerTicks ?? false)
  const labelHeight = options.labelLines === 2 ? 17 : 11
  const axisWidth = measureText(doc, options.formatTick(top), { font: 'mono', size: 6 }) + 6

  const plotX = bodyX + axisWidth
  const plotW = bodyWidth - axisWidth
  const plotTop = bodyY + 8
  const baseline = bodyY + options.height - labelHeight
  const scale = (value: number) => (isEmpty ? 0 : ((value / top) * (baseline - plotTop)) | 0)

  for (let i = 0; i <= ticks; i += 1) {
    const value = ticks === 0 ? 0 : (top / ticks) * i
    const y = baseline - scale(value)
    drawLine(doc, plotX, y, plotX + plotW, y, i === 0 ? COLOR.lineStrong : COLOR.hairline, 0.5)
    drawText(doc, options.formatTick(value), plotX - 5, y + 2, {
      font: 'mono',
      size: 6,
      color: COLOR.muted,
      align: 'right',
    })
  }

  return { plotX, plotW, plotTop, baseline, scale }
}

function drawSlotLabels(
  doc: jsPDF,
  items: { label: string; sublabel?: string }[],
  geometry: AxisGeometry,
  slot: number
): void {
  items.forEach((item, index) => {
    const center = geometry.plotX + slot * index + slot / 2
    const isLast = index === items.length - 1
    const style: TextStyle = {
      font: 'mono',
      size: 6,
      color: isLast ? COLOR.ink : COLOR.muted,
      weight: isLast ? 'bold' : 'normal',
      align: 'center',
    }
    drawText(doc, item.label, center, geometry.baseline + 9, style)
    if (item.sublabel) drawText(doc, item.sublabel, center, geometry.baseline + 16, style)
  })
}

export interface BarChartItem {
  label: string
  sublabel?: string
  value: number
}

// Столбчатая диаграмма одного ряда: сетка, подписи делений, значение над
// ненулевыми столбцами (цвет один, поэтому подписи обязательны — на печати
// без них столбцы не прочитать).
export function barChartBody(
  doc: jsPDF,
  items: BarChartItem[],
  options: {
    height: number
    color: Rgb
    formatTick: (value: number) => string
    formatValue: (value: number) => string
    labelLines: 1 | 2
    integerTicks?: boolean
  }
) {
  return (bodyX: number, bodyY: number, bodyWidth: number) => {
    const maxValue = Math.max(0, ...items.map((item) => item.value))
    const geometry = drawAxis(doc, bodyX, bodyY, bodyWidth, maxValue, {
      height: options.height,
      formatTick: options.formatTick,
      labelLines: options.labelLines,
      integerTicks: options.integerTicks,
    })

    const slot = geometry.plotW / Math.max(1, items.length)
    const barWidth = Math.min(slot * 0.5, 22)

    items.forEach((item, index) => {
      const center = geometry.plotX + slot * index + slot / 2
      const barHeight = geometry.scale(item.value)
      if (item.value > 0 && barHeight > 0) {
        drawRect(doc, center - barWidth / 2, geometry.baseline - barHeight, barWidth, barHeight, {
          fill: options.color,
          radius: Math.min(1.5, barHeight / 2),
        })
        drawText(
          doc,
          options.formatValue(item.value),
          center,
          geometry.baseline - barHeight - 3.5,
          {
            font: 'mono',
            weight: 'bold',
            size: 6.2,
            color: COLOR.ink,
            align: 'center',
          }
        )
      }
    })

    drawSlotLabels(doc, items, geometry, slot)
  }
}

export interface GroupedBarItem {
  label: string
  sublabel?: string
  primary: number
  secondary: number
}

// Две серии в одинаковых единицах (ущерб и возмещение) — общая ось, иначе
// сравнивать высоту столбцов нельзя.
export function groupedBarChartBody(
  doc: jsPDF,
  items: GroupedBarItem[],
  options: {
    height: number
    colors: [Rgb, Rgb]
    formatTick: (value: number) => string
    labelLines: 1 | 2
  }
) {
  return (bodyX: number, bodyY: number, bodyWidth: number) => {
    const maxValue = Math.max(0, ...items.flatMap((item) => [item.primary, item.secondary]))
    const geometry = drawAxis(doc, bodyX, bodyY, bodyWidth, maxValue, {
      height: options.height,
      formatTick: options.formatTick,
      labelLines: options.labelLines,
    })

    const slot = geometry.plotW / Math.max(1, items.length)
    const barWidth = Math.min(slot * 0.3, 13)

    items.forEach((item, index) => {
      const center = geometry.plotX + slot * index + slot / 2
      const pairs: [number, Rgb][] = [
        [item.primary, options.colors[0]],
        [item.secondary, options.colors[1]],
      ]

      pairs.forEach(([value, color], pairIndex) => {
        const barHeight = geometry.scale(value)
        if (value <= 0 || barHeight <= 0) return
        const offset = pairIndex === 0 ? -barWidth - 0.6 : 0.6
        drawRect(doc, center + offset, geometry.baseline - barHeight, barWidth, barHeight, {
          fill: color,
          radius: Math.min(1.2, barHeight / 2),
        })
      })
    })

    drawSlotLabels(doc, items, geometry, slot)
  }
}

export interface RankedBarRow {
  label: string
  value: number
  formatted: string
}

export const RANKED_ROW_HEIGHT = 17

// Горизонтальные полосы в одну строку: подпись — полоса — значение.
// Используется для распределения по автоколоннам.
export function rankedBarsBody(
  doc: jsPDF,
  rows: RankedBarRow[],
  options: { color: Rgb; labelRatio?: number }
) {
  return (bodyX: number, bodyY: number, bodyWidth: number) => {
    const labelWidth = bodyWidth * (options.labelRatio ?? 0.34)
    const valueWidth = Math.max(
      ...rows.map((row) =>
        measureText(doc, row.formatted, { font: 'mono', weight: 'bold', size: 7 })
      ),
      20
    )
    const trackX = bodyX + labelWidth + 6
    const trackWidth = Math.max(10, bodyWidth - labelWidth - valueWidth - 18)
    const maxValue = Math.max(1, ...rows.map((row) => row.value))

    rows.forEach((row, index) => {
      const rowY = bodyY + index * RANKED_ROW_HEIGHT
      const textStyle: TextStyle = { size: 7.2, color: COLOR.ink }
      drawText(doc, fitText(doc, row.label, labelWidth, textStyle), bodyX, rowY + 8, textStyle)

      drawRect(doc, trackX, rowY + 3, trackWidth, 6, { fill: COLOR.hairline, radius: 1 })
      const fillWidth = Math.max(1.5, (row.value / maxValue) * trackWidth)
      if (row.value > 0) {
        drawRect(doc, trackX, rowY + 3, fillWidth, 6, { fill: options.color, radius: 1 })
      }

      drawText(doc, row.formatted, bodyX + bodyWidth, rowY + 8, {
        font: 'mono',
        weight: 'bold',
        size: 7,
        color: COLOR.ink,
        align: 'right',
      })
    })
  }
}

export interface DualBarRow {
  label: string
  primary: number
  secondary: number
  formatted: string
}

export const DUAL_ROW_HEIGHT = 20

// Две полосы на строку (ущерб и возмещение по одной автоколонне) — общий
// масштаб, чтобы доля возмещения читалась по длине полос.
export function dualBarsBody(
  doc: jsPDF,
  rows: DualBarRow[],
  options: { colors: [Rgb, Rgb]; labelRatio?: number }
) {
  return (bodyX: number, bodyY: number, bodyWidth: number) => {
    const labelWidth = bodyWidth * (options.labelRatio ?? 0.32)
    const valueWidth = Math.max(
      ...rows.map((row) =>
        measureText(doc, row.formatted, { font: 'mono', weight: 'bold', size: 7 })
      ),
      28
    )
    const trackX = bodyX + labelWidth + 6
    const trackWidth = Math.max(10, bodyWidth - labelWidth - valueWidth - 18)
    const maxValue = Math.max(1, ...rows.flatMap((row) => [row.primary, row.secondary]))

    rows.forEach((row, index) => {
      const rowY = bodyY + index * DUAL_ROW_HEIGHT
      const textStyle: TextStyle = { size: 7.2, color: COLOR.ink }
      drawText(doc, fitText(doc, row.label, labelWidth, textStyle), bodyX, rowY + 9, textStyle)

      const bars: [number, Rgb][] = [
        [row.primary, options.colors[0]],
        [row.secondary, options.colors[1]],
      ]
      bars.forEach(([value, color], barIndex) => {
        const barY = rowY + 2.5 + barIndex * 6
        drawRect(doc, trackX, barY, trackWidth, 4.5, { fill: COLOR.hairline, radius: 1 })
        if (value > 0) {
          const fillWidth = Math.max(1.5, (value / maxValue) * trackWidth)
          drawRect(doc, trackX, barY, fillWidth, 4.5, { fill: color, radius: 1 })
        }
      })

      drawText(doc, row.formatted, bodyX + bodyWidth, rowY + 9, {
        font: 'mono',
        weight: 'bold',
        size: 7,
        color: COLOR.ink,
        align: 'right',
      })
    })
  }
}

export interface DistributionRow {
  label: string
  value: number
  formatted: string
}

export const DISTRIBUTION_ROW_HEIGHT = 21

// Подпись над полосой во всю ширину — для структуры причин, где названия
// категорий длинные и в одну строку с полосой не помещаются.
export function distributionBody(doc: jsPDF, rows: DistributionRow[], color: Rgb) {
  return (bodyX: number, bodyY: number, bodyWidth: number) => {
    const maxValue = Math.max(1, ...rows.map((row) => row.value))

    rows.forEach((row, index) => {
      const rowY = bodyY + index * DISTRIBUTION_ROW_HEIGHT
      const labelStyle: TextStyle = { size: 7.2, color: COLOR.ink }
      const valueWidth = measureText(doc, row.formatted, {
        font: 'mono',
        weight: 'bold',
        size: 7.2,
      })

      drawText(
        doc,
        fitText(doc, row.label, bodyWidth - valueWidth - 8, labelStyle),
        bodyX,
        rowY + 7,
        labelStyle
      )
      drawText(doc, row.formatted, bodyX + bodyWidth, rowY + 7, {
        font: 'mono',
        weight: 'bold',
        size: 7.2,
        color: COLOR.ink,
        align: 'right',
      })

      drawRect(doc, bodyX, rowY + 11, bodyWidth, 5, { fill: COLOR.hairline, radius: 1 })
      if (row.value > 0) {
        const fillWidth = Math.max(1.5, (row.value / maxValue) * bodyWidth)
        drawRect(doc, bodyX, rowY + 11, fillWidth, 5, { fill: color, radius: 1 })
      }
    })
  }
}

export interface TableColumn {
  header: string
  ratio: number
  align?: 'left' | 'right'
  mono?: boolean
}

export interface TableRow {
  cells: string[]
  emphasized?: boolean
  highlighted?: boolean
}

const TABLE_HEADER_HEIGHT = 15
const TABLE_ROW_HEIGHT = 15

// Таблица нативным текстом (не растр): шапка капсом, числовые колонки
// моноширинным по правому краю, итоговая строка выделена.
export function tableCard(
  doc: jsPDF,
  x: number,
  width: number,
  options: {
    title: string
    columns: TableColumn[]
    rows: TableRow[]
    note?: string
    emptyText?: string
  }
): Block {
  const { title, columns, rows, note, emptyText = 'Нет данных за период' } = options
  const visibleRows = rows.length > 0 ? rows : [{ cells: [emptyText] }]
  const bodyHeight = TABLE_HEADER_HEIGHT + visibleRows.length * TABLE_ROW_HEIGHT

  return card(doc, x, width, {
    title,
    bodyHeight,
    note,
    drawBody: (bodyX, bodyY, bodyWidth) => {
      const widths = columns.map((column) => bodyWidth * column.ratio)
      const offsets: number[] = []
      let cursor = bodyX
      widths.forEach((columnWidth) => {
        offsets.push(cursor)
        cursor += columnWidth
      })

      columns.forEach((column, index) => {
        const isRight = column.align === 'right'
        drawText(
          doc,
          column.header.toUpperCase(),
          isRight ? offsets[index] + widths[index] : offsets[index],
          bodyY + 8,
          {
            size: 5.8,
            color: COLOR.muted,
            align: isRight ? 'right' : 'left',
            charSpace: 0.3,
          }
        )
      })

      drawLine(
        doc,
        bodyX,
        bodyY + TABLE_HEADER_HEIGHT - 3,
        bodyX + bodyWidth,
        bodyY + TABLE_HEADER_HEIGHT - 3,
        COLOR.lineStrong,
        0.6
      )

      visibleRows.forEach((row, rowIndex) => {
        const rowY = bodyY + TABLE_HEADER_HEIGHT + rowIndex * TABLE_ROW_HEIGHT

        if (row.highlighted) {
          drawRect(doc, bodyX - 4, rowY, bodyWidth + 8, TABLE_ROW_HEIGHT, { fill: COLOR.highlight })
        }

        if (rowIndex > 0 && !row.emphasized) {
          drawLine(doc, bodyX, rowY, bodyX + bodyWidth, rowY, COLOR.hairline, 0.5)
        }
        if (row.emphasized) {
          drawLine(doc, bodyX, rowY, bodyX + bodyWidth, rowY, COLOR.lineStrong, 0.6)
        }

        row.cells.forEach((cell, cellIndex) => {
          const column = columns[cellIndex]
          if (!column) return
          const isRight = column.align === 'right'
          const style: TextStyle = {
            font: column.mono ? 'mono' : 'sans',
            weight: row.emphasized ? 'bold' : 'normal',
            size: column.mono ? 7.2 : 7.4,
            color: COLOR.ink,
            align: isRight ? 'right' : 'left',
          }
          drawText(
            doc,
            fitText(doc, cell, widths[cellIndex] - 8, style),
            isRight ? offsets[cellIndex] + widths[cellIndex] : offsets[cellIndex],
            rowY + 11,
            style
          )
        })
      })
    },
  })
}
