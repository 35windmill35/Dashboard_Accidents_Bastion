import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { pdfReportStore } from '@/features/pdf-report/model/pdfReportStore'
import {
  formatMonthLabel,
  formatQuarterLabel,
  formatYearLabel,
  type PeriodMode,
} from '@/entities/accident/lib/period'
import { COMPARISON_COLOR_A, COMPARISON_COLOR_B } from '@/shared/lib/chartColors'
import { themeStore } from '@/shared/lib/theme/themeStore'
import { t } from '@/shared/i18n'
import { IconMenu, IconRefresh, IconPdf } from './icons'
import { TopBarSelect as Select } from './TopBarSelect'
import styles from './AppTopBar.module.css'

const PERIOD_MODES: { value: PeriodMode; label: string }[] = [
  { value: 'month', label: t('roadAccidents.common.month') },
  { value: 'quarter', label: t('roadAccidents.period.mode.quarter') },
  { value: 'year', label: t('roadAccidents.period.mode.year') },
  { value: 'all', label: t('roadAccidents.period.all') },
]

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

// Полоса над контентом (липкая, полупрозрачная с размытием — как в
// эталоне): бургер сайдбара, переключатель гранулярности периода и сам
// период (общие для всех трёх экранов), селекторы автоколонн своего
// экрана, кнопки «Обновить данные» / «PDF отчёт». «Выйти» — в сайдбаре.
export const AppTopBar = observer(function AppTopBar({ onToggleSidebar }: AppTopBarProps) {
  const location = useLocation()
  const period = filtersStore.period
  const isMotorcadeScreen = location.pathname === '/motorcade'
  const isAnalyticsScreen = location.pathname === '/analytics'
  const isRefreshing = accidentsStore.isRefreshing
  // Цвета точек серий зависят от темы: чтение theme подписывает шапку на её
  // смену, сами цвета к этому моменту уже переключены (applyChartScheme)
  const comparisonColors = themeStore.theme ? [COMPARISON_COLOR_A, COMPARISON_COLOR_B] : []

  return (
    <header className={styles.bar}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={onToggleSidebar}
        aria-label={t('roadAccidents.topBar.openMenu')}
      >
        <IconMenu />
      </button>

      <div
        className={styles.segmented}
        role="group"
        aria-label={t('roadAccidents.topBar.periodGranularity')}
      >
        {PERIOD_MODES.map((mode) => {
          const isActive = filtersStore.periodMode === mode.value
          return (
            <button
              key={mode.value}
              type="button"
              className={`${styles.segment} ${isActive ? styles.segmentActive : ''}`}
              aria-pressed={isActive}
              onClick={() => filtersStore.setPeriodMode(mode.value)}
            >
              {mode.label}
            </button>
          )
        })}
      </div>

      {period.mode !== 'all' && (
        <Select
          aria-label={t('roadAccidents.topBar.period')}
          value={period.value}
          onChange={(e) => filtersStore.setPeriodValue(Number(e.target.value))}
        >
          {filtersStore.periodValues.map((value) => (
            <option key={value} value={value}>
              {formatPeriodValue(period.mode, value)}
            </option>
          ))}
        </Select>
      )}

      {isMotorcadeScreen && (
        <Select
          aria-label={t('roadAccidents.common.motorcade')}
          value={filtersStore.selectedMotorcadeKey ?? ''}
          onChange={(e) => filtersStore.setMotorcadeKey(e.target.value)}
        >
          {filtersStore.motorcadeOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.name}
            </option>
          ))}
        </Select>
      )}

      {isAnalyticsScreen && (
        <div className={styles.compare}>
          <Select
            aria-label={t('roadAccidents.topBar.motorcadeA')}
            dotColor={comparisonColors[0]}
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
          </Select>
          <span className={styles.versus} aria-hidden="true">
            {t('roadAccidents.topBar.versus')}
          </span>
          <Select
            aria-label={t('roadAccidents.topBar.motorcadeB')}
            dotColor={comparisonColors[1]}
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
          </Select>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionButton} ${isRefreshing ? styles.actionButtonBusy : ''}`}
          onClick={() => accidentsStore.reload()}
          disabled={accidentsStore.isBusy}
          title={
            accidentsStore.loadedAt
              ? t('roadAccidents.topBar.reloadHintWithDate', {
                  date: formatLoadedAt(accidentsStore.loadedAt),
                })
              : t('roadAccidents.topBar.reloadHint')
          }
        >
          <span className={`${styles.icon} ${isRefreshing ? styles.iconSpin : ''}`}>
            <IconRefresh />
          </span>
          <span className={styles.actionLabel}>
            {isRefreshing
              ? t('roadAccidents.common.loadedBases', {
                  count: accidentsStore.loadedCount,
                  total: accidentsStore.totalCount,
                })
              : t('roadAccidents.topBar.reload')}
          </span>
        </button>

        <button
          type="button"
          className={`${styles.actionButton} ${styles.primaryButton}`}
          onClick={() => void pdfReportStore.trigger()}
          disabled={!pdfReportStore.isAvailable || pdfReportStore.isGenerating}
          title={
            pdfReportStore.isAvailable
              ? t('roadAccidents.topBar.pdfHint')
              : t('roadAccidents.topBar.pdfUnavailable')
          }
        >
          <span className={styles.icon}>
            <IconPdf />
          </span>
          <span className={styles.actionLabel}>
            {pdfReportStore.isGenerating
              ? t('roadAccidents.topBar.pdfGenerating', {
                  current: pdfReportStore.progress.current,
                  total: pdfReportStore.progress.total,
                })
              : t('roadAccidents.topBar.pdf')}
          </span>
        </button>
      </div>
    </header>
  )
})
