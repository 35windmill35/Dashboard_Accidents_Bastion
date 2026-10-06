import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { t } from '@/shared/i18n'
import styles from './DataTable.module.css'

export interface DataTableColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  align?: 'left' | 'center' | 'right'
  // Колонка забирает оставшуюся ширину, длинный текст — с многоточием
  grow?: boolean
  dim?: boolean
  // Перенос по словам вместо многоточия
  wrap?: boolean
  // Подсказка с полным текстом ячейки
  title?: (row: T) => string
}

function alignClass(align: DataTableColumn<unknown>['align']): string {
  if (align === 'center') return styles.center
  if (align === 'right') return styles.right
  return ''
}

function cellClass<T>(col: DataTableColumn<T>): string {
  return [
    alignClass(col.align),
    col.grow ? (col.wrap ? styles.growWrap : styles.grow) : styles.fit,
    col.dim ? styles.dim : '',
  ]
    .filter(Boolean)
    .join(' ')
}

interface DataTableProps<T> {
  title: string
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  initialLimit?: number
  onRowClick?: (row: T) => void
  showRank?: boolean
}

const PAGE_SIZE = 20

function formatRank(index: number): string {
  return String(index + 1).padStart(2, '0')
}

// Топ-N, «Показать все» — полный список с пагинацией
export function DataTable<T>({
  title,
  columns,
  rows,
  getRowKey,
  initialLimit = 8,
  onRowClick,
  showRank = false,
}: DataTableProps<T>) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  // После смены данных страниц может стать меньше
  const currentPage = Math.min(page, totalPages - 1)
  const visibleRows = expanded ? rows : rows.slice(0, initialLimit)
  const pageOffset = expanded ? currentPage * PAGE_SIZE : 0
  const pageRows = expanded ? visibleRows.slice(pageOffset, pageOffset + PAGE_SIZE) : visibleRows
  const canExpand = rows.length > initialLimit

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick?.(row)
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {canExpand && (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            onClick={() => {
              setExpanded((v) => !v)
              setPage(0)
            }}
          >
            {expanded ? t('roadAccidents.table.collapse') : t('roadAccidents.table.showAll')}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>{t('roadAccidents.common.noDataForPeriod')}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>{title}</caption>
            <thead>
              <tr>
                {showRank && (
                  <th scope="col" className={`${styles.rankCell} ${styles.fit}`}>
                    #
                  </th>
                )}
                {columns.map((col) => (
                  <th key={col.key} scope="col" className={cellClass(col)}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => {
                const rank = pageOffset + index
                return (
                  <tr
                    key={getRowKey(row)}
                    className={onRowClick ? styles.clickableRow : ''}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    {showRank && (
                      <td
                        className={`${styles.rankCell} ${styles.fit} ${rank < 3 ? styles.rankTop : ''}`}
                      >
                        {formatRank(rank)}
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cellClass(col)} title={col.title?.(row)}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {expanded && rows.length > PAGE_SIZE && (
        <div className={styles.pagination}>
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            {t('roadAccidents.common.back')}
          </button>
          <span>
            {t('roadAccidents.common.pageOf', { page: currentPage + 1, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            {t('roadAccidents.common.forward')}
          </button>
        </div>
      )}
    </section>
  )
}
