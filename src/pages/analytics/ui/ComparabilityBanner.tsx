import styles from './ComparabilityBanner.module.css'

interface ComparabilityBannerProps {
  warnings: string[]
}

// Баннер о сопоставимости двух автоколонн (ТЗ §4.5). Тексты считаются в
// analyticsData.buildComparabilityWarnings — те же строки уходят в PDF.
export function ComparabilityBanner({ warnings }: ComparabilityBannerProps) {
  if (warnings.length === 0) return null

  return (
    <section className={styles.banner} aria-label="Сопоставимость данных">
      <div className={styles.title}>Сопоставимость данных</div>
      <ul className={styles.list}>
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </section>
  )
}
