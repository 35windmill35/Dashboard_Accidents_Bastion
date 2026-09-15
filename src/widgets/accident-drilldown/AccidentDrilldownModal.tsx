import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { drilldownStore } from './model/drilldownStore'
import { authStore } from '@/entities/user/model/authStore'
import type { AccidentRow } from '@/entities/accident/model/types'
import { getMotorcadeName } from '@/entities/accident/lib/motorcade'
import { getCauseCategory, CAUSE_CATEGORY_LABELS } from '@/shared/config/accidentCauses'
import { formatCurrency, formatDate, formatTime } from '@/shared/lib/formatters'
import { downloadCsv } from '@/shared/lib/csvExport'
import styles from './AccidentDrilldownModal.module.css'

const PAGE_SIZE = 50
const VIRTUALIZE_THRESHOLD = 200

type SortKey = 'date' | 'motorcade' | 'vehicle' | 'driver' | 'damage' | 'compensated'
type SortDir = 'asc' | 'desc'

function vehicleLabel(row: AccidentRow): string {
  const parts = [row.GARAGE_NUM ? `№${row.GARAGE_NUM}` : null, row.CAR_MAKE_MODEL].filter(Boolean)
  return parts.join(', ') || '—'
}

function sortValue(row: AccidentRow, key: SortKey): number | string {
  switch (key) {
    case 'date':
      return row.ACCIDENT_DATE || ''
    case 'motorcade':
      return getMotorcadeName(row)
    case 'vehicle':
      return vehicleLabel(row)
    case 'driver':
      return row.DRIVER_NAME || ''
    case 'damage':
      return row.ACCIDENT_DAMAGE ?? 0
    case 'compensated':
      return row.ACCIDENT_COMPENSATED_DAMAGE ?? 0
  }
}

export const AccidentDrilldownModal = observer(function AccidentDrilldownModal() {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const showBaseColumn = (authStore.allowedDbIndexes?.length ?? 0) > 1
  const isOpen = drilldownStore.isOpen
  const title = drilldownStore.title
  const rows = drilldownStore.rows

  useEffect(() => {
    if (!isOpen) return
    setSearch('')
    setSortKey('date')
    setSortDir('desc')
    setPage(0)
    setExpandedId(null)
  }, [isOpen, title])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drilldownStore.close()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const filteredSorted = useMemo(() => {
    const query = search.trim().toLowerCase()
    let filtered = rows

    if (query) {
      filtered = filtered.filter((row) => {
        const haystack =
          `${row.DRIVER_NAME || ''} ${row.GARAGE_NUM || ''} ${row.ACCIDENT_ADDRESS || ''}`.toLowerCase()
        return haystack.includes(query)
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      const va = sortValue(a, sortKey)
      const vb = sortValue(b, sortKey)
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'ru')
      return sortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [rows, search, sortKey, sortDir])

  if (!isOpen) return null

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
  const pageRows =
    filteredSorted.length > VIRTUALIZE_THRESHOLD
      ? filteredSorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      : filteredSorted

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleExport = () => {
    const headers = [
      'Дата',
      'Время',
      'Автоколонна',
      'ТС',
      'Водитель',
      'Маршрут',
      'Адрес',
      'Причина',
      'Категория',
      'Виновник',
      'Ущерб',
      'Возмещение',
      'Статус',
      'Страховая',
      'Пострадавшие',
    ]

    const rows = filteredSorted.map((row) => [
      formatDate(row.ACCIDENT_DATE),
      formatTime(row.ACCIDENT_TIME),
      getMotorcadeName(row),
      vehicleLabel(row),
      row.DRIVER_NAME || '',
      row.ROUTE_NAME || '',
      row.ACCIDENT_ADDRESS || '',
      row.ACCIDENT_CAUSE_NAME || '',
      CAUSE_CATEGORY_LABELS[getCauseCategory(row)],
      row.ACCIDENT_CAUSER_NAME || '',
      String(row.ACCIDENT_DAMAGE ?? 0),
      String(row.ACCIDENT_COMPENSATED_DAMAGE ?? 0),
      row.ACCIDENT_STATUS_NAME || '',
      row.INSURANCE_COMPANY_NAME || '',
      row.ACCIDENT_VICTIM || '',
    ])

    downloadCsv(`dtp-detalizaciya-${Date.now()}.csv`, headers, rows)
  }

  return (
    <div className={styles.backdrop} onClick={() => drilldownStore.close()}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>Найдено записей: {filteredSorted.length}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => drilldownStore.close()}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className={styles.toolbar}>
          <input
            className={styles.search}
            type="text"
            placeholder="Поиск: водитель, гаражный номер, адрес"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
          <button type="button" className={styles.exportButton} onClick={handleExport}>
            Выгрузить CSV
          </button>
        </div>

        {filteredSorted.length === 0 ? (
          <div className={styles.empty}>Ничего не найдено</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th />
                  <th onClick={() => toggleSort('date')}>Дата/время</th>
                  <th onClick={() => toggleSort('motorcade')}>Автоколонна</th>
                  <th onClick={() => toggleSort('vehicle')}>ТС</th>
                  <th onClick={() => toggleSort('driver')}>Водитель</th>
                  <th>Маршрут</th>
                  <th>Адрес</th>
                  <th>Причина</th>
                  <th>Виновник</th>
                  <th onClick={() => toggleSort('damage')}>Ущерб</th>
                  <th onClick={() => toggleSort('compensated')}>Возмещение</th>
                  <th>Статус</th>
                  <th>Страховая</th>
                  <th>Пострадавшие</th>
                  {showBaseColumn && <th>База</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const isExpanded = expandedId === row.ACCIDENT_ID
                  const hasDetails = Boolean(row.ACCIDENT_DETAILS || row.ACCIDENT_COMMENT)
                  return (
                    <Fragment key={row.ACCIDENT_ID}>
                      <tr>
                        <td>
                          {hasDetails && (
                            <button
                              type="button"
                              className={styles.expandButton}
                              onClick={() => setExpandedId(isExpanded ? null : row.ACCIDENT_ID)}
                              aria-label="Показать подробности"
                            >
                              {isExpanded ? '−' : '+'}
                            </button>
                          )}
                        </td>
                        <td>
                          {formatDate(row.ACCIDENT_DATE)} {formatTime(row.ACCIDENT_TIME)}
                        </td>
                        <td>{getMotorcadeName(row)}</td>
                        <td>{vehicleLabel(row)}</td>
                        <td>{row.DRIVER_NAME || '—'}</td>
                        <td>{row.ROUTE_NAME || '—'}</td>
                        <td>{row.ACCIDENT_ADDRESS || '—'}</td>
                        <td>
                          {row.ACCIDENT_CAUSE_NAME || '—'}
                          <span className={styles.causeTag}>
                            {CAUSE_CATEGORY_LABELS[getCauseCategory(row)]}
                          </span>
                        </td>
                        <td>{row.ACCIDENT_CAUSER_NAME || '—'}</td>
                        <td>{formatCurrency(row.ACCIDENT_DAMAGE)}</td>
                        <td>{formatCurrency(row.ACCIDENT_COMPENSATED_DAMAGE)}</td>
                        <td>{row.ACCIDENT_STATUS_NAME || '—'}</td>
                        <td>{row.INSURANCE_COMPANY_NAME || '—'}</td>
                        <td>{row.ACCIDENT_VICTIM || '—'}</td>
                        {showBaseColumn && (
                          <td>{authStore.firms[row.DB_INDEX]?.FIRM_SHORT_NAME || row.DB_INDEX}</td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr className={styles.detailsRow}>
                          <td />
                          <td colSpan={showBaseColumn ? 13 : 12}>
                            {row.ACCIDENT_DETAILS && <p>{row.ACCIDENT_DETAILS}</p>}
                            {row.ACCIDENT_COMMENT && <p>{row.ACCIDENT_COMMENT}</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredSorted.length > VIRTUALIZE_THRESHOLD && (
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
    </div>
  )
})
