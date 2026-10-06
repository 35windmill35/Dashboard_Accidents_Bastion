// Палитра графиков — копия --color-chart-* из theme.css (Recharts не читает CSS-переменные).
// Экспорты — let: applyChartScheme переключает их при смене темы.
import type { CauseCategory } from '@/shared/config/accidentCauses'

type ChartScheme = 'dark' | 'light'

interface SchemeColors {
  steps: string[]
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

// Цвета по смыслу серии, а не по номеру слота
export let COLOR_COUNT = CHART_1
export let COLOR_DAMAGE = CHART_1
export let COLOR_COMPENSATION = SCHEMES[initialScheme].compensation
export let COMPARISON_COLOR_A = CHART_1
export let COMPARISON_COLOR_B = CHART_2

// Один объект на всё время работы — при смене темы меняются его поля
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
