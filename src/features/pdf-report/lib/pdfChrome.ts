import type { jsPDF } from 'jspdf'
import { t } from '@/shared/i18n'
import {
  COLOR,
  drawLine,
  drawRect,
  drawText,
  fitText,
  measureText,
  wrapText,
  type Rgb,
  type TextStyle,
} from './pdfKit'
import type { BlockFactory } from './pdfFlow'

export interface ReportDataContext {
  loadedAt: Date | null
  unavailableFirms: string[]
  staleFirms: { name: string; loadedAt: Date }[]
  partialNote: string | null
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function dataContextLines(context: ReportDataContext): string[] {
  const lines: string[] = []
  if (context.loadedAt)
    lines.push(t('roadAccidents.pdf.header.dataAt', { date: formatDateTime(context.loadedAt) }))
  if (context.unavailableFirms.length > 0) {
    lines.push(
      t('roadAccidents.pdf.header.unavailableBases', { bases: context.unavailableFirms.join(', ') })
    )
  }
  context.staleFirms.forEach((firm) => {
    lines.push(
      t('roadAccidents.pdf.header.staleBase', {
        name: firm.name,
        date: formatDateTime(firm.loadedAt),
      })
    )
  })
  if (context.partialNote) lines.push(context.partialNote)
  return lines
}

export interface ReportHeaderMeta {
  kicker: string
  title: string
  periodLabel: string
  generatedAt: Date
  filterLines: string[]
}

const HEADER_RULE_GAP = 8

// Идентификации пользователя в шапке нет — решение заказчика
export function reportHeader(doc: jsPDF, meta: ReportHeaderMeta): BlockFactory {
  return (x, width) => {
    const rightLines = [
      t('roadAccidents.pdf.header.generated', {
        date: new Intl.DateTimeFormat('ru-RU').format(meta.generatedAt),
      }),
      ...meta.filterLines,
    ]
    const leftHeight = 34
    const rightHeight = 12 + rightLines.length * 9.5
    const contentHeight = Math.max(leftHeight, rightHeight)
    const height = contentHeight + HEADER_RULE_GAP + 4

    return {
      height,
      draw: (y) => {
        drawText(doc, meta.kicker.toUpperCase(), x, y + 8, {
          size: 6.2,
          color: COLOR.accent,
          charSpace: 1.3,
        })
        // Название с именем автоколонны может быть длинным
        const titleStyle: TextStyle = { weight: 'bold', size: 17, color: COLOR.title }
        drawText(doc, fitText(doc, meta.title, width * 0.6, titleStyle), x, y + 29, titleStyle)

        const rightX = x + width
        drawText(doc, meta.periodLabel, rightX, y + 10, {
          weight: 'bold',
          size: 10.5,
          color: COLOR.title,
          align: 'right',
        })

        rightLines.forEach((line, index) => {
          const style = { size: 6.6, color: COLOR.secondary }
          drawText(doc, fitText(doc, line, width * 0.62, style), rightX, y + 22 + index * 9.5, {
            ...style,
            align: 'right',
          })
        })

        const ruleY = y + contentHeight + HEADER_RULE_GAP
        drawLine(doc, x, ruleY, x + width, ruleY, COLOR.line, 0.8)
        drawLine(doc, x, ruleY, x + 56, ruleY, COLOR.accent, 1.6)
      },
    }
  }
}

export interface KpiCardData {
  label: string
  value: string
  delta: string | null
  deltaTone: 'positive' | 'negative' | 'neutral'
}

const KPI_HEIGHT = 56
const KPI_GAP = 7

// Уменьшаем кегль вместо обрезки многоточием
function fitFontSize(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  style: TextStyle = {}
): number {
  let size = startSize
  while (
    size > minSize &&
    measureText(doc, text, { font: 'mono', weight: 'bold', ...style, size }) > maxWidth
  ) {
    size -= 0.25
  }
  return size
}

// slots — ширина по сетке первого ряда
export function kpiRow(doc: jsPDF, cards: KpiCardData[], slots = cards.length): BlockFactory {
  return (x, width) => {
    const columnsCount = Math.max(slots, cards.length)
    const cardWidth = (width - KPI_GAP * (columnsCount - 1)) / columnsCount

    return {
      height: KPI_HEIGHT,
      draw: (y) => {
        cards.forEach((data, index) => {
          const cardX = x + index * (cardWidth + KPI_GAP)
          drawRect(doc, cardX, y, cardWidth, KPI_HEIGHT, {
            fill: COLOR.surface,
            stroke: COLOR.line,
            lineWidth: 0.6,
            radius: 4,
          })

          const innerWidth = cardWidth - 16
          const label = data.label
          const labelSize = fitFontSize(doc, label, innerWidth, 6.8, 5.4, {
            font: 'sans',
            weight: 'normal',
          })
          drawText(doc, label, cardX + 8, y + 15, {
            size: labelSize,
            color: COLOR.secondary,
          })

          const valueSize = fitFontSize(doc, data.value, innerWidth, 14, 8)
          drawText(doc, data.value, cardX + 8, y + 35, {
            font: 'mono',
            weight: 'bold',
            size: valueSize,
            color: COLOR.title,
          })

          if (data.delta) {
            const tone: Rgb =
              data.deltaTone === 'positive'
                ? COLOR.positive
                : data.deltaTone === 'negative'
                  ? COLOR.negative
                  : COLOR.secondary
            const deltaStyle = { size: 6.4, color: tone }
            drawText(
              doc,
              fitText(doc, data.delta, innerWidth, deltaStyle),
              cardX + 8,
              y + 48,
              deltaStyle
            )
          }
        })
      },
    }
  }
}

const NOTICE_PAD_X = 10
const NOTICE_LINE = 9.5

// Используется для баннера сопоставимости «Аналитики»
export function noticeBlock(doc: jsPDF, title: string, lines: string[]): BlockFactory {
  return (x, width) => {
    const style: TextStyle = { size: 7, color: COLOR.ink }
    const innerWidth = width - NOTICE_PAD_X * 2
    const wrapped = lines.flatMap((line) => wrapText(doc, `• ${line}`, innerWidth, style, 3))
    const height = 24 + wrapped.length * NOTICE_LINE + 4

    return {
      height,
      draw: (y) => {
        drawRect(doc, x, y, width, height, {
          fill: COLOR.highlight,
          stroke: COLOR.line,
          lineWidth: 0.5,
          radius: 4,
        })
        drawText(doc, title, x + NOTICE_PAD_X, y + 14, {
          weight: 'bold',
          size: 8.4,
          color: COLOR.ink,
        })
        wrapped.forEach((line, index) => {
          drawText(doc, line, x + NOTICE_PAD_X, y + 26 + index * NOTICE_LINE, style)
        })
      },
    }
  }
}
