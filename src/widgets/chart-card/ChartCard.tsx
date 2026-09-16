import type { ReactNode } from 'react'
import styles from './ChartCard.module.css'

export interface ChartLegendItem {
  label: string
  color: string
}

interface ChartCardProps {
  title: string
  children: ReactNode
  height?: number
  legend?: ChartLegendItem[]
}

// Общая рамка для графиков экранов: заголовок + фиксированная высота под
// ResponsiveContainer + легенда.
//
// Легенда рисуется здесь, а не через <Legend> из Recharts. Внутренняя
// легенда Recharts вычитает своё место ИЗ той же фиксированной высоты
// графика — а значит у графика с одной серией (легенды нет) и графика с
// двумя сериями (легенда в одну строку) остаётся разная высота под сами
// оси, и на соседних карточках в сетке "плывут" линия оси X и сетка по Y.
// Здесь легенда — отдельная зона ПОД графиком с одной и той же высотой у
// всех карточек, есть в ней элементы или нет, поэтому область самого
// графика (а с ней и оси) одинакова везде.
export function ChartCard({ title, children, height = 280, legend }: ChartCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{title}</div>
      <div style={{ height }}>{children}</div>
      <div className={styles.legend}>
        {legend?.map((item) => (
          <span key={item.label} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
