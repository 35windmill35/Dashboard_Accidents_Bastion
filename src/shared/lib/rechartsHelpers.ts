import { useCallback, useEffect, useRef, useState } from 'react'

// Recharts типизирует onClick-обработчики Bar/Pie слишком строго под
// generic-props самого компонента, а не под наши данные — практический
// способ обойти это, не теряя типизацию исходных данных, один общий
// хелпер вместо `as any` в каждом графике.
export function barPayload<T>(entry: unknown): T {
  return (entry as { payload: T }).payload
}

const TICK_FONT_SIZE = 11
const LABEL_ANGLE_DEG = 20

// Насколько узкой может стать карточка графика, прежде чем подпись перестаёт
// помещаться — при угле -20° реальный горизонтальный след короткой подписи
// (месяц, короткое имя автоколонны) меньше её полной ширины, поэтому берём
// с запасом, а не по фактической ширине текста.
const MIN_LABEL_WIDTH = 40

// Грубая поправка на место, которое у графика съедают ось Y и отступы —
// точная ширина оси Y отличается у разных карточек (деньги шире, чем целые
// числа), но для решения "поместится / не поместится" хватает одной оценки
// на всех.
const AXIS_RESERVED_WIDTH = 60

// Сколько подписей категориальной оси показывать: считаем, сколько
// помещается в измеренную ширину карточки, и пропускаем остальные через
// равные интервалы (Recharts interval=N — показать каждую (N+1)-ю подпись).
// Раньше ось всегда рисовала все подписи (interval=0) — при сужении карточки
// (масштаб браузера, узкий монитор) это и приводило к тому, что месяцы/
// категории накладывались друг на друга и становились нечитаемыми.
function resolveCategoryInterval(width: number, count: number): number {
  if (!width || count <= 1) return 0
  const usableWidth = Math.max(width - AXIS_RESERVED_WIDTH, 0)
  const maxVisible = Math.max(1, Math.floor(usableWidth / MIN_LABEL_WIDTH))
  if (maxVisible >= count) return 0
  return Math.ceil(count / maxVisible) - 1
}

let measureCanvas: HTMLCanvasElement | null = null

function measureLabelWidth(text: string, fontSize: number): number {
  if (typeof document === 'undefined') return text.length * fontSize * 0.6
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  const ctx = measureCanvas.getContext('2d')
  if (!ctx) return text.length * fontSize * 0.6
  ctx.font = `${fontSize}px sans-serif`
  return ctx.measureText(text).width
}

// Первая подпись категориальной оси — единственная, которая рисуется всегда,
// при любом интервале пропуска, и стоит у самого левого края графика. При
// повороте на -20° и textAnchor="end" её текст уходит влево от опорной
// точки — если места не хватает, он вылезает за пределы SVG (у которого по
// умолчанию overflow: hidden) и обрезается. Резервируем под неё нужное
// горизонтальное место через padding оси, считая от фактической ширины
// текста — тогда она не срезается ни при какой ширине карточки.
function resolveLeftPadding(firstLabel: string | undefined): number {
  if (!firstLabel) return 0
  const width = measureLabelWidth(firstLabel, TICK_FONT_SIZE)
  const angleRad = (LABEL_ANGLE_DEG * Math.PI) / 180
  return Math.ceil(width * Math.cos(angleRad)) + 10
}

// Единая ширина оси Y для всех графиков одного экрана — раньше она
// подбиралась под контент каждого графика отдельно (76 для тенге, 48 для
// процентов, авто ~60 для целых чисел), из-за чего вертикальная линия оси Y
// у соседних карточек в сетке стояла на разной высоте/смещении и "не была
// параллельна" между графиками. Теперь ширина одна для всех — по самому
// широкому подписанному значению (компактная сумма в тенге).
export const Y_AXIS_WIDTH = 76

// Единые отступы графика — по той же причине: разные margin.left/right у
// графиков с "узкой" (целые числа) и "широкой" (тенге) осью Y компенсировали
// разницу в Y_AXIS_WIDTH по-разному. Раз ширина оси теперь одна везде, и
// отступы должны быть одинаковыми.
export const CHART_MARGIN = { top: 8, right: 4, left: 0, bottom: 0 } as const

// Высота полосы оси X — тоже общая для всех графиков экрана. У графиков с
// повёрнутыми подписями категорий (см. useCategoryXAxis) она обязательно
// 60, под наклонный текст. У графиков с двумя простыми подписями (сравнение
// "Автоколонна А"/"Автоколонна Б") подписи не повёрнуты и своя высота у
// XAxis не задавалась — Recharts брал дефолт (30), и на графиках рядом в
// одной строке сетки сама область графика (а с ней и ось X) оказывалась на
// разной высоте. Задаём и там ту же высоту 60, чтобы оси стояли на одном
// уровне у всех карточек экрана, а не только у тех, что используют хук.
export const CATEGORY_AXIS_HEIGHT = 60

export interface CategoryXAxisProps {
  interval: number
  angle: -20
  textAnchor: 'end'
  height: number
  fontSize: number
  padding: { left: number; right: number }
}

export interface UseCategoryXAxisOptions {
  // Для столбчатых графиков: слева от первого столбца ось резервирует место
  // под повёрнутую подпись (см. resolveLeftPadding) — без такого же отступа
  // справа область графика съезжает влево, между осью Y и первым столбцом
  // остаётся заметный зазор, а справа места не остаётся вовсе. Зеркалим
  // левый отступ в правый, чтобы столбцы стояли по центру карточки.
  mirrorPadding?: boolean
}

// Единый хук для категориальной оси X всех графиков (всех трёх экранов): высота под
// подписи (угол, кегль, отведённое место) одинакова для всех карточек
// намеренно — иначе у соседних карточек в сетке "плывут" линия оси X и сетка
// по Y (см. ChartCard). А вот сколько подписей реально показать и сколько
// места зарезервировать слева под первую из них — считается отдельно для
// каждой карточки: ширина — по её измеренной через ResizeObserver ширине,
// отступ слева — по фактической ширине первой подписи.
export function useCategoryXAxis(
  labels: string[],
  options?: UseCategoryXAxisOptions
): {
  containerRef: (node: HTMLDivElement | null) => void
  xAxisProps: CategoryXAxisProps
} {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node
    setWidth(node?.getBoundingClientRect().width ?? 0)
  }, [])

  useEffect(() => {
    const node = elementRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const leftPadding = resolveLeftPadding(labels[0])

  return {
    containerRef,
    xAxisProps: {
      interval: resolveCategoryInterval(width, labels.length),
      angle: -20,
      textAnchor: 'end',
      height: CATEGORY_AXIS_HEIGHT,
      fontSize: TICK_FONT_SIZE,
      padding: { left: leftPadding, right: options?.mirrorPadding ? leftPadding : 0 },
    },
  }
}
