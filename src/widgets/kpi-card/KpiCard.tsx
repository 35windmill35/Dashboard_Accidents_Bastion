import type { ReactNode } from 'react'
import { formatDelta, isDeltaPositive } from '@/shared/lib/formatters'
import styles from './KpiCard.module.css'

export interface KpiDrillDown {
  // Подпись ссылки на связанный экран, например «Статистика по автоколонне»
  label: string
  onClick: () => void
}

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
  // Drill-through: клик по карточке — список ДТП, из которых сложилось число.
  onClick?: () => void
  // Drill-down: переход на связанный экран с сохранением фильтров (ТЗ §4.3).
  drillDown?: KpiDrillDown
  children?: ReactNode
}

// Универсальная KPI-карточка для всех трёх экранов: значение + дельта
// (зелёная/красная в зависимости от того, хорошо ли расти именно этой
// метрике). Кликабельная часть — настоящая <button>, поэтому карточка
// доступна с клавиатуры (Tab + Enter/Space) и читается скринридером.
export function KpiCard({
  label,
  value,
  delta,
  deltaHigherIsBetter = true,
  deltaLabel = 'к пред. периоду',
  tooltip,
  onClick,
  drillDown,
  children,
}: KpiCardProps) {
  const positive = isDeltaPositive(delta, deltaHigherIsBetter)
  const deltaText =
    delta !== undefined && delta !== null ? `${formatDelta(delta)} ${deltaLabel}` : null

  const body = (
    <>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {/* Строка дельты рисуется всегда, даже пустой — иначе карточки без
          дельты (или с null-дельтой, как у автоколонны без ДТП) в одной
          сетке оказываются ниже соседних и ряд карточек "плывёт" по высоте. */}
      <span
        className={`${styles.delta} ${
          positive === null ? '' : positive ? styles.deltaUp : styles.deltaDown
        }`}
      >
        {deltaText ?? ' '}
      </span>
    </>
  )

  return (
    <div className={`${styles.card} ${onClick ? styles.clickable : ''}`} title={tooltip}>
      {onClick ? (
        <button
          type="button"
          className={styles.main}
          onClick={onClick}
          aria-label={`${label}: ${value}${deltaText ? `, ${deltaText}` : ''}. Показать список ДТП`}
        >
          {body}
        </button>
      ) : (
        <div className={styles.main}>{body}</div>
      )}
      {drillDown && (
        <button type="button" className={styles.drillDown} onClick={drillDown.onClick}>
          {drillDown.label} →
        </button>
      )}
      {children}
    </div>
  )
}
