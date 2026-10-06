import translation from '../../../translation.json'

// Переводы из translation.json: ключи дашборда ДТП — с префиксом roadAccidents.
// Подстановки {{name}}, как в i18next.

type Translation = typeof translation

export type TranslationKey = keyof Translation

export type TranslationParams = Record<string, string | number>

const dictionary: Record<string, string> = translation

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g

export function t(key: TranslationKey, params?: TranslationParams): string {
  const template = dictionary[key]
  if (template === undefined) {
    console.warn(`[i18n] нет перевода для ключа «${key}»`)
    return key
  }
  if (!params) return template
  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in params ? String(params[name]) : match
  )
}

export function hasTranslation(key: string): key is TranslationKey {
  return key in dictionary
}
