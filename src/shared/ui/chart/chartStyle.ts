import { useId } from 'react'
import { Y_AXIS_WIDTH } from '@/shared/lib/rechartsHelpers'

// Общее оформление графиков Recharts.
// Цвета — CSS-переменные темы: var() работает в атрибутах SVG.

const AXIS_TICK = { fill: 'var(--color-text-faint)', fontSize: 11 }

export const GRID_PROPS = {
  stroke: 'var(--color-border)',
  vertical: false,
} as const

export const X_AXIS_PROPS = {
  stroke: 'var(--color-border-strong)',
  tickLine: false,
  tick: AXIS_TICK,
  tickMargin: 6,
} as const

export const Y_AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
  tick: AXIS_TICK,
  tickMargin: 8,
  width: Y_AXIS_WIDTH,
} as const

export const LINE_CURSOR = { stroke: 'var(--color-border-strong)', strokeWidth: 1 } as const
export const BAR_CURSOR = { fill: 'var(--color-soft-2)', radius: 6 } as const

export const ANIMATION = { animationDuration: 1100, animationEasing: 'ease-out' } as const

// Скруглённый верх, ширина ограничена
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 1, 1]
export const BAR_SIZE_SINGLE = 48
export const BAR_SIZE_GROUPED = 28

// Кольцо цвета фона — чтобы точки читались на пересечении линий
export function lineDot(color: string) {
  return { r: 3, fill: color, stroke: 'var(--color-surface)', strokeWidth: 1.5, cursor: 'pointer' }
}

export function activeLineDot(color: string) {
  return { r: 5, fill: color, stroke: 'var(--color-surface)', strokeWidth: 2 }
}

// Префикс id градиентов, уникальный на экземпляр графика
export function useGradientId(): string {
  return useId().replace(/[^a-zA-Z0-9_-]/g, '')
}
