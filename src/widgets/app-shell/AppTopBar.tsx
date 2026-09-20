import { observer } from 'mobx-react-lite'
import { useLocation, useNavigate } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import {
  getAvailableMonths,
  getAvailableQuarters,
  getAvailableYears,
  formatMonthLabel,
  formatQuarterLabel,
  formatYearLabel,
  type PeriodMode,
} from '@/entities/accident/lib/period'
import { IconMenu, IconRefresh, IconPdf } from './icons'
import styles from './AppTopBar.module.css'

interface AppTopBarProps {
  onToggleSidebar: () => void
}

// Узкая полоса над контентом: бургер сайдбара, селектор периода (общий для
// всех трёх экранов), кнопки "Обновить данные"/"Сформировать PDF" и выход.
export const AppTopBar = observer(function AppTopBar({ onToggleSidebar }: AppTopBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const rows = accidentsStore.rows
  const isMotorcadeScreen = location.pathname === '/motorcade'

  const months = getAvailableMonths(rows)
  const quarters = getAvailableQuarters(rows)
  const years = getAvailableYears(rows)

  const handleLogout = () => {
    authStore.logout()
    navigate('/login')
  }

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.iconButton}
        onClick={onToggleSidebar}
        aria-label="Открыть меню"
      >
        <IconMenu />
      </button>

      <div className={styles.periodGroup}>
        <select
          className={styles.select}
          value={filtersStore.periodMode}
          onChange={(e) => filtersStore.setPeriodMode(e.target.value as PeriodMode)}
        >
          <option value="month">Месяц</option>
          <option value="quarter">Квартал</option>
          <option value="year">Год</option>
          <option value="all">Весь период</option>
        </select>

        {filtersStore.periodMode === 'month' && (
          <select
            className={styles.select}
            value={filtersStore.period.mode === 'month' ? filtersStore.period.value : ''}
            onChange={(e) => filtersStore.setPeriodValue(Number(e.target.value))}
          >
            {months.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthLabel(ym)}
              </option>
            ))}
          </select>
        )}

        {filtersStore.periodMode === 'quarter' && (
          <select
            className={styles.select}
            value={filtersStore.period.mode === 'quarter' ? filtersStore.period.value : ''}
            onChange={(e) => filtersStore.setPeriodValue(Number(e.target.value))}
          >
            {quarters.map((yq) => (
              <option key={yq} value={yq}>
                {formatQuarterLabel(yq)}
              </option>
            ))}
          </select>
        )}

        {filtersStore.periodMode === 'year' && (
          <select
            className={styles.select}
            value={filtersStore.period.mode === 'year' ? filtersStore.period.value : ''}
            onChange={(e) => filtersStore.setPeriodValue(Number(e.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {formatYearLabel(year)}
              </option>
            ))}
          </select>
        )}
      </div>

      {isMotorcadeScreen && (
        <select
          className={styles.select}
          value={filtersStore.selectedMotorcadeKey ?? ''}
          onChange={(e) => filtersStore.setMotorcadeKey(e.target.value)}
        >
          {filtersStore.motorcadeOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.name}
            </option>
          ))}
        </select>
      )}

      <div className={styles.spacer} />

      <button
        type="button"
        className={styles.actionButton}
        onClick={() => accidentsStore.reload()}
        disabled={accidentsStore.isInitialLoad}
        title="Перезагрузить данные по всем базам"
      >
        <IconRefresh />
        <span className={styles.actionLabel}>Обновить данные</span>
      </button>

      <button
        type="button"
        className={styles.actionButton}
        onClick={() => void pdfReportStore.trigger()}
        disabled={!pdfReportStore.isAvailable || pdfReportStore.isGenerating}
        title={
          pdfReportStore.isAvailable
            ? 'Сформировать PDF-отчёт по текущему экрану'
            : 'На этом экране PDF-отчёт пока недоступен'
        }
      >
        <IconPdf />
        <span className={styles.actionLabel}>
          {pdfReportStore.isGenerating
            ? `Формирование… ${pdfReportStore.progress.current}/${pdfReportStore.progress.total}`
            : 'PDF отчёт'}
        </span>
      </button>

      <button type="button" className={styles.logout} onClick={handleLogout}>
        Выйти
      </button>
    </div>
  )
})
