import { observer } from 'mobx-react-lite'
import { authStore } from '@/entities/user/model/authStore'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { formatNumber } from '@/shared/lib/formatters'
import styles from './DataStatusBanner.module.css'

// Значок предупреждения (JSX-константа, а не компонент — файл экспортирует
// только DataStatusBanner)
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

// Несбрасываемые предупреждения о полноте данных — над контентом всех
// трёх экранов (ТЗ §1.2, §8):
// - часть баз не прошла проверку права (шаг 2) или не отдала данные (шаг 3)
//   → «Данные баз: … недоступны, показатели неполные» + «Повторить»;
// - сервер отдал по базе меньше строк, чем заявил в totalRecords;
// - в данных несколько валют → суммы по компании складывать нельзя.
export const DataStatusBanner = observer(function DataStatusBanner() {
  const unavailable = Array.from(
    new Set([...authStore.rightsCheckErrors, ...accidentsStore.failedFirms])
  )
  const currencies = accidentsStore.currencyCodes

  const incomplete = accidentsStore.incompleteFirms

  if (unavailable.length === 0 && incomplete.length === 0 && !accidentsStore.hasMixedCurrencies) {
    return null
  }

  return (
    <div className={styles.stack}>
      {unavailable.length > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            Данные баз: {unavailable.join(', ')} недоступны, показатели неполные.
          </span>
          <button
            type="button"
            className={styles.retry}
            onClick={() => void accidentsStore.retry()}
            disabled={accidentsStore.isBusy || authStore.isCheckingRights}
          >
            {accidentsStore.isBusy
              ? `Загружено баз ${accidentsStore.loadedCount} из ${accidentsStore.totalCount}`
              : 'Повторить'}
          </button>
        </div>
      )}

      {incomplete.length > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            Загружены не все записи:{' '}
            {incomplete
              .map(
                (firm) =>
                  `${firm.name} — ${formatNumber(firm.received)} из ${formatNumber(firm.totalRecords)}`
              )
              .join('; ')}
            . Показатели неполные.
          </span>
          <button
            type="button"
            className={styles.retry}
            onClick={() => accidentsStore.reload()}
            disabled={accidentsStore.isBusy}
          >
            Повторить
          </button>
        </div>
      )}

      {accidentsStore.hasMixedCurrencies && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            В данных несколько валют ({currencies.join(', ')}). Суммы ущерба и возмещения посчитаны
            без пересчёта курсов и не сопоставимы между собой.
          </span>
        </div>
      )}
    </div>
  )
})
