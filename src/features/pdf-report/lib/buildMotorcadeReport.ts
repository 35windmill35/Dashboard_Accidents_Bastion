import { jsPDF } from 'jspdf'
import {
  formatNumber,
  formatPercent,
  isDeltaPositive,
  kpiDelta,
  type KpiKind,
} from '@/shared/lib/formatters'
import { NO_DAMAGE_CATEGORY_ENABLED } from '@/shared/config/accidentCauses'
import { comparisonLabel, formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import { t } from '@/shared/i18n'
import type { MotorcadeData } from '@/pages/motorcade/model/motorcadeData'
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
  barChartBody,
  card,
  distributionBody,
  groupedBarChartBody,
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

// Топ-N совпадает со свёрнутым состоянием таблиц на экране, как и на
// "Обзоре" (см. buildOverviewReport) — полный список пользователь берёт
// выгрузкой CSV.
const DRIVERS_TOP_N = 8
const VEHICLES_TOP_N = 8

const TREND_CHART_HEIGHT = 102
const DAMAGE_CHART_HEIGHT = 76

export interface MotorcadeReportInput {
  data: MotorcadeData
  period: Period
  motorcadeName: string
  // Актуальность и полнота данных для шапки
  context: ReportDataContext
  onSection?: (done: number, total: number) => void
}

// 8 KPI, не 5, как на "Обзоре" (три доли по вине — только у одной
// автоколонны они информативны, у компании целиком это уже структура
// причин). deltaHigherIsBetter расставлены так же, как в MotorcadeKpiRow на
// экране.
function kpiCards(data: MotorcadeData): KpiCardData[] {
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

  const cards = [
    build(
      t('roadAccidents.kpi.accidentCount'),
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
      t('roadAccidents.kpi.averageDamage'),
      formatPdfCurrency(kpi.averageDamage),
      'currency',
      kpi.averageDamage,
      previousKpi?.averageDamage,
      false
    ),
    build(
      t('roadAccidents.kpi.driverFaultShare'),
      formatPercent(kpi.driverFaultShare),
      'percent',
      kpi.driverFaultShare,
      previousKpi?.driverFaultShare,
      false
    ),
    build(
      t('roadAccidents.kpi.thirdPartyFaultShare'),
      formatPercent(kpi.thirdPartyFaultShare),
      'percent',
      kpi.thirdPartyFaultShare,
      previousKpi?.thirdPartyFaultShare,
      false
    ),
  ]

  // Правило «Без повреждения» не подтверждено — карточку не печатаем
  if (NO_DAMAGE_CATEGORY_ENABLED) {
    cards.push(
      build(
        t('roadAccidents.kpi.noDamageShare'),
        formatPercent(kpi.noDamageShare),
        'percent',
        kpi.noDamageShare,
        previousKpi?.noDamageShare,
        false
      )
    )
  }
  return cards
}

function motorcadeBlocks(doc: jsPDF, input: MotorcadeReportInput): BlockFactory[] {
  const { data, period } = input
  const periodLabel = formatPeriodLabel(period)
  const drivers = data.driversRanking.slice(0, DRIVERS_TOP_N)
  const vehicles = data.vehiclesRanking.slice(0, VEHICLES_TOP_N)
  const cards = kpiCards(data)
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
      kicker: t('roadAccidents.pdf.kicker.motorcade'),
      title: t('roadAccidents.pdf.title.motorcade', { name: input.motorcadeName }),
      periodLabel,
      generatedAt: new Date(),
      // Перечень баз в шапке не нужен — это деталь интеграции, не фильтр
      filterLines: dataContextLines(input.context),
    }),
    kpiRow(doc, cards.slice(0, 4)),
    kpiRow(doc, cards.slice(4, 8), 4),
    columns([trendCard, causesCard], [0.58, 0.42]),
    damageTrendCard,
    columns([driversTable, vehiclesTable], [0.5, 0.5]),
    causesTable,
  ]
}

// Собирает отчёт "Автоколонна" тем же способом, что и "Обзор"
// (buildOverviewReport) — векторной отрисовкой, без снимков экрана. Блоков
// меньше: у одной автоколонны нет смысла в сравнении "ДТП/ущерб по
// автоколоннам" — это графики только "Обзора".
export function buildMotorcadeReport(input: MotorcadeReportInput): {
  doc: jsPDF
  result: FlowResult
} {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  registerPdfFonts(doc)

  const result = flowBlocks(doc, motorcadeBlocks(doc, input), PAGE.marginTop, {
    onSection: input.onSection,
  })
  drawPageFooters(doc, result.failed)

  return { doc, result }
}

export function saveMotorcadeReport(input: MotorcadeReportInput): FlowResult {
  const { doc, result } = buildMotorcadeReport(input)
  doc.save(buildReportFilename('avtokolonna', input.period, new Date()))
  return result
}
