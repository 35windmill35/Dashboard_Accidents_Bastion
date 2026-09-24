import { observer } from 'mobx-react-lite'
import { pdfReportStore } from '../model/pdfReportStore'
import styles from './PdfGeneratingOverlay.module.css'

// Полноэкранная блокирующая подложка на время формирования PDF — это же и
// есть блокировка повторного клика (кнопка в шапке тоже дизейблится, но
// оверлей не даёт взаимодействовать вообще ни с чем на экране). Рисуется
// поверх контента, на сам захват html2canvas не влияет — тот снимает
// конкретные DOM-узлы независимо от того, что визуально поверх них.
export const PdfGeneratingOverlay = observer(function PdfGeneratingOverlay() {
  if (!pdfReportStore.isGenerating) return null

  const { current, total } = pdfReportStore.progress
  const hasProgress = total > 0

  return (
    <div className={styles.overlay} role="alert" aria-live="polite">
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
