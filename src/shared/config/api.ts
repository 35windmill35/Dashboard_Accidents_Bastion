// BASE_URL можно переопределить через .env (VITE_API_BASE_URL) при
// переходе на прод-стенд.
export const BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'https://api-t3.basgroup.ru'

// Общий с дашбордом «Точки роста» код приложения — отдельный для ДТП не
// заводился. Поэтому логин возвращает и базы, не относящиеся к ДТП, —
// их отсеивает проверка права ниже.
export const APP_CODE = 'ID_5817_DASHBOARD'

// Код права доступа для проверки по каждой базе.
export const ACCIDENTS_RIGHT_CODE = 'Dashboard_Accidents'
