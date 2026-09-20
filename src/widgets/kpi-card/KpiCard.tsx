import type { ReactNode } from 'react'
import { formatDelta, isDeltaPositive } from '@/shared/lib/formatters'
import styles from './KpiCard.module.css'

interface KpiCardProps {
  label: string
  value: string
  delta?: number | null
  deltaHigherIsBetter?: boolean
  // Подпись под дельтой. По умолчанию "к пред. периоду" (Обзор/Автоколонна);
  // "Аналитика" сравнивает не с прошлым периодом, а со второй автоколонной
  // ("к Павлодару" и т.п.), поэтому подпись настраиваемая.
  deltaLabel?: string
  tooltip?: string
  onClick?: () => void
  children?: ReactNode
}

// Универсальная KPI-карточка для всех трёх экранов: значение + дельта
// (зелёная/красная в зависимости от того, хорошо ли расти именно этой
// метрике), клик открывает детализацию.
export function KpiCard({
  label,
  value,
  delta,
  deltaHigherIsBetter = true,
  deltaLabel = 'к пред. периоду',
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
      {/* Строка дельты рисуется всегда, даже пустой — иначе карточки без
          дельты (или с null-дельтой, как у автоколонны без ДТП) в одной
          сетке оказываются ниже соседних и ряд карточек "плывёт" по высоте. */}
      <div
        className={`${styles.delta} ${
          positive === null ? '' : positive ? styles.deltaUp : styles.deltaDown
        }`}
      >
        {delta !== undefined && delta !== null ? `${formatDelta(delta)} ${deltaLabel}` : ' '}
      </div>
      {children}
    </div>
  )
}
