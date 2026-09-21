import { observer } from 'mobx-react-lite'
import { useLocation, useNavigate } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import {
  formatMonthLabel,
  formatQuarterLabel,
  formatYearLabel,
  type PeriodMode,
} from '@/entities/accident/lib/period'
import { IconMenu, IconRefresh, IconPdf } from './icons'
import styles from './AppTopBar.module.css'

function formatPeriodValue(mode: Exclude<PeriodMode, 'all'>, value: number): string {
  if (mode === 'quarter') return formatQuarterLabel(value)
  if (mode === 'year') return formatYearLabel(value)
  return formatMonthLabel(value)
}

function formatLoadedAt(date: Date | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

interface AppTopBarProps {
  onToggleSidebar: () => void
}

// Узкая полоса над контентом: бургер сайдбара, селектор периода (общий для
// всех трёх экранов), кнопки "Обновить данные"/"Сформировать PDF" и выход.
export const AppTopBar = observer(function AppTopBar({ onToggleSidebar }: AppTopBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const period = filtersStore.period
  const isMotorcadeScreen = location.pathname === '/motorcade'
  const isAnalyticsScreen = location.pathname === '/analytics'

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
          aria-label="Гранулярность периода"
          value={filtersStore.periodMode}
          onChange={(e) => filtersStore.setPeriodMode(e.target.value as PeriodMode)}
        >
          <option value="month">Месяц</option>
          <option value="quarter">Квартал</option>
          <option value="year">Год</option>
          <option value="all">Весь период</option>
        </select>

        {period.mode !== 'all' && (
          <select
            className={styles.select}
            aria-label="Период"
            value={period.value}
            onChange={(e) => filtersStore.setPeriodValue(Number(e.target.value))}
          >
            {filtersStore.periodValues.map((value) => (
              <option key={value} value={value}>
                {formatPeriodValue(period.mode, value)}
              </option>
            ))}
          </select>
        )}
      </div>

      {isMotorcadeScreen && (
        <select
          className={styles.select}
          aria-label="Автоколонна"
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

      {isAnalyticsScreen && (
        <>
          <select
            className={styles.select}
            aria-label="Автоколонна 1"
            value={filtersStore.selectedAnalyticsKeyA ?? ''}
            onChange={(e) => filtersStore.setAnalyticsMotorcadeA(e.target.value)}
          >
            {filtersStore.motorcadeOptions.map((option) => (
              <option
                key={option.key}
                value={option.key}
                disabled={option.key === filtersStore.selectedAnalyticsKeyB}
              >
                {option.name}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            aria-label="Автоколонна 2"
            value={filtersStore.selectedAnalyticsKeyB ?? ''}
            onChange={(e) => filtersStore.setAnalyticsMotorcadeB(e.target.value)}
          >
            {filtersStore.motorcadeOptions.map((option) => (
              <option
                key={option.key}
                value={option.key}
                disabled={option.key === filtersStore.selectedAnalyticsKeyA}
              >
                {option.name}
              </option>
            ))}
          </select>
        </>
      )}

      <div className={styles.spacer} />

      <button
        type="button"
        className={styles.actionButton}
        onClick={() => accidentsStore.reload()}
        disabled={accidentsStore.isBusy}
        title={
          accidentsStore.loadedAt
            ? `Перезагрузить данные по всем базам. Данные на ${formatLoadedAt(accidentsStore.loadedAt)}`
            : 'Перезагрузить данные по всем базам'
        }
      >
        <IconRefresh />
        <span className={styles.actionLabel}>
          {accidentsStore.isRefreshing
            ? `Загружено баз ${accidentsStore.loadedCount} из ${accidentsStore.totalCount}`
            : 'Обновить данные'}
        </span>
      </button>

      <button
        type="button"
        className={styles.actionButton}
        onClick={() => void pdfReportStore.trigger()}
        disabled={!pdfReportStore.isAvailable || pdfReportStore.isGenerating}
        title={
          pdfReportStore.isAvailable
            ? 'Сформировать PDF-отчёт по текущему экрану'
            : 'PDF-отчёт недоступен: на экране нет данных для отчёта'
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
