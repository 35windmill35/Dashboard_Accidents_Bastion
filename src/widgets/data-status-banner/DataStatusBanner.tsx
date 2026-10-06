import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
import { formatNumber } from '@/shared/lib/formatters'
import styles from './DataStatusBanner.module.css'
import { CAUSE_CATEGORY_LABELS } from '@/shared/config/accidentCauses'
import { t } from '@/shared/i18n'

const warningIcon = (
  <svg
    className={styles.icon}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3.5 21.5 20h-19Z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.2v.3" />
  </svg>
)

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Несбрасываемые предупреждения о полноте и качестве данных
export const DataStatusBanner = observer(function DataStatusBanner() {
  const location = useLocation()
  const stale = accidentsStore.staleFirms
  const staleNames = new Set(stale.map((firm) => firm.name))
  const unavailable = Array.from(
    new Set([...authStore.rightsCheckErrors, ...accidentsStore.failedFirms])
  ).filter((name) => !staleNames.has(name))
  const currencies = accidentsStore.currencyCodes
  const incomplete = accidentsStore.incompleteFirms
  const rejected = accidentsStore.rejectedFirms
  const unknownCauses = accidentsStore.unknownCauseCount
  const linkMissing =
    (location.pathname === '/motorcade' && filtersStore.isLinkedMotorcadeMissing) ||
    (location.pathname === '/analytics' && filtersStore.isLinkedAnalyticsMissing)

  if (
    unavailable.length === 0 &&
    stale.length === 0 &&
    incomplete.length === 0 &&
    rejected.length === 0 &&
    unknownCauses === 0 &&
    !linkMissing &&
    !accidentsStore.hasMixedCurrencies
  ) {
    return null
  }

  const retryButton = (
    <button
      type="button"
      className={styles.retry}
      onClick={() => void accidentsStore.retry()}
      disabled={accidentsStore.isBusy || authStore.isCheckingRights}
    >
      {accidentsStore.isBusy
        ? t('roadAccidents.common.loadedBases', {
            count: accidentsStore.loadedCount,
            total: accidentsStore.totalCount,
          })
        : t('roadAccidents.common.retry')}
    </button>
  )

  return (
    <div className={styles.stack}>
      {unavailable.length > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            {t('roadAccidents.banner.unavailableBases', { bases: unavailable.join(', ') })}
          </span>
          {retryButton}
        </div>
      )}

      {stale.length > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            {t('roadAccidents.banner.staleBases', {
              bases: stale
                .map((firm) =>
                  t('roadAccidents.banner.staleBase', {
                    name: firm.name,
                    date: formatTime(firm.loadedAt),
                  })
                )
                .join(', '),
            })}
          </span>
          {unavailable.length === 0 && retryButton}
        </div>
      )}

      {incomplete.length > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            {t('roadAccidents.banner.incompleteBases', {
              bases: incomplete
                .map((firm) =>
                  t('roadAccidents.banner.incompleteBase', {
                    name: firm.name,
                    received: formatNumber(firm.received),
                    total: formatNumber(firm.totalRecords),
                  })
                )
                .join('; '),
            })}
          </span>
          <button
            type="button"
            className={styles.retry}
            onClick={() => accidentsStore.reload()}
            disabled={accidentsStore.isBusy}
          >
            {t('roadAccidents.common.retry')}
          </button>
        </div>
      )}

      {rejected.length > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            {t('roadAccidents.banner.rejectedRows', {
              bases: rejected
                .map((firm) =>
                  t('roadAccidents.banner.rejectedBase', {
                    name: firm.name,
                    count: formatNumber(firm.count),
                    details: firm.details,
                  })
                )
                .join('; '),
            })}
          </span>
        </div>
      )}

      {unknownCauses > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            {t('roadAccidents.banner.unknownCauses', {
              count: formatNumber(unknownCauses),
              category: CAUSE_CATEGORY_LABELS.undetermined,
            })}
          </span>
        </div>
      )}

      {linkMissing && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>{t('roadAccidents.banner.linkedMotorcadeMissing')}</span>
        </div>
      )}

      {accidentsStore.hasMixedCurrencies && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            {t('roadAccidents.banner.mixedCurrencies', { currencies: currencies.join(', ') })}
          </span>
        </div>
      )}
    </div>
  )
})
