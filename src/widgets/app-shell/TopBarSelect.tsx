import type { ReactNode, SelectHTMLAttributes } from 'react'
import { IconChevronDown } from './icons'
import styles from './AppTopBar.module.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  dotColor?: string
  children: ReactNode
}

// Нативный <select> со своей стрелкой
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
