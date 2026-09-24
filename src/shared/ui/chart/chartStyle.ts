import { useId } from 'react'
import { Y_AXIS_WIDTH } from '@/shared/lib/rechartsHelpers'

// Общий «костюм» графиков Recharts по эталону — чтобы все 18 графиков
// выглядели одной системой и правились в одном месте:
// сплошная волосяная сетка только по горизонтали, приглушённые подписи осей
// без засечек, своя всплывающая подсказка, градиентные заливки под линиями
// и в столбцах, точки с кольцом цвета фона.
//
// Цвета — CSS-переменные темы: в атрибутах SVG, которые рисует Recharts,
// var() работает, и при смене темы сетка/оси перекрашиваются сами.

const AXIS_TICK = { fill: 'var(--color-text-faint)', fontSize: 11 }

export const GRID_PROPS = {
  stroke: 'var(--color-border)',
  vertical: false,
} as const

// Ось X: базовая линия чуть заметнее сетки, без засечек
export const X_AXIS_PROPS = {
  stroke: 'var(--color-border-strong)',
  tickLine: false,
  tick: AXIS_TICK,
  tickMargin: 6,
} as const

// Ось Y: только подписи — без линии и засечек, как в эталоне
export const Y_AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
  tick: AXIS_TICK,
  tickMargin: 8,
  width: Y_AXIS_WIDTH,
} as const

// Подсветка под курсором: у линий — вертикальная направляющая, у столбцов —
// мягкая полоса на всю высоту категории
export const LINE_CURSOR = { stroke: 'var(--color-border-strong)', strokeWidth: 1 } as const
export const BAR_CURSOR = { fill: 'var(--color-soft-2)', radius: 6 } as const

// Появление графика: общая длительность и кривая для всех серий
export const ANIMATION = { animationDuration: 1100, animationEasing: 'ease-out' } as const

// Столбцы: скруглённый верх, почти прямой низ; ширина ограничена, чтобы
// столбец не заполнял всю категорию (в эталоне остаётся «воздух»)
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 1, 1]
export const BAR_SIZE_SINGLE = 48
export const BAR_SIZE_GROUPED = 28

// Точка на линии: заливка цветом серии + кольцо цвета фона карточки, чтобы
// точки оставались читаемыми на пересечении линий
export function lineDot(color: string) {
  return { r: 3, fill: color, stroke: 'var(--color-surface)', strokeWidth: 1.5, cursor: 'pointer' }
}

export function activeLineDot(color: string) {
  return { r: 5, fill: color, stroke: 'var(--color-surface)', strokeWidth: 2 }
}

// Уникальный на экземпляр графика префикс id градиентов: на экране
// несколько графиков, и одинаковые id у <linearGradient> в разных SVG
// перепутали бы заливки. Из useId убираются символы, неудобные в url(#…).
export function useGradientId(): string {
  return useId().replace(/[^a-zA-Z0-9_-]/g, '')
}
