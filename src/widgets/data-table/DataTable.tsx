import { useState, type ReactNode } from 'react'
import styles from './DataTable.module.css'

export interface DataTableColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
}

interface DataTableProps<T> {
  title: string
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  initialLimit?: number
  onRowClick?: (row: T) => void
}

const PAGE_SIZE = 20

// Топ-N по умолчанию, "Показать все" разворачивает в полный список с
// пагинацией — переиспользуется на всех трёх экранах.
export function DataTable<T>({
  title,
  columns,
  rows,
  getRowKey,
  initialLimit = 8,
  onRowClick,
}: DataTableProps<T>) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)

  const visibleRows = expanded ? rows : rows.slice(0, initialLimit)
  const pageRows = expanded
    ? visibleRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : visibleRows
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const canExpand = rows.length > initialLimit

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        {canExpand && (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => {
              setExpanded((v) => !v)
              setPage(0)
            }}
          >
            {expanded ? 'Свернуть' : 'Показать все'}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>Нет данных</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.align === 'right' ? styles.right : ''}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className={onRowClick ? styles.clickableRow : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.align === 'right' ? styles.right : ''}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && rows.length > PAGE_SIZE && (
        <div className={styles.pagination}>
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Назад
          </button>
          <span>
            Страница {page + 1} из {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  )
}
