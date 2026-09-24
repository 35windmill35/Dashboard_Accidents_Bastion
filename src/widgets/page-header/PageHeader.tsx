import styles from './PageHeader.module.css'

interface PageHeaderProps {
  // Надзаголовок-раздел капсом над заголовком
  eyebrow: string
  title: string
  // Мелкие пояснения справа (период, охват), разделяются точкой
  meta?: string[]
}

// Заголовок экрана по эталону: надзаголовок акцентным цветом, крупный
// заголовок (шрифт --font-display) и справа — период и охват данных.
export function PageHeader({ eyebrow, title, meta = [] }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.titles}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.title}>{title}</h1>
      </div>
      {meta.length > 0 && (
        <div className={styles.meta}>
          {meta.map((item, index) => (
            <span key={index} className={styles.metaItem}>
              {index > 0 && <span className={styles.dot} aria-hidden="true" />}
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
