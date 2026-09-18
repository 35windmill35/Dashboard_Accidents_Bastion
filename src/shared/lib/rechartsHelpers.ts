import { useCallback, useEffect, useRef, useState } from 'react'

// Recharts типизирует onClick-обработчики Bar/Pie слишком строго под
// generic-props самого компонента, а не под наши данные — практический
// способ обойти это, не теряя типизацию исходных данных, один общий
// хелпер вместо `as any` в каждом графике.
export function barPayload<T>(entry: unknown): T {
  return (entry as { payload: T }).payload
}

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

export interface CategoryXAxisProps {
  interval: number
  angle: -20
  textAnchor: 'end'
  height: number
  fontSize: number
}

// Единый хук для категориальной оси X всех графиков "Обзора": высота под
// подписи (угол, кегль, отведённое место) одинакова для всех карточек
// намеренно — иначе у соседних карточек в сетке "плывут" линия оси X и сетка
// по Y (см. ChartCard). А вот сколько подписей реально показать — считается
// отдельно для каждой карточки по её измеренной через ResizeObserver ширине.
export function useCategoryXAxis(pointCount: number): {
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

  return {
    containerRef,
    xAxisProps: {
      interval: resolveCategoryInterval(width, pointCount),
      angle: -20,
      textAnchor: 'end',
      height: 60,
      fontSize: 11,
    },
  }
}
