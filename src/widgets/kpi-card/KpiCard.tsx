import { useEffect, useState, type ReactNode } from 'react'
import {
  formatDelta,
  formatNumber,
  getCurrencySymbol,
  isDeltaPositive,
} from '@/shared/lib/formatters'
import styles from './KpiCard.module.css'

// Что за число в карточке: от этого зависят формат и подпись единицы
// (валюта — знак валюты датасета, доля — «%», количество — без единицы).
export type KpiValueKind = 'count' | 'currency' | 'percent'

interface KpiCardProps {
  label: string
  // Сырое значение: для 'percent' — доля 0…1, для остальных — как есть.
  // null — «нет данных», карточка показывает прочерк.
  value: number | null
  kind: KpiValueKind
  delta?: number | null
  deltaHigherIsBetter?: boolean
  // Подпись рядом с дельтой. По умолчанию "к пред. периоду" (Обзор/Автоколонна);
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
  // Уменьшенная карточка — для «Аналитики», где 8 карточек стоят в один ряд
  compact?: boolean
  children?: ReactNode
}

const COUNT_UP_MS = 1300

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Неразрывный пробел между числом и единицей
const NBSP = String.fromCharCode(160)

interface CountUpState {
  target: number | null
  progress: number
}

const easeOutQuart = (x: number) => 1 - Math.pow(1 - x, 4)

// Число «набегает» от 0 до значения при появлении карточки и при смене
// значения (период, автоколонна) — как в эталоне. Анимируется только
// отображение: подписи для скринридера и подсказки берут точное значение
// сразу. При «уменьшить движение» в системе — сразу итоговое число.
//
// Прогресс хранится вместе со значением, к которому он относится: при
// смене значения первый же рендер показывает 0 (прогресс «чужой»), а
// состояние обновляется только из requestAnimationFrame, не из тела
// эффекта.
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

// Универсальная KPI-карточка для всех трёх экранов (оформление — по
// эталону, без спарклайнов): подпись, крупное число с единицей отдельно,
// строка дельты к прошлому периоду (зелёная/красная в зависимости от того,
// хорошо ли растёт именно эта метрика).
//
// Два независимых действия, каждое — настоящая <button> (Tab + Enter/Space,
// читается скринридером), поэтому кнопка в углу не вложена в кнопку карточки,
// а лежит рядом с ней:
// - клик по карточке — drill-down (если есть куда переходить);
// - иконка справа вверху — таблица ДТП (drill-through).
export function KpiCard({
  label,
  value,
  kind,
  delta,
  deltaHigherIsBetter = true,
  deltaLabel = 'к пред. периоду',
  tooltip,
  onOpenList,
  navigate,
  compact = false,
  children,
}: KpiCardProps) {
  const shownValue = useCountUp(value)
  const unit = value === null ? '' : unitFor(kind)
  const exactText = `${formatValue(value, kind)}${unit ? `${NBSP}${unit}` : ''}`

  const hasDelta = delta !== undefined && delta !== null
  const positive = isDeltaPositive(delta, deltaHigherIsBetter)
  const deltaTone = positive === null ? '' : positive ? styles.deltaUp : styles.deltaDown
  const summary = `${label}: ${exactText}${hasDelta ? `, ${formatDelta(delta)} ${deltaLabel}` : ''}`

  const body = (
    <>
      <span className={styles.label}>{label}</span>
      {/* Число для глаз анимируется, для скринридера — сразу точное */}
      <span className={styles.valueLine} aria-hidden="true">
        <span className={styles.value}>{formatValue(shownValue, kind)}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {/* Строка дельты рисуется всегда, даже пустой — иначе карточки без
          дельты (или с null-дельтой, как у автоколонны без ДТП) в одной
          сетке оказываются ниже соседних и ряд карточек "плывёт" по высоте. */}
      <span className={styles.deltaLine} aria-hidden="true">
        {hasDelta && (
          <>
            {/* Как до редизайна: одна строка «−94% к пред. периоду» цветом
                оценки (по просьбе заказчика — вместо чипа эталона) */}
            <span className={`${styles.delta} ${deltaTone}`}>
              {formatDelta(delta)} {deltaLabel}
            </span>
          </>
        )}
      </span>
    </>
  )

  const cardTitle =
    [tooltip, navigate ? `Клик по карточке — ${navigate.label}` : null]
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
        // Без перехода клик по карточке дублирует кнопку в углу — только для
        // мыши; для клавиатуры и скринридера действие одно, кнопка в углу.
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
        title="Показать таблицу ДТП"
        aria-label={`${label}: показать таблицу ДТП`}
      >
        <IconList />
      </button>
      {children}
    </div>
  )
}
