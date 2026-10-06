// Переопределяется через VITE_API_BASE_URL
export const BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'https://api-t3.basgroup.ru'

// Общий с дашбордом «Точки роста»; лишние базы отсеивает проверка права
export const APP_CODE = 'ID_5817_DASHBOARD'

export const ACCIDENTS_RIGHT_CODE = 'Dashboard_Accidents'
