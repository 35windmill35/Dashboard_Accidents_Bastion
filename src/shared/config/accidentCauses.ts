export type CauseCategory =
  'underReview' | 'driverFault' | 'thirdPartyFault' | 'noDamage' | 'undetermined'

export const CAUSE_CATEGORY_LABELS: Record<CauseCategory, string> = {
  underReview: 'На рассмотрении',
  driverFault: 'Вина водителя',
  thirdPartyFault: 'Вина третьей стороны',
  noDamage: 'Без повреждения',
  undetermined: 'Виновный не определён',
}


const DRIVER_FAULT_CAUSE_IDS = new Set<number>([5])
const NO_DAMAGE_CAUSE_IDS = new Set<number>([])
const THIRD_PARTY_FAULT_CAUSE_ID = 4

const loggedUnknownCauseIds = new Set<number>()

interface CauseInput {
  ACCIDENT_CAUSE_ID?: number | null
  ACCIDENT_STATUS_ID?: number | null
}

// Порядок проверки важен и соответствует правилам категорий из ТЗ.
export function getCauseCategory(row: CauseInput): CauseCategory {
  const causeId = row.ACCIDENT_CAUSE_ID ?? null

  if (row.ACCIDENT_STATUS_ID === -2 && causeId === null) return 'underReview'
  if (causeId === THIRD_PARTY_FAULT_CAUSE_ID) return 'thirdPartyFault'
  if (causeId !== null && DRIVER_FAULT_CAUSE_IDS.has(causeId)) return 'driverFault'
  if (causeId !== null && NO_DAMAGE_CAUSE_IDS.has(causeId)) return 'noDamage'

  if (causeId !== null && !loggedUnknownCauseIds.has(causeId)) {
    loggedUnknownCauseIds.add(causeId)
    console.warn(
      `Неизвестный ACCIDENT_CAUSE_ID: ${causeId}, запись отнесена к "${CAUSE_CATEGORY_LABELS.undetermined}"`
    )
  }

  return 'undetermined'
}
