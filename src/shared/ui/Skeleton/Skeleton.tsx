import styles from './Skeleton.module.css'

interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: number | string
  count?: number
}

// Плейсхолдер на время загрузки. width/height подбираются под форму
// реального контента, count — для набора одинаковых плейсхолдеров.
export function Skeleton({ width = '100%', height = 20, radius, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={styles.skeleton}
          style={{
            width,
            height,
            borderRadius: radius ?? 'var(--radius-sm)',
            marginBottom: count > 1 && i < count - 1 ? 8 : 0,
          }}
        />
      ))}
    </>
  )
}
