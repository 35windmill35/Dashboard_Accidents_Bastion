import { useId, useState, type ReactNode } from 'react'
import { t } from '@/shared/i18n'
import styles from './ChartCard.module.css'

export interface ChartLegendItem {
  label: string
  color: string
}

// Текстовая альтернатива графику
export interface ChartDataTable {
  columns: string[]
  rows: string[][]
}

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  height?: number
  legend?: ChartLegendItem[]
  table?: ChartDataTable
}

// Карточка — subgrid на две строки родительской сетки, чтобы графики соседей начинались с одной линии.
// Таблица данных показывается в той же высоте, что и график.
export function ChartCard({
  title,
  subtitle,
  children,
  height = 280,
  legend,
  table,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()
  const isTableVisible = showTable && table !== undefined
  const legendItems = legend ?? []

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titles}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>

        <div className={styles.tools}>
          {!isTableVisible &&
            legendItems.map((item) => (
              <span key={item.label} className={styles.legendItem}>
                <span className={styles.legendSwatch} style={{ background: item.color }} />
                {item.label}
              </span>
            ))}

          {table && (
            <div
              className={styles.segmented}
              role="group"
              aria-label={t('roadAccidents.chart.viewSwitch', { title: title })}
            >
              <button
                type="button"
                className={`${styles.segment} ${!isTableVisible ? styles.segmentActive : ''}`}
                aria-pressed={!isTableVisible}
                onClick={() => setShowTable(false)}
              >
                {t('roadAccidents.chart.viewChart')}
              </button>
              <button
                type="button"
                className={`${styles.segment} ${isTableVisible ? styles.segmentActive : ''}`}
                aria-pressed={isTableVisible}
                aria-controls={tableId}
                onClick={() => setShowTable(true)}
              >
                {t('roadAccidents.chart.viewData')}
              </button>
            </div>
          )}
        </div>
      </div>

      {isTableVisible ? (
        <div id={tableId} className={styles.tableWrap} style={{ height }}>
          {table.rows.length === 0 ? (
            <div className={styles.empty}>{t('roadAccidents.common.noDataForPeriod')}</div>
          ) : (
            <table className={styles.table}>
              <caption className={styles.srOnly}>{title}</caption>
              <thead>
                <tr>
                  {table.columns.map((column, index) => (
                    <th key={index} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) =>
                      cellIndex === 0 ? (
                        <th key={cellIndex} scope="row">
                          {cell}
                        </th>
                      ) : (
                        <td key={cellIndex}>{cell}</td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        // Для скринридера график — картинка с подписью, числа — во вкладке «Данные»
        <div
          className={styles.body}
          style={{ height }}
          role="img"
          aria-label={table ? t('roadAccidents.chart.imageLabel', { title: title }) : title}
        >
          {children}
        </div>
      )}
    </section>
  )
}
