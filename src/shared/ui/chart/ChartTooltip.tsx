import type { ReactNode } from 'react'
import { formatNumber } from '@/shared/lib/formatters'
import styles from './ChartTooltip.module.css'

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
  // Заголовок по данным точки (по умолчанию — подпись категории)
  titleFormatter?: (payload: Record<string, unknown> | undefined, label: unknown) => ReactNode
}

// У столбцов и областей заливка — градиент url(#id), берём его верхний цвет
function resolveSwatchColor(color: string | undefined): string | undefined {
  const match = color?.match(/^url\(#(.+)\)$/)
  if (!match) return color
  const stop = document.getElementById(match[1])?.querySelector('stop')
  return stop?.getAttribute('stop-color') ?? undefined
}

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
