import type { RefObject } from 'react'

// Раздел-картинка — снимок DOM-узла (KPI-строка или карточка графика)
// через html2canvas, вставляется в PDF как растр ≥2x.
export interface PdfImageSection {
  kind: 'image'
  key: string
  ref: RefObject<HTMLDivElement | null>
}

export interface PdfTableColumn {
  header: string
  align?: 'left' | 'right'
}

// Раздел-таблица — рисуется нативным текстом через jspdf-autotable, а не
// растром. Строки уже должны быть срезаны до того же top-N, что и
// свёрнутое (не "Показать все") состояние DataTable на экране — полный
// список остаётся доступен через CSV-экспорт, отсюда caption.
export interface PdfTableSection {
  kind: 'table'
  key: string
  title: string
  columns: PdfTableColumn[]
  rows: (string | number)[][]
  caption?: string
}

export type PdfSection = PdfImageSection | PdfTableSection

export interface PdfReportMeta {
  screenName: string
  filtersLines: string[]
}

export interface PdfReportFilename {
  screenSlug: string
  periodSlug: string
}
