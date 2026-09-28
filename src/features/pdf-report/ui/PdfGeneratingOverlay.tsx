import { observer } from 'mobx-react-lite'
import { pdfReportStore } from '../model/pdfReportStore'
import styles from './PdfGeneratingOverlay.module.css'

// Полноэкранная блокирующая подложка на время формирования PDF — это же и
// есть блокировка повторного клика (кнопка в шапке тоже дизейблится, но
// оверлей не даёт взаимодействовать вообще ни с чем на экране).
//
// После формирования здесь же показывается итог, если что-то пошло не так:
// ошибка (файла нет) или предупреждение (файл сохранён без части разделов).
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
          aria-label="Закрыть сообщение"
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
        <div className={styles.title}>Формируется PDF-отчёт…</div>
        <div className={styles.subtitle}>
          {hasProgress ? `Раздел ${current} из ${total}` : 'Подготовка разделов'}
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
