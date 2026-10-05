import translation from '../../../translation.json'

// Переводы интерфейса. Все строки, которые видит пользователь (экраны,
// подсказки, PDF, CSV, сообщения об ошибках), берутся из translation.json в
// корне репозитория — общего файла с дашбордом «Точки роста». Ключи
// дашборда ДТП начинаются с «roadAccidents.»; общие ключи без префикса
// (месяцы, «Закрыть», «Телефон», тексты ошибок) переиспользуются.
//
// Формат совместим с i18next: плоские ключи с точками и подстановки
// {{name}}. Файл подключается при сборке, поэтому t() работает синхронно —
// в том числе вне React (сторы, PDF, CSV).

type Translation = typeof translation

export type TranslationKey = keyof Translation

export type TranslationParams = Record<string, string | number>

const dictionary: Record<string, string> = translation

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g

export function t(key: TranslationKey, params?: TranslationParams): string {
  const template = dictionary[key]
  if (template === undefined) {
    // Ключи проверяются типами, сюда попадает только динамический ключ
    console.warn(`[i18n] нет перевода для ключа «${key}»`)
    return key
  }
  if (!params) return template
  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in params ? String(params[name]) : match
  )
}

// Для ключей, собранных во время выполнения (`month_${index}`)
export function hasTranslation(key: string): key is TranslationKey {
  return key in dictionary
}
