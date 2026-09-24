// Recharts не читает CSS-переменные напрямую, поэтому палитра графиков
// продублирована здесь как JS-константы — держать в паре с --color-chart-*
// в theme.css.
//
// Палитра — в холодной гамме эталона (синий акцент, бирюза), расширенная до
// пяти категорий причин. Каждый набор проверен валидатором палитр
// (dataviz/scripts/validate_palette.js) отдельно для тёмной темы (фон
// карточки #131A27) и светлой (#FFFFFF): светлота в рабочей полосе,
// насыщенность выше порога «серого», соседние цвета различимы при
// нарушениях цветовосприятия (ΔE ≥ 8) и обычным зрением (ΔE ≥ 15),
// контраст к фону ≥ 3:1. Порядок слотов не переставлять — различимость
// проверена именно для соседей в этом порядке (сектора кольца идут по нему).
//
// Тема меняется вслед за настройкой браузера без перезагрузки
// (shared/lib/theme/themeStore), поэтому экспорты — `let`, а не `const`:
// ES-модули отдают импортёрам «живые» привязки, и после applyChartScheme()
// любой компонент при следующем рендере прочитает цвет новой темы.
// Перерисовку графиков при смене темы обеспечивает AppShell (перемонтирует
// контент экрана по теме).
import type { CauseCategory } from '@/shared/config/accidentCauses'

type ChartScheme = 'dark' | 'light'

interface SchemeColors {
  // 5 категориальных слотов: синий, бирюзовый, фиолетовый, янтарный, розовый
  steps: string[]
  // «Возмещение» — зелёный, в паре с «Ущербом» (синий, слот 1), как в эталоне
  compensation: string
}

const SCHEMES: Record<ChartScheme, SchemeColors> = {
  dark: {
    steps: ['#3d8bff', '#0e9faa', '#9a6af0', '#bd8217', '#d9567e'],
    compensation: '#2ba67a',
  },
  light: {
    steps: ['#1d63ed', '#00909c', '#7b4fd6', '#a86c0a', '#c2386a'],
    compensation: '#0e8a5f',
  },
}

const initialScheme: ChartScheme =
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark'

export let CHART_SERIES: string[] = SCHEMES[initialScheme].steps

export let CHART_1 = CHART_SERIES[0]
export let CHART_2 = CHART_SERIES[1]
export let CHART_3 = CHART_SERIES[2]
export let CHART_4 = CHART_SERIES[3]
export let CHART_5 = CHART_SERIES[4]

// Роли серий — графики берут цвет по смыслу, а не по номеру слота:
// - количество ДТП и ущерб — основной синий (слот 1);
// - возмещение — зелёный (пара «ущерб / возмещение» различима и при
//   нарушениях цветовосприятия, проверено валидатором);
// - две автоколонны на «Аналитике» — синий и бирюзовый, стабильно A/B,
//   чтобы не путать при переключении.
export let COLOR_COUNT = CHART_1
export let COLOR_DAMAGE = CHART_1
export let COLOR_COMPENSATION = SCHEMES[initialScheme].compensation
export let COMPARISON_COLOR_A = CHART_1
export let COMPARISON_COLOR_B = CHART_2

// Объект один и тот же на всё время работы — при смене темы меняются его
// поля, поэтому ссылки на него остаются актуальными.
export const CAUSE_CATEGORY_COLORS: Record<CauseCategory, string> = {
  driverFault: CHART_1,
  thirdPartyFault: CHART_2,
  noDamage: CHART_3,
  undetermined: CHART_4,
  underReview: CHART_5,
}

export function applyChartScheme(scheme: ChartScheme): void {
  const colors = SCHEMES[scheme]
  CHART_SERIES = colors.steps
  ;[CHART_1, CHART_2, CHART_3, CHART_4, CHART_5] = CHART_SERIES
  CAUSE_CATEGORY_COLORS.driverFault = CHART_1
  CAUSE_CATEGORY_COLORS.thirdPartyFault = CHART_2
  CAUSE_CATEGORY_COLORS.noDamage = CHART_3
  CAUSE_CATEGORY_COLORS.undetermined = CHART_4
  CAUSE_CATEGORY_COLORS.underReview = CHART_5
  COLOR_COUNT = CHART_1
  COLOR_DAMAGE = CHART_1
  COLOR_COMPENSATION = colors.compensation
  COMPARISON_COLOR_A = CHART_1
  COMPARISON_COLOR_B = CHART_2
}
