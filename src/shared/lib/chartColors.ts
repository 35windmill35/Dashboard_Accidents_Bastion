// Палитра графиков — копия --color-chart-* из theme.css (Recharts не читает CSS-переменные).
// Экспорты — let: applyChartScheme переключает их при смене темы.
import { getCauserKind, OTHER_SLICE_KEY, type CauserKind } from '@/shared/config/accidentCauses'

type ChartScheme = 'dark' | 'light'

interface SchemeColors {
  steps: string[]
  compensation: string
  other: string
}

const SCHEMES: Record<ChartScheme, SchemeColors> = {
  dark: {
    steps: ['#3d8bff', '#0e9faa', '#9a6af0', '#bd8217', '#d9567e'],
    compensation: '#2ba67a',
    other: '#6b7a93',
  },
  light: {
    steps: ['#1d63ed', '#00909c', '#7b4fd6', '#a86c0a', '#c2386a'],
    compensation: '#0e8a5f',
    other: '#8a94a6',
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

export let COLOR_OTHER = SCHEMES[initialScheme].other

const CAUSER_SLOTS: Record<CauserKind, number | null> = {
  ownDriver: 4,
  otherParty: 1,
  mutual: 3,
  unknown: null,
}

// Срезы по причинам: по порядку, «Прочие» — серым
export function sliceColor(key: string, index: number): string {
  if (key === OTHER_SLICE_KEY) return COLOR_OTHER
  return CHART_SERIES[index % CHART_SERIES.length]
}

// Срезы по виновникам: цвет закреплён за видом виновника
export function causerColor(key: string): string {
  const slot = CAUSER_SLOTS[getCauserKind(key)]
  return slot === null ? COLOR_OTHER : CHART_SERIES[slot]
}

export function applyChartScheme(scheme: ChartScheme): void {
  const colors = SCHEMES[scheme]
  CHART_SERIES = colors.steps
  ;[CHART_1, CHART_2, CHART_3, CHART_4, CHART_5] = CHART_SERIES
  COLOR_OTHER = colors.other
  COLOR_COUNT = CHART_1
  COLOR_DAMAGE = CHART_1
  COLOR_COMPENSATION = colors.compensation
  COMPARISON_COLOR_A = CHART_1
  COMPARISON_COLOR_B = CHART_2
}
