import styles from './SectionDivider.module.css'

interface SectionDividerProps {
  title: string
}

export function SectionDivider({ title }: SectionDividerProps) {
  return (
    <div className={styles.divider}>
      <h2 className={styles.title}>{title}</h2>
      <span className={styles.line} aria-hidden="true" />
    </div>
  )
}
