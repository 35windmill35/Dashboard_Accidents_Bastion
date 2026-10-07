import { t } from '@/shared/i18n'

// Виновник ДТП — по ACCIDENT_CAUSER_NAME
export type CauserKind = 'ownDriver' | 'otherParty' | 'mutual' | 'unknown'

export function normalizeName(name: string | null | undefined): string {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

const CAUSER_KINDS = new Map<string, CauserKind>([
  [normalizeName(t('roadAccidents.causer.ownDriver')), 'ownDriver'],
  [normalizeName(t('roadAccidents.causer.otherParty')), 'otherParty'],
  [normalizeName(t('roadAccidents.causer.mutual')), 'mutual'],
])

export function getCauserKind(name: string | null | undefined): CauserKind {
  return CAUSER_KINDS.get(normalizeName(name)) ?? 'unknown'
}

// «неизвестен» → «Неизвестен»
export function displayName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

// Ключ сводного среза «Прочие»
export const OTHER_SLICE_KEY = '__other'
