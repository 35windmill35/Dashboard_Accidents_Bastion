// Recharts не читает CSS-переменные напрямую, поэтому категориальная
// палитра продублирована здесь как JS-константы — держать в паре с
// --color-chart-* в theme.css. Порядок слотов фиксирован (проверено
// scripts/validate_palette.js на CVD-различимость), цвет не переставлять.
// Тема переключателя в UI пока нет — берём только системную настройку,
// как и сам theme.css.
import type { CauseCategory } from '@/shared/config/accidentCauses'

const isLightScheme =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches

const DARK_STEPS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181']
const LIGHT_STEPS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']

export const CHART_SERIES = isLightScheme ? LIGHT_STEPS : DARK_STEPS

export const [CHART_1, CHART_2, CHART_3, CHART_4, CHART_5] = CHART_SERIES

// Слот 3 (аква/зелёный) и слот 4 (жёлтый/охра) в светлой теме ниже 3:1 к
// фону — на графиках с этими цветами обязательны прямые подписи значений
// или легенда с текстом, не полагаться на сам цвет (см. relief rule).
export const CAUSE_CATEGORY_COLORS: Record<CauseCategory, string> = {
  driverFault: CHART_1,
  thirdPartyFault: CHART_2,
  noDamage: CHART_3,
  undetermined: CHART_4,
  underReview: CHART_5,
}

// Две автоколонны на экране "Аналитика" — стабильно слот 1 и слот 2, чтобы
// не путать A/B при переключении.
export const COMPARISON_COLOR_A = CHART_1
export const COMPARISON_COLOR_B = CHART_2
