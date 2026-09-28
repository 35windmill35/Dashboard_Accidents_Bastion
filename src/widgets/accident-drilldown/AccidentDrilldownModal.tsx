import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { drilldownStore } from './model/drilldownStore'
import { authStore } from '@/entities/user/model/authStore'
import type { AccidentRow } from '@/entities/accident/model/types'
import { getMotorcadeName } from '@/entities/accident/lib/motorcade'
import { getCauseCategory, CAUSE_CATEGORY_LABELS } from '@/shared/config/accidentCauses'
import { formatCurrency, formatDate, formatTime } from '@/shared/lib/formatters'
import { downloadCsv } from '@/shared/lib/csvExport'
import { SortHeader, type SortDir, type SortKey } from './SortHeader'
import styles from './AccidentDrilldownModal.module.css'

const PAGE_SIZE = 50
const VIRTUALIZE_THRESHOLD = 200

// ACCIDENT_ID уникален только в пределах базы
function rowKey(row: AccidentRow): string {
  return `${row.DB_INDEX}:${row.ACCIDENT_ID}`
}

function dateTimeLabel(row: AccidentRow): string {
  const time = formatTime(row.ACCIDENT_TIME)
  return time === '—' ? formatDate(row.ACCIDENT_DATE) : `${formatDate(row.ACCIDENT_DATE)} ${time}`
}

// Необязательные колонки: если во всём списке поле пустое (в текущих данных
// так с маршрутом, страховой и пострадавшими), колонка — сплошные «—» и
// только расширяет таблицу. Такие колонки скрываются и на экране, и в CSV.
const OPTIONAL_COLUMNS = [
  { key: 'route', label: 'Маршрут', value: (row: AccidentRow) => row.ROUTE_NAME },
  { key: 'address', label: 'Адрес', value: (row: AccidentRow) => row.ACCIDENT_ADDRESS },
  { key: 'insurance', label: 'Страховая', value: (row: AccidentRow) => row.INSURANCE_COMPANY_NAME },
  { key: 'victim', label: 'Пострадавшие', value: (row: AccidentRow) => row.ACCIDENT_VICTIM },
] as const

type OptionalColumnKey = (typeof OPTIONAL_COLUMNS)[number]['key']

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

// Модалка «Список ДТП» (drill-through) по эталону: крупный заголовок с
// надзаголовком, поиск с иконкой, выгрузка CSV, таблица с закреплённой
// шапкой; статус дела — чипом (открытое дело — акцентом, закрытое — серым).
export const AccidentDrilldownModal = observer(function AccidentDrilldownModal() {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  // Куда вернуть фокус после закрытия — на кнопку/карточку, открывшую модалку
  const returnFocusRef = useRef<HTMLElement | null>(null)

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
    setExpandedKey(null)
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

    returnFocusRef.current = document.activeElement as HTMLElement | null
    // Страница под модалкой не прокручивается
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      const target = returnFocusRef.current
      if (target && document.contains(target)) target.focus()
    }
  }, [isOpen])

  const visibleOptional = useMemo(() => {
    const visible = new Set<OptionalColumnKey>()
    OPTIONAL_COLUMNS.forEach((column) => {
      if (rows.some((row) => Boolean(column.value(row)))) visible.add(column.key)
    })
    return visible
  }, [rows])

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

  // Вторая линия защиты: без действующей сессии список с ПДн не рисуем,
  // даже если стор по какой-то причине не успел закрыться.
  if (!isOpen || !authStore.isAuthenticated) return null

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
    setPage(0)
  }

  const sortProps = { sortKey, sortDir, onSort: toggleSort }

  const handleExport = () => {
    const optional = OPTIONAL_COLUMNS.filter((column) => visibleOptional.has(column.key))
    const headers = [
      'Дата',
      'Время',
      'Автоколонна',
      'ТС',
      'Водитель',
      ...optional.map((column) => column.label),
      'Причина',
      'Категория',
      'Виновник',
      'Ущерб',
      'Возмещение',
      'Статус',
      ...(showBaseColumn ? ['База'] : []),
    ]

    const csvRows = filteredSorted.map((row) => {
      const time = formatTime(row.ACCIDENT_TIME)
      return [
        formatDate(row.ACCIDENT_DATE),
        time === '—' ? '' : time,
        getMotorcadeName(row),
        vehicleLabel(row),
        row.DRIVER_NAME || '',
        ...optional.map((column) => column.value(row) || ''),
        row.ACCIDENT_CAUSE_NAME || '',
        CAUSE_CATEGORY_LABELS[getCauseCategory(row)],
        row.ACCIDENT_CAUSER_NAME || '',
        String(row.ACCIDENT_DAMAGE ?? 0),
        String(row.ACCIDENT_COMPENSATED_DAMAGE ?? 0),
        row.ACCIDENT_STATUS_NAME || '',
        ...(showBaseColumn ? [authStore.getFirmName(row.DB_INDEX)] : []),
      ]
    })

    const stamp = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const fileStamp = `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}`
    downloadCsv(`dtp-spisok-${fileStamp}.csv`, headers, csvRows)
  }

  // Колонок в таблице: кнопка раскрытия + 9 постоянных + необязательные +
  // база. Строка подробностей занимает всё, кроме первой.
  const totalColumns = 1 + 9 + visibleOptional.size + (showBaseColumn ? 1 : 0)

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
          <div className={styles.titles}>
            <span className={styles.eyebrow}>Список ДТП</span>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>Найдено записей: {filteredSorted.length}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => drilldownStore.close()}
            aria-label="Закрыть"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <svg
              className={styles.searchIcon}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              className={styles.search}
              type="search"
              aria-label="Поиск по списку ДТП"
              placeholder="Поиск: водитель, гаражный номер, адрес"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </div>
          <button type="button" className={styles.exportButton} onClick={handleExport}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4v11" />
              <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
              <path d="M5 20h14" />
            </svg>
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
                  <th scope="col" aria-label="Подробности" />
                  <SortHeader label="Дата/время" column="date" {...sortProps} />
                  <SortHeader label="Автоколонна" column="motorcade" {...sortProps} />
                  <SortHeader label="ТС" column="vehicle" {...sortProps} />
                  <SortHeader label="Водитель" column="driver" {...sortProps} />
                  {visibleOptional.has('route') && <th scope="col">Маршрут</th>}
                  {visibleOptional.has('address') && <th scope="col">Адрес</th>}
                  <th scope="col">Причина</th>
                  <th scope="col">Виновник</th>
                  <SortHeader label="Ущерб" column="damage" align="right" {...sortProps} />
                  <SortHeader
                    label="Возмещение"
                    column="compensated"
                    align="right"
                    {...sortProps}
                  />
                  <th scope="col">Статус</th>
                  {visibleOptional.has('insurance') && <th scope="col">Страховая</th>}
                  {visibleOptional.has('victim') && <th scope="col">Пострадавшие</th>}
                  {showBaseColumn && <th scope="col">База</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const key = rowKey(row)
                  const isExpanded = expandedKey === key
                  const hasDetails = Boolean(row.ACCIDENT_DETAILS || row.ACCIDENT_COMMENT)
                  return (
                    <Fragment key={key}>
                      <tr className={isExpanded ? styles.rowExpanded : undefined}>
                        <td>
                          {hasDetails && (
                            <button
                              type="button"
                              className={styles.expandButton}
                              onClick={() => setExpandedKey(isExpanded ? null : key)}
                              aria-label={
                                isExpanded ? 'Скрыть подробности' : 'Показать подробности'
                              }
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? '−' : '+'}
                            </button>
                          )}
                        </td>
                        <td className={styles.muted}>{dateTimeLabel(row)}</td>
                        <td>{getMotorcadeName(row)}</td>
                        <td>{vehicleLabel(row)}</td>
                        <td>{row.DRIVER_NAME || '—'}</td>
                        {visibleOptional.has('route') && (
                          <td className={styles.muted}>{row.ROUTE_NAME || '—'}</td>
                        )}
                        {visibleOptional.has('address') && (
                          <td
                            className={`${styles.muted} ${styles.address}`}
                            title={row.ACCIDENT_ADDRESS || undefined}
                          >
                            {row.ACCIDENT_ADDRESS || '—'}
                          </td>
                        )}
                        <td>
                          {row.ACCIDENT_CAUSE_NAME || '—'}
                          <span className={styles.causeTag}>
                            {CAUSE_CATEGORY_LABELS[getCauseCategory(row)]}
                          </span>
                        </td>
                        <td>{row.ACCIDENT_CAUSER_NAME || '—'}</td>
                        <td className={styles.right}>{formatCurrency(row.ACCIDENT_DAMAGE)}</td>
                        <td className={`${styles.right} ${styles.muted}`}>
                          {formatCurrency(row.ACCIDENT_COMPENSATED_DAMAGE)}
                        </td>
                        <td>
                          {row.ACCIDENT_STATUS_NAME ? (
                            <span
                              className={`${styles.status} ${row.ACCIDENT_IS_CASE_CLOSED ? '' : styles.statusOpen}`}
                            >
                              {row.ACCIDENT_STATUS_NAME}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        {visibleOptional.has('insurance') && (
                          <td>{row.INSURANCE_COMPANY_NAME || '—'}</td>
                        )}
                        {visibleOptional.has('victim') && <td>{row.ACCIDENT_VICTIM || '—'}</td>}
                        {showBaseColumn && <td>{authStore.getFirmName(row.DB_INDEX)}</td>}
                      </tr>
                      {isExpanded && (
                        <tr className={styles.detailsRow}>
                          <td />
                          <td colSpan={totalColumns - 1}>
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
