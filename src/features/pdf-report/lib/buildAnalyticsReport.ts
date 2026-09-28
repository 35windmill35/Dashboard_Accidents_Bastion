import { jsPDF } from 'jspdf'
import {
  formatNumber,
  formatPercent,
  isDeltaPositive,
  kpiDelta,
  type KpiKind,
} from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import type {
  AnalyticsData,
  AnalyticsSide,
  SummaryRow,
} from '@/pages/analytics/model/analyticsData'
import { COLOR, PAGE, registerPdfFonts } from './pdfKit'
import { columns, drawPageFooters, flowBlocks, type BlockFactory, type FlowResult } from './pdfFlow'
import {
  dataContextLines,
  kpiRow,
  reportHeader,
  type KpiCardData,
  type ReportDataContext,
} from './pdfChrome'
import {
  DUAL_ROW_HEIGHT,
  barChartBody,
  card,
  dualBarsBody,
  groupedBarChartBody,
  tableCard,
} from './pdfBlocks'
import {
  buildReportFilename,
  formatCountAxis,
  formatMonthAxisLabel,
  formatMoneyAxis,
  formatPdfCurrency,
} from './pdfFormat'

const TREND_CHART_HEIGHT = 86
const SMALL_CHART_HEIGHT = 70

const COLOR_A = COLOR.accent
const COLOR_B = COLOR.teal

export interface AnalyticsReportInput {
  data: AnalyticsData
  period: Period
  firmNames: string[]
  // Актуальность и полнота данных для шапки
  context: ReportDataContext
  onSection?: (done: number, total: number) => void
}

// Четыре KPI стороны. У второй автоколонны — относительная разница к первой,
// как на экране (AnalyticsKpiGroups).
function sideCards(side: AnalyticsSide, compareTo: AnalyticsSide | null): KpiCardData[] {
  const kpi = side.scope.kpi
  const other = compareTo?.scope.kpi

  const build = (
    label: string,
    value: string,
    kind: KpiKind,
    current: number | null,
    reference: number | null | undefined,
    higherIsBetter: boolean
  ): KpiCardData => {
    const delta = compareTo ? kpiDelta(kind, current, reference) : null
    const positive = isDeltaPositive(delta?.value, higherIsBetter)
    return {
      label: `${label} · ${side.name}`,
      value,
      delta: delta === null ? null : `${delta.text} к ${compareTo?.name ?? ''}`,
      deltaTone: positive === null ? 'neutral' : positive ? 'positive' : 'negative',
    }
  }

  return [
    build('ДТП', formatNumber(kpi.count), 'count', kpi.count, other?.count, false),
    build(
      'Ущерб',
      formatPdfCurrency(kpi.sumDamage),
      'currency',
      kpi.sumDamage,
      other?.sumDamage,
      false
    ),
    build(
      'Доля возмещения',
      formatPercent(kpi.compensationShare),
      'percent',
      kpi.compensationShare,
      other?.compensationShare,
      true
    ),
    build(
      'Средний ущерб',
      formatPdfCurrency(kpi.averageDamage),
      'currency',
      kpi.averageDamage,
      other?.averageDamage,
      false
    ),
  ]
}

function formatSummaryValue(kind: SummaryRow['kind'], value: number | null): string {
  if (kind === 'currency') return formatPdfCurrency(value)
  if (kind === 'percent') return formatPercent(value)
  return formatNumber(value)
}

function analyticsBlocks(doc: jsPDF, input: AnalyticsReportInput): BlockFactory[] {
  const { data, period } = input
  const { a, b } = data
  const periodLabel = formatPeriodLabel(period)
  const legend = [
    { label: a.name, color: COLOR_A },
    { label: b.name, color: COLOR_B },
  ]

  const monthlyCard = (
    title: string,
    pick: (index: number) => [number, number],
    formatTick: (value: number) => string
  ): BlockFactory => {
    return (x, width) =>
      card(doc, x, width, {
        title,
        legend,
        bodyHeight: TREND_CHART_HEIGHT,
        drawBody: groupedBarChartBody(
          doc,
          data.trendMonths.map((ym, index) => {
            const [primary, secondary] = pick(index)
            return { label: formatMonthAxisLabel(ym), primary, secondary }
          }),
          {
            height: TREND_CHART_HEIGHT,
            colors: [COLOR_A, COLOR_B],
            formatTick,
            labelLines: 1,
          }
        ),
      })
  }

  const causesTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: 'Сравнение структуры причин ДТП',
      columns: [
        { header: 'Категория', ratio: 0.46 },
        { header: a.name, ratio: 0.27, align: 'right', mono: true },
        { header: b.name, ratio: 0.27, align: 'right', mono: true },
      ],
      rows: data.causeComparison.map((row) => ({
        cells: [row.label, formatPercent(row.shareA), formatPercent(row.shareB)],
      })),
    })

  const averageCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: 'Средний ущерб на 1 ДТП',
      bodyHeight: SMALL_CHART_HEIGHT,
      drawBody: barChartBody(
        doc,
        [a, b].map((side) => ({
          label: side.name,
          value: side.scope.kpi.averageDamage ?? 0,
        })),
        {
          height: SMALL_CHART_HEIGHT,
          color: COLOR_A,
          formatTick: formatMoneyAxis,
          formatValue: formatMoneyAxis,
          labelLines: 1,
        }
      ),
    })

  const repeatDriversCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: 'Водителей с 3 и более ДТП',
      bodyHeight: SMALL_CHART_HEIGHT,
      drawBody: barChartBody(
        doc,
        [a, b].map((side) => ({ label: side.name, value: side.repeatDriversCount })),
        {
          height: SMALL_CHART_HEIGHT,
          color: COLOR_A,
          formatTick: formatCountAxis,
          formatValue: formatCountAxis,
          labelLines: 1,
          integerTicks: true,
        }
      ),
    })

  const damageCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: 'Сумма ущерба и возмещения',
      legend: [
        { label: 'Ущерб', color: COLOR.accent },
        { label: 'Возмещение', color: COLOR.compensation },
      ],
      bodyHeight: 2 * DUAL_ROW_HEIGHT,
      drawBody: dualBarsBody(
        doc,
        [a, b].map((side) => ({
          label: side.name,
          primary: side.scope.kpi.sumDamage,
          secondary: side.scope.kpi.sumCompensated,
          formatted: formatPdfCurrency(side.scope.kpi.sumDamage),
        })),
        { colors: [COLOR.accent, COLOR.compensation] }
      ),
    })

  const summaryTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: 'Сводное сравнение показателей',
      columns: [
        { header: 'Показатель', ratio: 0.34 },
        { header: a.name, ratio: 0.22, align: 'right', mono: true },
        { header: b.name, ratio: 0.22, align: 'right', mono: true },
        { header: 'Разница', ratio: 0.22, align: 'right', mono: true },
      ],
      rows: data.summaryRows.map((row) => ({
        cells: [
          row.label,
          formatSummaryValue(row.kind, row.valueA),
          formatSummaryValue(row.kind, row.valueB),
          kpiDelta(row.kind, row.valueB, row.valueA)?.text ?? '—',
        ],
      })),
      note: 'Разница — отличие второй автоколонны от первой: для долей в п.п., для остальных в %.',
    })

  const worstDriversTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: 'Топ-10 водителей по числу ДТП (обе автоколонны)',
      columns: [
        { header: '#', ratio: 0.05, mono: true },
        { header: 'Водитель', ratio: 0.33 },
        { header: 'Автоколонна', ratio: 0.2 },
        { header: 'ДТП', ratio: 0.1, align: 'right', mono: true },
        { header: 'Ущерб', ratio: 0.16, align: 'right', mono: true },
        { header: 'Вина водителя', ratio: 0.16, align: 'right', mono: true },
      ],
      rows: data.worstDrivers.map((row) => ({
        cells: [
          String(row.rank),
          row.name,
          row.motorcadeName,
          formatNumber(row.count),
          formatPdfCurrency(row.sumDamage),
          formatPercent(row.driverFaultShare),
        ],
      })),
    })

  return [
    reportHeader(doc, {
      kicker: 'Дашборд ДТП · Аналитика',
      title: `Сравнение: «${a.name}» и «${b.name}»`,
      periodLabel,
      generatedAt: new Date(),
      filterLines: [
        `Автоколонна 1: ${a.name}`,
        `Автоколонна 2: ${b.name}`,
        `Базы: ${input.firmNames.join(', ')}`,
        ...dataContextLines(input.context),
      ],
    }),
    // Баннер о сопоставимости временно скрыт по решению заказчика,
    // вернуть: noticeBlock(doc, 'Сопоставимость данных', data.comparabilityWarnings)
    kpiRow(doc, sideCards(a, null)),
    kpiRow(doc, sideCards(b, a)),
    columns([causesTable, damageCard], [0.55, 0.45]),
    columns([averageCard, repeatDriversCard], [0.5, 0.5]),
    monthlyCard(
      'Динамика ДТП по месяцам',
      (i) => [data.monthlyA[i]?.count ?? 0, data.monthlyB[i]?.count ?? 0],
      formatCountAxis
    ),
    monthlyCard(
      'Динамика суммы ущерба по месяцам',
      (i) => [data.monthlyA[i]?.sumDamage ?? 0, data.monthlyB[i]?.sumDamage ?? 0],
      formatMoneyAxis
    ),
    monthlyCard(
      'Динамика суммы возмещения по месяцам',
      (i) => [data.monthlyA[i]?.sumCompensated ?? 0, data.monthlyB[i]?.sumCompensated ?? 0],
      formatMoneyAxis
    ),
    summaryTable,
    worstDriversTable,
  ]
}

// Отчёт "Аналитика" — тем же векторным движком, что "Обзор" и
// "Автоколонна" (buildOverviewReport/buildMotorcadeReport).
export function buildAnalyticsReport(input: AnalyticsReportInput): {
  doc: jsPDF
  result: FlowResult
} {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  registerPdfFonts(doc)

  const result = flowBlocks(doc, analyticsBlocks(doc, input), PAGE.marginTop, {
    onSection: input.onSection,
  })
  drawPageFooters(doc, result.failed)

  return { doc, result }
}

export function saveAnalyticsReport(input: AnalyticsReportInput): FlowResult {
  const { doc, result } = buildAnalyticsReport(input)
  doc.save(buildReportFilename('analitika', input.period, new Date()))
  return result
}
