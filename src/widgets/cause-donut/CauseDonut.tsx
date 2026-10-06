import { useState } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import type { CauseSlice } from '@/entities/accident/lib/metrics'
import { CAUSE_CATEGORY_COLORS } from '@/shared/lib/chartColors'
import { formatNumber, formatPercent } from '@/shared/lib/formatters'
import { t } from '@/shared/i18n'
import styles from './CauseDonut.module.css'

interface CauseDonutProps {
  slices: CauseSlice[]
  onSelect: (slice: CauseSlice) => void
}

const RING_SIZE = 200
const RING_THICKNESS = 14

// Сокращения для центра кольца
const SHORT_LABELS: Record<CauseSlice['category'], string> = {
  driverFault: t('roadAccidents.cause.driverFault'),
  thirdPartyFault: t('roadAccidents.cause.short.thirdPartyFault'),
  noDamage: t('roadAccidents.cause.short.noDamage'),
  undetermined: t('roadAccidents.cause.short.undetermined'),
  underReview: t('roadAccidents.cause.underReview'),
}

// Список справа — и легенда, и подписи значений
export function CauseDonut({ slices, onSelect }: CauseDonutProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  const active = hovered !== null ? slices[hovered] : null

  return (
    <div className={styles.wrap}>
      <div className={styles.ring}>
        <span className={styles.orbit} aria-hidden="true" />
        <PieChart width={RING_SIZE} height={RING_SIZE}>
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
            {active ? SHORT_LABELS[active.category] : t('roadAccidents.common.totalShort')}
          </span>
          <span className={styles.centerValue}>
            {active
              ? formatPercent(total > 0 ? active.count / total : null, 1)
              : formatNumber(total)}
          </span>
          <span className={styles.centerUnit}>
            {active
              ? t('roadAccidents.chart.donut.accidentsCount', { count: formatNumber(active.count) })
              : t('roadAccidents.common.accidents')}
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
                aria-label={t('roadAccidents.chart.donut.sliceLabel', {
                  label: slice.label,
                  share: formatPercent(share, 1),
                  count: formatNumber(slice.count),
                })}
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
