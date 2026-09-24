import styles from './ErrorState.module.css'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

// Состояние ошибки. Кнопка "Повторить" показывается, только если передан
// onRetry.
export function ErrorState({ message = 'Не удалось загрузить данные', onRetry }: ErrorStateProps) {
  return (
    <div className={styles.wrapper} role="status">
      <span className={styles.icon} aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v4.5" />
          <path d="M12 15.8v.2" />
        </svg>
      </span>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button className={styles.retry} type="button" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}
