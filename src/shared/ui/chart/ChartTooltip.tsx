import type { ReactNode } from 'react'
import { formatNumber } from '@/shared/lib/formatters'
import styles from './ChartTooltip.module.css'

// Минимальный срез того, что Recharts передаёт в content у <Tooltip>
interface TooltipEntry {
  name?: string | number
  value?: unknown
  color?: string
  fill?: string
  dataKey?: unknown
  payload?: Record<string, unknown> & { fill?: string }
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<TooltipEntry>
  label?: unknown
  // Формат значений (по умолчанию — число с разделителями разрядов)
  valueFormatter?: (value: number) => string
  // Заголовок подсказки по данным точки (например, полное название месяца
  // вместо сокращённого с оси); без него — подпись категории
  titleFormatter?: (payload: Record<string, unknown> | undefined, label: unknown) => ReactNode
}

// Цвет квадрата в подсказке. Recharts отдаёт цвет серии как её заливку, а у
// столбцов и областей заливка — градиент url(#id): берём цвет верхней точки
// этого градиента (это и есть цвет серии).
function resolveSwatchColor(color: string | undefined): string | undefined {
  const match = color?.match(/^url\(#(.+)\)$/)
  if (!match) return color
  const stop = document.getElementById(match[1])?.querySelector('stop')
  return stop?.getAttribute('stop-color') ?? undefined
}

// Всплывающая подсказка по эталону: заголовок приглушённым цветом, ниже —
// строки «цветной квадрат · название · значение». Текст — цветами текста,
// цвет серии несёт только квадрат.
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (value) => formatNumber(value),
  titleFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const first = payload[0]
  const title = titleFormatter
    ? titleFormatter(first.payload, label)
    : ((label as ReactNode) ?? first.name)

  return (
    <div className={styles.tooltip}>
      {title !== undefined && title !== null && title !== '' && (
        <span className={styles.title}>{title}</span>
      )}
      {payload.map((entry, index) => (
        <span key={`${String(entry.dataKey)}-${index}`} className={styles.row}>
          <span
            className={styles.swatch}
            style={{
              background: resolveSwatchColor(entry.color ?? entry.fill ?? entry.payload?.fill),
            }}
            aria-hidden="true"
          />
          <span className={styles.name}>{entry.name}</span>
          <span className={styles.value}>{valueFormatter(Number(entry.value))}</span>
        </span>
      ))}
    </div>
  )
}
