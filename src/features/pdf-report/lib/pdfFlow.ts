import type { jsPDF } from 'jspdf'
import { t } from '@/shared/i18n'
import { COLOR, CONTENT_WIDTH, PAGE, drawLine, drawText } from './pdfKit'

// Блок отчёта с заранее известной высотой — никогда не режется между страницами
export interface Block {
  height: number
  draw: (y: number) => void
}

export type BlockFactory = (x: number, width: number) => Block

export const BLOCK_GAP = 9

// Ряд колонок, высота — по самой высокой
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

// Падение одного блока не ломает отчёт
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

// Колонтитул рисуется в конце, когда известно число страниц
export function drawPageFooters(doc: jsPDF, failed = 0): void {
  const total = doc.getNumberOfPages()
  const y = PAGE.height - PAGE.marginBottom + 22

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    drawLine(doc, PAGE.marginX, y - 10, PAGE.width - PAGE.marginX, y - 10, COLOR.line, 0.5)
    drawText(doc, t('roadAccidents.appTitle'), PAGE.marginX, y, { size: 6.2, color: COLOR.muted })
    if (failed > 0) {
      drawText(
        doc,
        t('roadAccidents.pdf.footer.incomplete', { count: failed }),
        PAGE.width / 2,
        y,
        { size: 6.2, color: COLOR.negative, align: 'center' }
      )
    }
    drawText(
      doc,
      t('roadAccidents.pdf.footer.page', { page: page, total: total }),
      PAGE.width - PAGE.marginX,
      y,
      {
        font: 'mono',
        size: 6.2,
        color: COLOR.muted,
        align: 'right',
      }
    )
  }
}
