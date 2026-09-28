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

// Правило категории «Без повреждения» заказчик ещё не подтвердил: в
// справочнике причин такого ID нет, а по данным это, скорее всего, «ущерб
// пуст или 0». Пока правила нет, категория и KPI по ней не показываются —
// иначе экран и PDF выдают «0%» как факт.
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

// Порядок проверки важен: «на рассмотрении» определяется статусом и
// перекрывает причину.
export function getCauseCategory(row: CauseInput): CauseCategory {
  const causeId = row.ACCIDENT_CAUSE_ID ?? null

  if (row.ACCIDENT_STATUS_ID === -2 && causeId === null) return 'underReview'
  if (causeId === THIRD_PARTY_FAULT_CAUSE_ID) return 'thirdPartyFault'
  if (causeId !== null && DRIVER_FAULT_CAUSE_IDS.has(causeId)) return 'driverFault'
  if (causeId !== null && NO_DAMAGE_CAUSE_IDS.has(causeId)) return 'noDamage'

  // Неизвестный ID — в «Виновный не определён»; сколько таких записей,
  // показывает баннер (accidentsStore.unknownCauseCount).
  if (causeId !== null && !loggedUnknownCauseIds.has(causeId)) {
    loggedUnknownCauseIds.add(causeId)
    console.warn(
      `Неизвестный ACCIDENT_CAUSE_ID: ${causeId}, запись отнесена к "${CAUSE_CATEGORY_LABELS.undetermined}"`
    )
  }

  return 'undetermined'
}
