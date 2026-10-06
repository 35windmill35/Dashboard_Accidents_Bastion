import { t } from '@/shared/i18n'
import styles from './ComparabilityBanner.module.css'

interface ComparabilityBannerProps {
  warnings: string[]
}

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
