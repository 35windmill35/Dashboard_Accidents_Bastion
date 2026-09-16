import type { jsPDF } from 'jspdf'
import { COLOR, CONTENT_WIDTH, PAGE, drawLine, drawText } from './pdfKit'

// Блок — самодостаточный кусок отчёта с заранее известной высотой: KPI-строка,
// карточка графика, таблица. Высота считается до отрисовки, поэтому движок
// может решить, влезает ли блок на текущую страницу, и никогда не режет его
// пополам.
export interface Block {
  height: number
  draw: (y: number) => void
}

// Фабрика блока с привязкой к колонке: получает свои x и ширину.
export type BlockFactory = (x: number, width: number) => Block

export const BLOCK_GAP = 9

// Ряд из нескольких колонок: высота — по самой высокой карточке, верхние
// края выровнены.
export function columns(
  factories: BlockFactory[],
  ratios: number[],
  gap = BLOCK_GAP
): BlockFactory {
  return (x, width) => {
    const gaps = gap * (factories.length - 1)
    const usable = width - gaps
    const widths = ratios.map((ratio) => usable * ratio)

    let offset = x
    const blocks = factories.map((factory, index) => {
      const block = factory(offset, widths[index])
      offset += widths[index] + gap
      return block
    })

    return {
      height: Math.max(...blocks.map((block) => block.height)),
      draw: (y) => blocks.forEach((block) => block.draw(y)),
    }
  }
}

export interface FlowResult {
  pages: number
  failed: number
}

export interface FlowOptions {
  onSection?: (done: number, total: number) => void
}

// Раскладывает блоки сверху вниз, начиная новую страницу, когда очередной
// блок целиком не помещается в остаток текущей. Падение одного блока не
// ломает весь отчёт — пишем в консоль и продолжаем с остальными (тот же
// принцип частичного отказа, что и при загрузке данных по базам).
export function flowBlocks(
  doc: jsPDF,
  factories: BlockFactory[],
  startY: number,
  options: FlowOptions = {}
): FlowResult {
  const bottom = PAGE.height - PAGE.marginBottom
  let y = startY
  let pages = 1
  let failed = 0

  factories.forEach((factory, index) => {
    try {
      const block = factory(PAGE.marginX, CONTENT_WIDTH)

      if (y + block.height > bottom && y > PAGE.marginTop) {
        doc.addPage()
        pages += 1
        y = PAGE.marginTop
      }

      block.draw(y)
      y += block.height + BLOCK_GAP
    } catch (err) {
      failed += 1
      console.error(`[pdf-report] блок №${index + 1} не отрисован:`, err)
    }

    options.onSection?.(index + 1, factories.length)
  })

  return { pages, failed }
}

// Колонтитул рисуется в самом конце, когда известно общее число страниц.
export function drawPageFooters(doc: jsPDF): void {
  const total = doc.getNumberOfPages()
  const y = PAGE.height - PAGE.marginBottom + 22

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    drawLine(doc, PAGE.marginX, y - 10, PAGE.width - PAGE.marginX, y - 10, COLOR.line, 0.5)
    drawText(doc, `Стр. ${page} из ${total}`, PAGE.width - PAGE.marginX, y, {
      font: 'mono',
      size: 6.2,
      color: COLOR.muted,
      align: 'right',
    })
  }
}
