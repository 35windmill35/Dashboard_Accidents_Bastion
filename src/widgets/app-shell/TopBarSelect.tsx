import type { ReactNode, SelectHTMLAttributes } from 'react'
import { IconChevronDown } from './icons'
import styles from './AppTopBar.module.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  // Цветная точка слева — цвет серии автоколонны на графиках «Аналитики»
  dotColor?: string
  children: ReactNode
}

// Нативный <select> (клавиатура, скринридер, мобильный выбор — как было),
// оформленный по эталону: своя стрелка вместо системной, опционально —
// цветная точка серии.
export function TopBarSelect({ dotColor, className, children, ...selectProps }: SelectProps) {
  return (
    <div className={styles.selectWrap}>
      {dotColor && (
        <span className={styles.selectDot} style={{ background: dotColor }} aria-hidden="true" />
      )}
      <select
        {...selectProps}
        className={`${styles.select} ${dotColor ? styles.selectWithDot : ''} ${className ?? ''}`}
      >
        {children}
      </select>
      <span className={styles.selectChevron} aria-hidden="true">
        <IconChevronDown />
      </span>
    </div>
  )
}
