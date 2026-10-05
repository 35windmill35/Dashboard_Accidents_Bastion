import { useId, useState, type ReactNode } from 'react'
import { t } from '@/shared/i18n'
import styles from './ChartCard.module.css'

export interface ChartLegendItem {
  label: string
  color: string
}

// Текстовая альтернатива графику (доступность): те же числа, что на
// графике, уже отформатированные для показа.
export interface ChartDataTable {
  columns: string[]
  rows: string[][]
}

interface ChartCardProps {
  title: string
  // Короткое пояснение под заголовком (итог, единицы) — как в эталоне
  subtitle?: string
  children: ReactNode
  height?: number
  legend?: ChartLegendItem[]
  table?: ChartDataTable
}

// Общая рамка для графиков экранов по эталону: заголовок с пояснением,
// справа — легенда и переключатель «График / Данные», ниже — сам график
// фиксированной высоты (под ResponsiveContainer).
//
// Выравнивание осей между соседними карточками: легенда теперь в шапке
// (как в эталоне), а шапки бывают разной высоты — заголовок переносится,
// легенда уходит на вторую строку. Чтобы область графика (а с ней оси X и
// сетка по Y) у соседей в одной строке сетки стояла на одном уровне,
// карточка — subgrid на две строки родительской сетки: высота шапки
// общая для всех карточек строки (по самой высокой), график начинается
// с одной и той же линии. Родительская сетка должна давать карточке две
// строки (см. *Charts.module.css — grid-auto-rows не задавать).
//
// Таблица данных показывается на месте графика в той же высоте, чтобы
// переключение не двигало сетку карточек.
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
        // Для скринридера график — одна картинка с подписью; сами числа
        // доступны переключателем «Данные»
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
