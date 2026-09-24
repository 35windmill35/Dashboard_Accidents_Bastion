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
  // Drill-through: кнопка-иконка в правом верхнем углу открывает таблицу ДТП,
  // из которых сложилось число.
  onOpenList: () => void
  // Drill-down (ТЗ §4.3): клик по самой карточке ведёт на связанный экран с
  // сохранением фильтров. `label` — куда именно, для подсказки и скринридера.
  // Если перехода нет, клик по карточке делает то же, что и кнопка в углу.
  navigate?: { label: string; onClick: () => void }
  children?: ReactNode
}

function IconList() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <circle cx="4.5" cy="6" r="0.8" />
      <circle cx="4.5" cy="12" r="0.8" />
      <circle cx="4.5" cy="18" r="0.8" />
    </svg>
  )
}

// Универсальная KPI-карточка для всех трёх экранов: значение + дельта
// (зелёная/красная в зависимости от того, хорошо ли расти именно этой
// метрике).
//
// Два независимых действия, каждое — настоящая <button> (Tab + Enter/Space,
// читается скринридером), поэтому кнопка в углу не вложена в кнопку карточки,
// а лежит рядом с ней:
// - клик по карточке — drill-down (если есть куда переходить);
// - иконка справа вверху — таблица ДТП (drill-through).
export function KpiCard({
  label,
  value,
  delta,
  deltaHigherIsBetter = true,
  deltaLabel = 'к пред. периоду',
  tooltip,
  onOpenList,
  navigate,
  children,
}: KpiCardProps) {
  const positive = isDeltaPositive(delta, deltaHigherIsBetter)
  const deltaText =
    delta !== undefined && delta !== null ? `${formatDelta(delta)} ${deltaLabel}` : null
  const summary = `${label}: ${value}${deltaText ? `, ${deltaText}` : ''}`

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

  const cardTitle =
    [tooltip, navigate ? `Клик по карточке — ${navigate.label}` : null]
      .filter(Boolean)
      .join('\n') || undefined

  return (
    <div className={styles.card} title={cardTitle}>
      {navigate ? (
        <button
          type="button"
          className={`${styles.main} ${styles.mainButton}`}
          onClick={navigate.onClick}
          aria-label={`${summary}. ${navigate.label}`}
        >
          {body}
        </button>
      ) : (
        // Без перехода клик по карточке дублирует кнопку в углу — только для
        // мыши; для клавиатуры и скринридера действие одно, кнопка в углу.
        <div className={`${styles.main} ${styles.mainClickable}`} onClick={onOpenList}>
          {body}
        </div>
      )}
      <button
        type="button"
        className={styles.listButton}
        onClick={onOpenList}
        title="Показать таблицу ДТП"
        aria-label={`${label}: показать таблицу ДТП`}
      >
        <IconList />
      </button>
      {children}
    </div>
  )
}
