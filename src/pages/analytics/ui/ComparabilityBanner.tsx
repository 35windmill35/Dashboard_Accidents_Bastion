import { t } from '@/shared/i18n'
import styles from './ComparabilityBanner.module.css'

interface ComparabilityBannerProps {
  warnings: string[]
}

// Баннер о сопоставимости двух автоколонн. Тексты считаются в
// analyticsData.buildComparabilityWarnings — те же строки уходят в PDF.
export function ComparabilityBanner({ warnings }: ComparabilityBannerProps) {
  if (warnings.length === 0) return null

  return (
    <section className={styles.banner} aria-label={t('roadAccidents.analytics.comparabilityTitle')}>
      <div className={styles.title}>{t('roadAccidents.analytics.comparabilityTitle')}</div>
      <ul className={styles.list}>
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </section>
  )
}
