import type { ReactNode } from 'react'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import styles from './StatusScreen.module.css'

type StatusTone = 'loading' | 'locked' | 'error'

interface StatusScreenProps {
  tone: StatusTone
  title: string
  message?: ReactNode
  // Прогресс загрузки 0…1; null — неопределённый (бегущая полоса)
  progress?: number | null
  // Кнопки действий: обычные <button>, первая оформляется как основная
  children?: ReactNode
}

function ToneIcon({ tone }: { tone: StatusTone }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (tone === 'locked') {
    return (
      <svg {...common}>
        <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M12 3.5 21.5 20h-19Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.2v.3" />
    </svg>
  )
}

// Полноэкранное состояние вне каркаса приложения — загрузка данных, «нет
// доступа», ошибка загрузки. Оформление — как у экрана входа (эталон):
// карточка с логотипом на фоне с синим свечением. У загрузки вместо значка —
// полоса прогресса.
export function StatusScreen({ tone, title, message, progress, children }: StatusScreenProps) {
  const isLoading = tone === 'loading'

  return (
    <div className={styles.wrapper}>
      <div className={styles.card} role={isLoading ? 'status' : 'alert'} aria-live="polite">
        <BrandLogo size={48} />

        {!isLoading && (
          <span className={`${styles.badge} ${tone === 'error' ? styles.badgeError : ''}`}>
            <ToneIcon tone={tone} />
          </span>
        )}

        <h1 className={styles.title}>{title}</h1>
        {message && <p className={styles.message}>{message}</p>}

        {isLoading && (
          <div
            className={styles.progress}
            role="progressbar"
            aria-label={title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress != null ? Math.round(progress * 100) : undefined}
          >
            <span
              className={progress != null ? styles.progressFill : styles.progressIndeterminate}
              style={progress != null ? { width: `${Math.max(4, progress * 100)}%` } : undefined}
            />
          </div>
        )}

        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </div>
  )
}
