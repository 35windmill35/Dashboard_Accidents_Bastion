import { useState } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import type { CauseSlice } from '@/entities/accident/lib/metrics'
import { CAUSE_CATEGORY_COLORS } from '@/shared/lib/chartColors'
import { formatNumber, formatPercent } from '@/shared/lib/formatters'
import styles from './CauseDonut.module.css'

interface CauseDonutProps {
  // Только категории с ДТП (count > 0)
  slices: CauseSlice[]
  // Клик по сектору или строке списка — детализация этой категории
  onSelect: (slice: CauseSlice) => void
}

const RING_SIZE = 200
const RING_THICKNESS = 14

// Сокращения категорий для центра кольца (полное название — в списке)
const SHORT_LABELS: Record<CauseSlice['category'], string> = {
  driverFault: 'Вина водителя',
  thirdPartyFault: 'Третья сторона',
  noDamage: 'Без повреждений',
  undetermined: 'Не определён',
  underReview: 'На рассмотрении',
}

// Структура причин ДТП по эталону: тонкое кольцо с итогом в центре и
// список категорий справа (доля, число ДТП, полоска доли). Список — и
// легенда, и подписи значений: цвет не единственный носитель смысла.
// Наведение на сектор или строку подсвечивает пару и показывает долю
// категории в центре; клик — таблица ДТП этой категории.
export function CauseDonut({ slices, onSelect }: CauseDonutProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  const active = hovered !== null ? slices[hovered] : null

  return (
    <div className={styles.wrap}>
      <div className={styles.ring}>
        <span className={styles.orbit} aria-hidden="true" />
        <PieChart width={RING_SIZE} height={RING_SIZE}>
          {/* Дорожка под сектором — видна в зазорах между категориями */}
          <Pie
            data={[{ value: 1 }]}
            dataKey="value"
            innerRadius={RING_SIZE / 2 - 10 - RING_THICKNESS}
            outerRadius={RING_SIZE / 2 - 10}
            fill="var(--color-soft-2)"
            stroke="none"
            isAnimationActive={false}
          />
          <Pie
            data={slices}
            dataKey="count"
            nameKey="label"
            innerRadius={RING_SIZE / 2 - 10 - RING_THICKNESS}
            outerRadius={RING_SIZE / 2 - 10}
            startAngle={90}
            endAngle={-270}
            paddingAngle={slices.length > 1 ? 1.5 : 0}
            cornerRadius={2}
            stroke="none"
            animationDuration={1100}
            animationEasing="ease-out"
            onMouseEnter={(_, index) => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onClick={(_, index) => {
              const slice = slices[index]
              if (slice) onSelect(slice)
            }}
            style={{ cursor: 'pointer' }}
          >
            {slices.map((slice, index) => (
              <Cell
                key={slice.category}
                fill={CAUSE_CATEGORY_COLORS[slice.category]}
                opacity={hovered === null || hovered === index ? 1 : 0.3}
              />
            ))}
          </Pie>
        </PieChart>

        <div className={styles.center} aria-hidden="true">
          <span className={styles.centerCaption}>
            {active ? SHORT_LABELS[active.category] : 'Всего'}
          </span>
          <span className={styles.centerValue}>
            {active
              ? formatPercent(total > 0 ? active.count / total : null, 1)
              : formatNumber(total)}
          </span>
          <span className={styles.centerUnit}>
            {active ? `${formatNumber(active.count)} ДТП` : 'ДТП'}
          </span>
        </div>
      </div>

      <ul className={styles.list}>
        {slices.map((slice, index) => {
          const share = total > 0 ? slice.count / total : 0
          const color = CAUSE_CATEGORY_COLORS[slice.category]
          return (
            <li key={slice.category}>
              <button
                type="button"
                className={`${styles.item} ${hovered === index ? styles.itemActive : ''}`}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                onClick={() => onSelect(slice)}
                aria-label={`${slice.label}: ${formatPercent(share, 1)}, ${formatNumber(slice.count)} ДТП. Показать таблицу ДТП`}
              >
                <span className={styles.itemRow}>
                  <span
                    className={styles.dot}
                    style={{ background: color, boxShadow: `0 0 0 3px ${color}22` }}
                  />
                  <span className={styles.itemName}>{slice.label}</span>
                  <span className={styles.itemShare}>{formatPercent(share, 1)}</span>
                  <span className={styles.itemCount}>{formatNumber(slice.count)}</span>
                </span>
                <span className={styles.bar}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${share * 100}%`,
                      background: `linear-gradient(90deg, ${color}33, ${color})`,
                    }}
                  />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
