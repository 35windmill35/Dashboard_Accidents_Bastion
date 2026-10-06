import { useCallback, useEffect, useRef, useState } from 'react'

// Обход слишком строгой типизации onClick у Bar/Pie в Recharts
export function barPayload<T>(entry: unknown): T {
  return (entry as { payload: T }).payload
}

const TICK_FONT_SIZE = 11
const LABEL_ANGLE_DEG = 20

// Минимальная ширина на подпись категории (с запасом под наклон -20°)
const MIN_LABEL_WIDTH = 40

// Место под ось Y и отступы
const AXIS_RESERVED_WIDTH = 60

// Сколько подписей оси X показывать при текущей ширине карточки
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

// Отступ слева под первую подпись, чтобы повёрнутый текст не обрезался
function resolveLeftPadding(firstLabel: string | undefined): number {
  if (!firstLabel) return 0
  const width = measureLabelWidth(firstLabel, TICK_FONT_SIZE)
  const angleRad = (LABEL_ANGLE_DEG * Math.PI) / 180
  return Math.ceil(width * Math.cos(angleRad)) + 10
}

// Общая ширина оси Y — чтобы оси соседних графиков стояли на одной линии
export const Y_AXIS_WIDTH = 76

export const CHART_MARGIN = { top: 8, right: 4, left: 0, bottom: 0 } as const

// Общая высота оси X для всех графиков экрана
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
  // Зеркалит левый отступ вправо, чтобы столбцы стояли по центру
  mirrorPadding?: boolean
}

// Категориальная ось X: интервал подписей и отступ считаются по ширине карточки
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
