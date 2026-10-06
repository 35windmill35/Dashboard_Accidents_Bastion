import { jsPDF } from 'jspdf'
import {
  formatNumber,
  formatPercent,
  isDeltaPositive,
  kpiDelta,
  type KpiKind,
} from '@/shared/lib/formatters'
import { comparisonLabel, formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { t } from '@/shared/i18n'
import type { OverviewData } from '@/pages/overview/model/overviewData'
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
  DISTRIBUTION_ROW_HEIGHT,
  DUAL_ROW_HEIGHT,
  RANKED_ROW_HEIGHT,
  barChartBody,
  card,
  distributionBody,
  dualBarsBody,
  groupedBarChartBody,
  rankedBarsBody,
  tableCard,
} from './pdfBlocks'
import {
  buildReportFilename,
  causesNote,
  formatCountAxis,
  formatMonthAxisLabel,
  formatMoneyAxis,
  formatPdfCurrency,
  splitMonthLabel,
} from './pdfFormat'

// Как в свёрнутых таблицах на экране
const DRIVERS_TOP_N = 8
const VEHICLES_TOP_N = 8
const MOTORCADES_TOP_N = 10

const TREND_CHART_HEIGHT = 102
const DAMAGE_CHART_HEIGHT = 76

export interface OverviewReportInput {
  data: OverviewData
  period: Period
  context: ReportDataContext
  onSection?: (done: number, total: number) => void
}

function kpiCards(data: OverviewData): KpiCardData[] {
  const { kpi, previousKpi } = data

  const build = (
    label: string,
    value: string,
    kind: KpiKind,
    current: number | null,
    previous: number | null | undefined,
    higherIsBetter: boolean
  ): KpiCardData => {
    const delta = previousKpi ? kpiDelta(kind, current, previous) : null
    const positive = isDeltaPositive(delta?.value, higherIsBetter)
    return {
      label,
      value,
      delta: delta === null ? null : `${delta.text} ${comparisonLabel(data.comparison)}`,
      deltaTone: positive === null ? 'neutral' : positive ? 'positive' : 'negative',
    }
  }

  return [
    build(
      t('roadAccidents.kpi.totalAccidents'),
      formatNumber(kpi.count),
      'count',
      kpi.count,
      previousKpi?.count,
      false
    ),
    build(
      t('roadAccidents.kpi.damageSum'),
      formatPdfCurrency(kpi.sumDamage),
      'currency',
      kpi.sumDamage,
      previousKpi?.sumDamage,
      false
    ),
    build(
      t('roadAccidents.kpi.compensationSum'),
      formatPdfCurrency(kpi.sumCompensated),
      'currency',
      kpi.sumCompensated,
      previousKpi?.sumCompensated,
      true
    ),
    build(
      t('roadAccidents.kpi.compensationShare'),
      formatPercent(kpi.compensationShare),
      'percent',
      kpi.compensationShare,
      previousKpi?.compensationShare,
      true
    ),
    build(
      t('roadAccidents.kpi.averageDamagePdf'),
      formatPdfCurrency(kpi.averageDamage),
      'currency',
      kpi.averageDamage,
      previousKpi?.averageDamage,
      false
    ),
  ]
}

function motorcadeNote(data: OverviewData): string | undefined {
  const aggregates = data.motorcadeAgg
  if (aggregates.length === 0) return t('roadAccidents.pdf.insight.noAccidents')
  if (aggregates.length === 1) return t('roadAccidents.pdf.insight.singleMotorcade')

  const top = aggregates[0]
  const total = data.kpi.count
  if (!total) return undefined
  return t('roadAccidents.pdf.insight.motorcadeLeader', {
    name: top.name,
    count: formatNumber(top.count),
    total: formatNumber(total),
    share: formatPercent(top.count / total),
  })
}

function overviewBlocks(doc: jsPDF, input: OverviewReportInput): BlockFactory[] {
  const { data, period } = input
  const periodLabel = formatPeriodLabel(period)
  const motorcades = data.motorcadeAgg.slice(0, MOTORCADES_TOP_N)
  const drivers = data.driversRanking.slice(0, DRIVERS_TOP_N)
  const vehicles = data.vehiclesRanking.slice(0, VEHICLES_TOP_N)
  const causeTotal = data.causeSlices.reduce(
    (acc, slice) => ({
      count: acc.count + slice.count,
      sumDamage: acc.sumDamage + slice.sumDamage,
      sumCompensated: acc.sumCompensated + slice.sumCompensated,
    }),
    { count: 0, sumDamage: 0, sumCompensated: 0 }
  )
  const topCauseIndex = data.causeSlices.reduce(
    (best, slice, index, all) => (slice.count > all[best].count ? index : best),
    0
  )

  const trendCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: t('roadAccidents.chart.accidentsTrend'),
      legend: [{ label: t('roadAccidents.common.accidents'), color: COLOR.accent }],
      bodyHeight: TREND_CHART_HEIGHT,
      drawBody: barChartBody(
        doc,
        data.monthlyCounts.map((item) => ({ ...splitMonthLabel(item.ym), value: item.count })),
        {
          height: TREND_CHART_HEIGHT,
          color: COLOR.accent,
          formatTick: formatCountAxis,
          formatValue: formatCountAxis,
          labelLines: 2,
          integerTicks: true,
        }
      ),
    })

  const causesCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: t('roadAccidents.chart.causes'),
      bodyHeight: data.causeSlices.length * DISTRIBUTION_ROW_HEIGHT,
      note: causesNote(data.causeSlices, data.kpi.count),
      drawBody: distributionBody(
        doc,
        data.causeSlices.map((slice) => ({
          label: slice.label,
          value: slice.count,
          formatted: formatNumber(slice.count),
        })),
        COLOR.accent
      ),
    })

  const damageTrendCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: t('roadAccidents.chart.damageTrend'),
      legend: [
        { label: t('roadAccidents.common.damage'), color: COLOR.accent },
        { label: t('roadAccidents.common.compensation'), color: COLOR.compensation },
      ],
      bodyHeight: DAMAGE_CHART_HEIGHT,
      drawBody: groupedBarChartBody(
        doc,
        data.monthlyCounts.map((item) => ({
          label: formatMonthAxisLabel(item.ym),
          primary: item.sumDamage,
          secondary: item.sumCompensated,
        })),
        {
          height: DAMAGE_CHART_HEIGHT,
          colors: [COLOR.accent, COLOR.compensation],
          formatTick: formatMoneyAxis,
          labelLines: 1,
        }
      ),
    })

  const motorcadeCountCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: t('roadAccidents.chart.accidentsByMotorcade'),
      bodyHeight: Math.max(1, motorcades.length) * RANKED_ROW_HEIGHT,
      note: motorcadeNote(data),
      drawBody: rankedBarsBody(
        doc,
        motorcades.map((item) => ({
          label: item.name,
          value: item.count,
          formatted: formatNumber(item.count),
        })),
        { color: COLOR.accent }
      ),
    })

  const motorcadeDamageCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: t('roadAccidents.chart.damageByMotorcade'),
      legend: [
        { label: t('roadAccidents.common.damage'), color: COLOR.accent },
        { label: t('roadAccidents.common.compensation'), color: COLOR.compensation },
      ],
      bodyHeight: Math.max(1, motorcades.length) * DUAL_ROW_HEIGHT,
      note: motorcades.length === 0 ? t('roadAccidents.pdf.insight.noAccidents') : undefined,
      drawBody: dualBarsBody(
        doc,
        motorcades.map((item) => ({
          label: item.name,
          primary: item.sumDamage,
          secondary: item.sumCompensated,
          formatted: formatPdfCurrency(item.sumDamage),
        })),
        { colors: [COLOR.accent, COLOR.compensation] }
      ),
    })

  const driversTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: t('roadAccidents.table.topDrivers', { count: DRIVERS_TOP_N }),
      columns: [
        { header: t('roadAccidents.common.driver'), ratio: 0.55 },
        { header: t('roadAccidents.common.accidents'), ratio: 0.15, align: 'right', mono: true },
        { header: t('roadAccidents.common.damage'), ratio: 0.3, align: 'right', mono: true },
      ],
      rows: drivers.map((row) => ({
        cells: [row.name, formatNumber(row.count), formatPdfCurrency(row.sumDamage)],
      })),
      note:
        data.driversRanking.length > DRIVERS_TOP_N
          ? t('roadAccidents.pdf.note.truncated', {
              shown: DRIVERS_TOP_N,
              total: formatNumber(data.driversRanking.length),
            })
          : undefined,
    })

  const vehiclesTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: t('roadAccidents.table.topVehicles', { count: VEHICLES_TOP_N }),
      columns: [
        { header: t('roadAccidents.common.vehicle'), ratio: 0.55 },
        { header: t('roadAccidents.common.accidents'), ratio: 0.15, align: 'right', mono: true },
        { header: t('roadAccidents.common.damage'), ratio: 0.3, align: 'right', mono: true },
      ],
      rows: vehicles.map((row) => ({
        cells: [row.name, formatNumber(row.count), formatPdfCurrency(row.sumDamage)],
      })),
      note:
        data.vehiclesRanking.length > VEHICLES_TOP_N
          ? t('roadAccidents.pdf.note.truncated', {
              shown: VEHICLES_TOP_N,
              total: formatNumber(data.vehiclesRanking.length),
            })
          : undefined,
    })

  const causesTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: t('roadAccidents.chart.damageByCause'),
      columns: [
        { header: t('roadAccidents.common.category'), ratio: 0.34 },
        { header: t('roadAccidents.common.accidents'), ratio: 0.12, align: 'right', mono: true },
        { header: t('roadAccidents.common.damage'), ratio: 0.2, align: 'right', mono: true },
        { header: t('roadAccidents.common.compensation'), ratio: 0.2, align: 'right', mono: true },
        {
          header: t('roadAccidents.kpi.compensationShare'),
          ratio: 0.14,
          align: 'right',
          mono: true,
        },
      ],
      rows: [
        ...data.causeSlices.map((slice, index) => ({
          cells: [
            slice.label,
            formatNumber(slice.count),
            formatPdfCurrency(slice.sumDamage),
            formatPdfCurrency(slice.sumCompensated),
            slice.sumDamage > 0 ? formatPercent(slice.sumCompensated / slice.sumDamage) : '—',
          ],
          highlighted: index === topCauseIndex && slice.count > 0,
        })),
        {
          cells: [
            t('roadAccidents.common.total'),
            formatNumber(causeTotal.count),
            formatPdfCurrency(causeTotal.sumDamage),
            formatPdfCurrency(causeTotal.sumCompensated),
            causeTotal.sumDamage > 0
              ? formatPercent(causeTotal.sumCompensated / causeTotal.sumDamage)
              : '—',
          ],
          emphasized: true,
        },
      ],
    })

  return [
    reportHeader(doc, {
      kicker: t('roadAccidents.pdf.kicker.overview'),
      title: t('roadAccidents.pdf.title.overview'),
      periodLabel,
      generatedAt: new Date(),
      filterLines: [
        t('roadAccidents.pdf.filter.allMotorcades'),
        ...dataContextLines(input.context),
      ],
    }),
    kpiRow(doc, kpiCards(data)),
    columns([trendCard, causesCard], [0.58, 0.42]),
    damageTrendCard,
    columns([motorcadeCountCard, motorcadeDamageCard], [0.5, 0.5]),
    columns([driversTable, vehiclesTable], [0.5, 0.5]),
    causesTable,
  ]
}

// Векторная отрисовка: текст остаётся текстом, вёрстка не зависит от окна
export function buildOverviewReport(input: OverviewReportInput): {
  doc: jsPDF
  result: FlowResult
} {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  registerPdfFonts(doc)

  const result = flowBlocks(doc, overviewBlocks(doc, input), PAGE.marginTop, {
    onSection: input.onSection,
  })
  drawPageFooters(doc, result.failed)

  return { doc, result }
}

export function saveOverviewReport(input: OverviewReportInput): FlowResult {
  const { doc, result } = buildOverviewReport(input)
  doc.save(buildReportFilename('obzor', input.period, new Date()))
  return result
}
