import { jsPDF } from 'jspdf'
import {
  formatNumber,
  formatPercent,
  isDeltaPositive,
  kpiDelta,
  type KpiKind,
} from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { t } from '@/shared/i18n'
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
      delta:
        delta === null
          ? null
          : t('roadAccidents.pdf.deltaVsMotorcade', {
              delta: delta.text,
              name: compareTo?.name ?? '',
            }),
      deltaTone: positive === null ? 'neutral' : positive ? 'positive' : 'negative',
    }
  }

  return [
    build(
      t('roadAccidents.common.accidents'),
      formatNumber(kpi.count),
      'count',
      kpi.count,
      other?.count,
      false
    ),
    build(
      t('roadAccidents.common.damage'),
      formatPdfCurrency(kpi.sumDamage),
      'currency',
      kpi.sumDamage,
      other?.sumDamage,
      false
    ),
    build(
      t('roadAccidents.kpi.compensationShare'),
      formatPercent(kpi.compensationShare),
      'percent',
      kpi.compensationShare,
      other?.compensationShare,
      true
    ),
    build(
      t('roadAccidents.kpi.averageDamageShort'),
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
      title: t('roadAccidents.chart.causesComparison'),
      columns: [
        { header: t('roadAccidents.common.category'), ratio: 0.46 },
        { header: a.name, ratio: 0.27, align: 'right', mono: true },
        { header: b.name, ratio: 0.27, align: 'right', mono: true },
      ],
      rows: data.causeComparison.map((row) => ({
        cells: [row.label, formatPercent(row.shareA), formatPercent(row.shareB)],
      })),
    })

  const averageCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: t('roadAccidents.kpi.averageDamage'),
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
      title: t('roadAccidents.chart.repeatDrivers'),
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
      title: t('roadAccidents.chart.damageComparison'),
      legend: [
        { label: t('roadAccidents.common.damage'), color: COLOR.accent },
        { label: t('roadAccidents.common.compensation'), color: COLOR.compensation },
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
      title: t('roadAccidents.table.summaryComparison'),
      columns: [
        { header: t('roadAccidents.common.indicator'), ratio: 0.34 },
        { header: a.name, ratio: 0.22, align: 'right', mono: true },
        { header: b.name, ratio: 0.22, align: 'right', mono: true },
        { header: t('roadAccidents.common.difference'), ratio: 0.22, align: 'right', mono: true },
      ],
      rows: data.summaryRows.map((row) => ({
        cells: [
          row.label,
          formatSummaryValue(row.kind, row.valueA),
          formatSummaryValue(row.kind, row.valueB),
          kpiDelta(row.kind, row.valueB, row.valueA)?.text ?? '—',
        ],
      })),
      note: t('roadAccidents.pdf.note.difference'),
    })

  const worstDriversTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: t('roadAccidents.table.topDriversBoth'),
      columns: [
        { header: '#', ratio: 0.05, mono: true },
        { header: t('roadAccidents.common.driver'), ratio: 0.33 },
        { header: t('roadAccidents.common.motorcade'), ratio: 0.2 },
        { header: t('roadAccidents.common.accidents'), ratio: 0.1, align: 'right', mono: true },
        { header: t('roadAccidents.common.damage'), ratio: 0.16, align: 'right', mono: true },
        { header: t('roadAccidents.cause.driverFault'), ratio: 0.16, align: 'right', mono: true },
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
      kicker: t('roadAccidents.pdf.kicker.analytics'),
      title: t('roadAccidents.pdf.title.analytics', { a: a.name, b: b.name }),
      periodLabel,
      generatedAt: new Date(),
      filterLines: [
        t('roadAccidents.pdf.filter.motorcadeA', { name: a.name }),
        t('roadAccidents.pdf.filter.motorcadeB', { name: b.name }),
        t('roadAccidents.pdf.filter.bases', { bases: input.firmNames.join(', ') }),
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
      t('roadAccidents.chart.accidentsTrend'),
      (i) => [data.monthlyA[i]?.count ?? 0, data.monthlyB[i]?.count ?? 0],
      formatCountAxis
    ),
    monthlyCard(
      t('roadAccidents.chart.damageSumTrend'),
      (i) => [data.monthlyA[i]?.sumDamage ?? 0, data.monthlyB[i]?.sumDamage ?? 0],
      formatMoneyAxis
    ),
    monthlyCard(
      t('roadAccidents.chart.compensationSumTrend'),
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
