import { useId, useState, type ReactNode } from 'react'
import styles from './ChartCard.module.css'

export interface ChartLegendItem {
  label: string
  color: string
}

// Текстовая альтернатива графику (ТЗ §8, доступность): те же числа, что на
// графике, уже отформатированные для показа.
export interface ChartDataTable {
  columns: string[]
  rows: string[][]
}

interface ChartCardProps {
  title: string
  children: ReactNode
  height?: number
  legend?: ChartLegendItem[]
  table?: ChartDataTable
}

// Общая рамка для графиков экранов: заголовок + фиксированная высота под
// ResponsiveContainer + легенда + переключатель «Показать данные».
//
// Легенда рисуется здесь, а не через <Legend> из Recharts. Внутренняя
// легенда Recharts вычитает своё место ИЗ той же фиксированной высоты
// графика — а значит у графика с одной серией (легенды нет) и графика с
// двумя сериями (легенда в одну строку) остаётся разная высота под сами
// оси, и на соседних карточках в сетке "плывут" линия оси X и сетка по Y.
// Здесь легенда — отдельная зона ПОД графиком с одной и той же высотой у
// всех карточек, есть в ней элементы или нет, поэтому область самого
// графика (а с ней и оси) одинакова везде.
//
// Таблица данных показывается на месте графика в той же высоте, чтобы
// переключение не двигало сетку карточек.
export function ChartCard({ title, children, height = 280, legend, table }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()
  const isTableVisible = showTable && table !== undefined

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        {table && (
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={showTable}
            aria-controls={tableId}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? 'Показать график' : 'Показать данные'}
          </button>
        )}
      </div>

      {isTableVisible ? (
        <div id={tableId} className={styles.tableWrap} style={{ height }}>
          {table.rows.length === 0 ? (
            <div className={styles.empty}>Нет данных за период</div>
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
        <div style={{ height }}>{children}</div>
      )}

      <div className={styles.legend}>
        {!isTableVisible &&
          legend?.map((item) => (
            <span key={item.label} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
      </div>
    </div>
  )
}
