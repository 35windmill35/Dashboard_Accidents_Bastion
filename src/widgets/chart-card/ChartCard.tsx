import type { ReactNode } from 'react'
import styles from './ChartCard.module.css'

interface ChartCardProps {
  title: string
  children: ReactNode
  height?: number
}

// Общая рамка для графиков экранов: заголовок + фиксированная высота под
// ResponsiveContainer, чтобы карточки в сетке не прыгали по высоте.
export function ChartCard({ title, children, height = 280 }: ChartCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}
