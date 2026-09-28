import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { filtersStore } from '@/entities/accident/model/filtersStore'
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

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Несбрасываемые предупреждения о полноте и качестве данных — над контентом
// всех трёх экранов:
// - часть баз не прошла проверку права (шаг 2) или не отдала данные (шаг 3)
//   → «Данные баз: … недоступны, показатели неполные» + «Повторить»; если
//   по базе остались данные прошлой загрузки — «показаны данные на …»;
// - сервер отдал по базе меньше строк, чем заявил в totalRecords;
// - часть строк отброшена при разборе (нет ID, некорректная дата);
// - записи с причиной, которой нет в справочнике категорий;
// - в данных несколько валют → суммы по компании складывать нельзя;
// - автоколонна из ссылки недоступна этому пользователю.
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
        ? `Загружено баз ${accidentsStore.loadedCount} из ${accidentsStore.totalCount}`
        : 'Повторить'}
    </button>
  )

  return (
    <div className={styles.stack}>
      {unavailable.length > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            Данные баз: {unavailable.join(', ')} недоступны, показатели неполные.
          </span>
          {retryButton}
        </div>
      )}

      {stale.length > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            Не удалось обновить данные баз:{' '}
            {stale
              .map((firm) => `${firm.name} (показаны данные на ${formatTime(firm.loadedAt)})`)
              .join(', ')}
            .
          </span>
          {unavailable.length === 0 && retryButton}
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

      {rejected.length > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            Часть записей не учтена из-за ошибок в данных:{' '}
            {rejected
              .map((firm) => `${firm.name} — ${formatNumber(firm.count)} (${firm.details})`)
              .join('; ')}
            .
          </span>
        </div>
      )}

      {unknownCauses > 0 && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            {formatNumber(unknownCauses)} ДТП с причиной, которой нет в справочнике категорий,
            отнесены к «Виновный не определён».
          </span>
        </div>
      )}

      {linkMissing && (
        <div className={styles.banner} role="status">
          {warningIcon}
          <span className={styles.text}>
            Автоколонна из ссылки недоступна в ваших данных — показана автоколонна по умолчанию.
          </span>
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
