import styles from './AccidentDrilldownModal.module.css'

export type SortKey = 'id' | 'date' | 'motorcade' | 'vehicle' | 'driver' | 'damage' | 'compensated'
export type SortDir = 'asc' | 'desc'

interface SortHeaderProps {
  label: string
  column: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  align?: 'right'
}

export function SortHeader({ label, column, sortKey, sortDir, onSort, align }: SortHeaderProps) {
  const isActive = column === sortKey
  return (
    <th
      scope="col"
      className={align === 'right' ? styles.right : undefined}
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`${styles.sortButton} ${isActive ? styles.sortActive : ''}`}
        onClick={() => onSort(column)}
      >
        {label}
        <span className={styles.sortArrow} aria-hidden="true">
          {isActive ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )
}
