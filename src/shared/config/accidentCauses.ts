import { t } from '@/shared/i18n'

export type CauseCategory =
  'underReview' | 'driverFault' | 'thirdPartyFault' | 'noDamage' | 'undetermined'

export const CAUSE_CATEGORY_LABELS: Record<CauseCategory, string> = {
  underReview: t('roadAccidents.cause.underReview'),
  driverFault: t('roadAccidents.cause.driverFault'),
  thirdPartyFault: t('roadAccidents.cause.thirdPartyFault'),
  noDamage: t('roadAccidents.cause.noDamage'),
  undetermined: t('roadAccidents.cause.undetermined'),
}

const DRIVER_FAULT_CAUSE_IDS = new Set<number>([5])
const NO_DAMAGE_CAUSE_IDS = new Set<number>([])
const THIRD_PARTY_FAULT_CAUSE_ID = 4

// Правило «Без повреждения» не подтверждено заказчиком — категория и KPI скрыты
export const NO_DAMAGE_CATEGORY_ENABLED = NO_DAMAGE_CAUSE_IDS.size > 0

export function isKnownCauseId(causeId: number): boolean {
  return (
    causeId === THIRD_PARTY_FAULT_CAUSE_ID ||
    DRIVER_FAULT_CAUSE_IDS.has(causeId) ||
    NO_DAMAGE_CAUSE_IDS.has(causeId)
  )
}

const loggedUnknownCauseIds = new Set<number>()

interface CauseInput {
  ACCIDENT_CAUSE_ID?: number | null
  ACCIDENT_STATUS_ID?: number | null
}

// «На рассмотрении» определяется статусом и перекрывает причину
export function getCauseCategory(row: CauseInput): CauseCategory {
  const causeId = row.ACCIDENT_CAUSE_ID ?? null

  if (row.ACCIDENT_STATUS_ID === -2 && causeId === null) return 'underReview'
  if (causeId === THIRD_PARTY_FAULT_CAUSE_ID) return 'thirdPartyFault'
  if (causeId !== null && DRIVER_FAULT_CAUSE_IDS.has(causeId)) return 'driverFault'
  if (causeId !== null && NO_DAMAGE_CAUSE_IDS.has(causeId)) return 'noDamage'

  // Неизвестный ID — в «Виновный не определён», счётчик показывает баннер
  if (causeId !== null && !loggedUnknownCauseIds.has(causeId)) {
    loggedUnknownCauseIds.add(causeId)
    console.warn(
      `Неизвестный ACCIDENT_CAUSE_ID: ${causeId}, запись отнесена к "${CAUSE_CATEGORY_LABELS.undetermined}"`
    )
  }

  return 'undetermined'
}
