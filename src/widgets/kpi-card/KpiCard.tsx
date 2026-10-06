import { useEffect, useState, type ReactNode } from 'react'
import {
  formatNumber,
  getCurrencySymbol,
  isDeltaPositive,
  kpiDelta,
  type KpiKind,
} from '@/shared/lib/formatters'
import { t } from '@/shared/i18n'
import styles from './KpiCard.module.css'

export type KpiValueKind = KpiKind

interface KpiCardProps {
  label: string
  // percent — доля 0…1; null — прочерк
  value: number | null
  kind: KpiValueKind
  // undefined — без сравнения; доли сравниваются в п.п., остальное в %
  compareValue?: number | null
  deltaHigherIsBetter?: boolean
  deltaLabel?: string
  tooltip?: string
  onOpenList: () => void
  // Без navigate клик по карточке открывает таблицу
  navigate?: { label: string; onClick: () => void }
  compact?: boolean
  children?: ReactNode
}

const COUNT_UP_MS = 1300

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

const NBSP = String.fromCharCode(160)

interface CountUpState {
  target: number | null
  progress: number
}

const easeOutQuart = (x: number) => 1 - Math.pow(1 - x, 4)

// Анимация числа от 0; при «уменьшить движение» — сразу итог.
// Прогресс хранится вместе со значением, к которому относится.
function useCountUp(target: number | null): number | null {
  const [state, setState] = useState<CountUpState>({ target: null, progress: 1 })
  const skip = target === null || prefersReducedMotion()

  useEffect(() => {
    if (skip) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS)
      setState({ target, progress })
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, skip])

  if (skip || target === null) return target
  const progress = state.target === target ? state.progress : 0
  return target * easeOutQuart(progress)
}

function formatValue(value: number | null, kind: KpiValueKind): string {
  if (value === null) return '—'
  return formatNumber(kind === 'percent' ? value * 100 : value)
}

function unitFor(kind: KpiValueKind): string {
  if (kind === 'percent') return '%'
  if (kind === 'currency') return getCurrencySymbol()
  return ''
}

function IconList() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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

// Клик по карточке — переход, кнопка в углу — таблица ДТП (два отдельных <button>)
export function KpiCard({
  label,
  value,
  kind,
  compareValue,
  deltaHigherIsBetter = true,
  deltaLabel = t('roadAccidents.period.vsPrevious'),
  tooltip,
  onOpenList,
  navigate,
  compact = false,
  children,
}: KpiCardProps) {
  const shownValue = useCountUp(value)
  const unit = value === null ? '' : unitFor(kind)
  const exactText = `${formatValue(value, kind)}${unit ? `${NBSP}${unit}` : ''}`

  const delta = compareValue === undefined ? null : kpiDelta(kind, value, compareValue)
  const hasDelta = delta !== null
  const positive = isDeltaPositive(delta?.value, deltaHigherIsBetter)
  const deltaTone = positive === null ? '' : positive ? styles.deltaUp : styles.deltaDown
  const summary = `${label}: ${exactText}${delta ? `, ${delta.text} ${deltaLabel}` : ''}`

  const body = (
    <>
      <span className={styles.label}>{label}</span>
      <span className={styles.valueLine} aria-hidden="true">
        <span className={styles.value}>{formatValue(shownValue, kind)}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {/* Строка дельты всегда в разметке — иначе ряд карточек «плывёт» по высоте */}
      <span className={styles.deltaLine} aria-hidden="true">
        {hasDelta && (
          <span className={`${styles.delta} ${deltaTone}`}>
            {delta.text} {deltaLabel}
          </span>
        )}
      </span>
    </>
  )

  const cardTitle =
    [tooltip, navigate ? t('roadAccidents.kpi.clickHint', { action: navigate.label }) : null]
      .filter(Boolean)
      .join('\n') || undefined

  return (
    <div className={`${styles.card} ${compact ? styles.compact : ''}`} title={cardTitle}>
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
        // Дублирует кнопку в углу только для мыши
        <div
          className={`${styles.main} ${styles.mainClickable}`}
          onClick={onOpenList}
          role="group"
          aria-label={summary}
        >
          {body}
        </div>
      )}
      <button
        type="button"
        className={styles.listButton}
        onClick={onOpenList}
        title={t('roadAccidents.kpi.showList')}
        aria-label={t('roadAccidents.kpi.showListFor', { label: label })}
      >
        <IconList />
      </button>
      {children}
    </div>
  )
}
