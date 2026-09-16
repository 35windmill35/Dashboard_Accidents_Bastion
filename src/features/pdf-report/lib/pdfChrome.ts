import type { jsPDF } from 'jspdf'
import {
  COLOR,
  drawLine,
  drawRect,
  drawText,
  fitText,
  measureText,
  type Rgb,
  type TextStyle,
} from './pdfKit'
import type { BlockFactory } from './pdfFlow'

export interface ReportHeaderMeta {
  kicker: string
  title: string
  periodLabel: string
  generatedAt: Date
  filterLines: string[]
}

const HEADER_RULE_GAP = 8

// Шапка отчёта: слева рубрика и название, справа период, дата формирования и
// применённые фильтры. Идентификации пользователя в шапке нет — решение
// заказчика.
export function reportHeader(doc: jsPDF, meta: ReportHeaderMeta): BlockFactory {
  return (x, width) => {
    const rightLines = [
      `Сформирован ${new Intl.DateTimeFormat('ru-RU').format(meta.generatedAt)}`,
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
          font: 'mono',
          size: 6.2,
          color: COLOR.secondary,
          charSpace: 1.1,
        })
        drawText(doc, meta.title, x, y + 29, { weight: 'bold', size: 15, color: COLOR.ink })

        const rightX = x + width
        drawText(doc, meta.periodLabel, rightX, y + 10, {
          weight: 'bold',
          size: 10.5,
          color: COLOR.ink,
          align: 'right',
        })

        rightLines.forEach((line, index) => {
          const style = { font: 'mono' as const, size: 6.6, color: COLOR.secondary }
          drawText(doc, fitText(doc, line, width * 0.62, style), rightX, y + 22 + index * 9.5, {
            ...style,
            align: 'right',
          })
        })

        const ruleY = y + contentHeight + HEADER_RULE_GAP
        drawLine(doc, x, ruleY, x + width, ruleY, COLOR.ink, 1.2)
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

// Подбирает кегль так, чтобы длинная сумма или подпись не выехала за
// карточку — резать их многоточием хуже, чем уменьшить на пол-пункта.
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

export function kpiRow(doc: jsPDF, cards: KpiCardData[]): BlockFactory {
  return (x, width) => {
    const cardWidth = (width - KPI_GAP * (cards.length - 1)) / cards.length

    return {
      height: KPI_HEIGHT,
      draw: (y) => {
        cards.forEach((data, index) => {
          const cardX = x + index * (cardWidth + KPI_GAP)
          drawRect(doc, cardX, y, cardWidth, KPI_HEIGHT, {
            stroke: COLOR.line,
            lineWidth: 0.5,
            radius: 2,
          })
          drawRect(doc, cardX, y, cardWidth, 2.4, { fill: COLOR.accent })

          const innerWidth = cardWidth - 16
          const label = data.label.toUpperCase()
          const labelSize = fitFontSize(doc, label, innerWidth, 5.8, 4.8, {
            weight: 'normal',
            charSpace: 0.3,
          })
          drawText(doc, label, cardX + 8, y + 17, {
            font: 'mono',
            size: labelSize,
            color: COLOR.secondary,
            charSpace: 0.3,
          })

          const valueSize = fitFontSize(doc, data.value, innerWidth, 13.5, 8)
          drawText(doc, data.value, cardX + 8, y + 36, {
            font: 'mono',
            weight: 'bold',
            size: valueSize,
            color: COLOR.ink,
          })

          if (data.delta) {
            const tone: Rgb =
              data.deltaTone === 'positive'
                ? COLOR.positive
                : data.deltaTone === 'negative'
                  ? COLOR.negative
                  : COLOR.secondary
            const deltaStyle = { font: 'mono' as const, size: 6.2, color: tone }
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
