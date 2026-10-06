import { observer } from 'mobx-react-lite'
import { t } from '@/shared/i18n'
import { pdfReportStore } from '../model/pdfReportStore'
import styles from './PdfGeneratingOverlay.module.css'

// Блокирующий оверлей на время формирования PDF и итоговое сообщение
export const PdfGeneratingOverlay = observer(function PdfGeneratingOverlay() {
  const { isGenerating, lastError, lastWarning } = pdfReportStore

  if (!isGenerating) {
    const message = lastError ?? lastWarning
    if (!message) return null
    return (
      <div
        className={`${styles.notice} ${lastError ? styles.noticeError : ''}`}
        role={lastError ? 'alert' : 'status'}
      >
        <span className={styles.noticeText}>{message}</span>
        <button
          type="button"
          className={styles.noticeClose}
          onClick={() => pdfReportStore.dismissNotice()}
          aria-label={t('roadAccidents.pdf.closeNotice')}
        >
          ×
        </button>
      </div>
    )
  }

  const { current, total } = pdfReportStore.progress
  const hasProgress = total > 0

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.card}>
        <div className={styles.spinner} />
        <div className={styles.title}>{t('roadAccidents.pdf.generating')}</div>
        <div className={styles.subtitle}>
          {hasProgress
            ? t('roadAccidents.pdf.section', { current: current, total: total })
            : t('roadAccidents.pdf.preparing')}
        </div>
        {hasProgress && (
          <div className={styles.progress} aria-hidden="true">
            <span
              className={styles.progressFill}
              style={{ width: `${(current / total) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
})
