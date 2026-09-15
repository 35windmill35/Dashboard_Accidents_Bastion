import type { ReactNode } from 'react'
import { formatDelta, isDeltaPositive } from '@/shared/lib/formatters'
import styles from './KpiCard.module.css'

interface KpiCardProps {
  label: string
  value: string
  delta?: number | null
  deltaHigherIsBetter?: boolean
  tooltip?: string
  onClick?: () => void
  children?: ReactNode
}

// Универсальная KPI-карточка для всех трёх экранов: значение + дельта к
// предыдущему периоду (зелёная/красная в зависимости от того, хорошо ли
// расти именно этой метрике), клик открывает detalизацию.
export function KpiCard({
  label,
  value,
  delta,
  deltaHigherIsBetter = true,
  tooltip,
  onClick,
  children,
}: KpiCardProps) {
  const positive = isDeltaPositive(delta, deltaHigherIsBetter)

  return (
    <div
      className={`${styles.card} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      title={tooltip}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {delta !== undefined && delta !== null && (
        <div
          className={`${styles.delta} ${
            positive === null ? '' : positive ? styles.deltaUp : styles.deltaDown
          }`}
        >
          {formatDelta(delta)} к пред. периоду
        </div>
      )}
      {children}
    </div>
  )
}
