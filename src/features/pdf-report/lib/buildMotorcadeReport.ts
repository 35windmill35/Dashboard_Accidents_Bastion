import { jsPDF } from 'jspdf'
import {
  calcDelta,
  formatCurrency,
  formatDelta,
  formatNumber,
  formatPercent,
  isDeltaPositive,
} from '@/shared/lib/formatters'
import { formatPeriodLabel, type Period } from '@/entities/accident/lib/period'
import type { MotorcadeData } from '@/pages/motorcade/model/motorcadeData'
import { COLOR, PAGE, registerPdfFonts } from './pdfKit'
import { columns, drawPageFooters, flowBlocks, type BlockFactory } from './pdfFlow'
import { kpiRow, reportHeader, type KpiCardData } from './pdfChrome'
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
  firmName: string
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
    current: number | null,
    previous: number | null | undefined,
    higherIsBetter: boolean
  ): KpiCardData => {
    const delta = previousKpi ? calcDelta(current, previous) : null
    const positive = isDeltaPositive(delta, higherIsBetter)
    return {
      label,
      value,
      delta: delta === null ? null : `${formatDelta(delta)} к пред. периоду`,
      deltaTone: positive === null ? 'neutral' : positive ? 'positive' : 'negative',
    }
  }

  return [
    build('Количество ДТП', formatNumber(kpi.count), kpi.count, previousKpi?.count, false),
    build(
      'Сумма ущерба',
      formatCurrency(kpi.sumDamage),
      kpi.sumDamage,
      previousKpi?.sumDamage,
      false
    ),
    build(
      'Сумма возмещения',
      formatCurrency(kpi.sumCompensated),
      kpi.sumCompensated,
      previousKpi?.sumCompensated,
      true
    ),
    build(
      'Доля возмещения',
      formatPercent(kpi.compensationShare),
      kpi.compensationShare,
      previousKpi?.compensationShare,
      true
    ),
    build(
      'Средний ущерб на 1 ДТП',
      formatCurrency(kpi.averageDamage),
      kpi.averageDamage,
      previousKpi?.averageDamage,
      false
    ),
    build(
      'Доля ДТП по вине водителя',
      formatPercent(kpi.driverFaultShare),
      kpi.driverFaultShare,
      previousKpi?.driverFaultShare,
      false
    ),
    build(
      'Доля ДТП по вине третьей стороны',
      formatPercent(kpi.thirdPartyFaultShare),
      kpi.thirdPartyFaultShare,
      previousKpi?.thirdPartyFaultShare,
      false
    ),
    build(
      'Доля ДТП без повреждений',
      formatPercent(kpi.noDamageShare),
      kpi.noDamageShare,
      previousKpi?.noDamageShare,
      false
    ),
  ]
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
      title: 'Динамика ДТП по месяцам',
      legend: [{ label: 'ДТП', color: COLOR.accent }],
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
      title: 'Структура причин ДТП',
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
      title: 'Динамика ущерба и возмещения по месяцам',
      legend: [
        { label: 'Ущерб', color: COLOR.accent },
        { label: 'Возмещение', color: COLOR.teal },
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
          colors: [COLOR.accent, COLOR.teal],
          formatTick: formatMoneyAxis,
          labelLines: 1,
        }
      ),
    })

  const driversTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: `Топ-${DRIVERS_TOP_N} водителей по числу ДТП`,
      columns: [
        { header: 'Водитель', ratio: 0.55 },
        { header: 'ДТП', ratio: 0.15, align: 'right', mono: true },
        { header: 'Ущерб', ratio: 0.3, align: 'right', mono: true },
      ],
      rows: drivers.map((row) => ({
        cells: [row.name, formatNumber(row.count), formatCurrency(row.sumDamage)],
      })),
      note:
        data.driversRanking.length > DRIVERS_TOP_N
          ? `Показаны ${DRIVERS_TOP_N} из ${formatNumber(data.driversRanking.length)} — полный список в выгрузке CSV на экране.`
          : undefined,
    })

  const vehiclesTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: `Топ-${VEHICLES_TOP_N} автобусов по числу ДТП`,
      columns: [
        { header: 'ТС', ratio: 0.55 },
        { header: 'ДТП', ratio: 0.15, align: 'right', mono: true },
        { header: 'Ущерб', ratio: 0.3, align: 'right', mono: true },
      ],
      rows: vehicles.map((row) => ({
        cells: [row.name, formatNumber(row.count), formatCurrency(row.sumDamage)],
      })),
      note:
        data.vehiclesRanking.length > VEHICLES_TOP_N
          ? `Показаны ${VEHICLES_TOP_N} из ${formatNumber(data.vehiclesRanking.length)} — полный список в выгрузке CSV на экране.`
          : undefined,
    })

  const causesTable: BlockFactory = (x, width) =>
    tableCard(doc, x, width, {
      title: 'Ущерб и возмещение по категориям причин',
      columns: [
        { header: 'Категория', ratio: 0.34 },
        { header: 'ДТП', ratio: 0.12, align: 'right', mono: true },
        { header: 'Ущерб', ratio: 0.2, align: 'right', mono: true },
        { header: 'Возмещение', ratio: 0.2, align: 'right', mono: true },
        { header: 'Доля возмещения', ratio: 0.14, align: 'right', mono: true },
      ],
      rows: [
        ...data.causeSlices.map((slice, index) => ({
          cells: [
            slice.label,
            formatNumber(slice.count),
            formatCurrency(slice.sumDamage),
            formatCurrency(slice.sumCompensated),
            slice.sumDamage > 0 ? formatPercent(slice.sumCompensated / slice.sumDamage) : '—',
          ],
          highlighted: index === topCauseIndex && slice.count > 0,
        })),
        {
          cells: [
            'Итого',
            formatNumber(causeTotal.count),
            formatCurrency(causeTotal.sumDamage),
            formatCurrency(causeTotal.sumCompensated),
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
      kicker: 'Дашборд ДТП · Автоколонна',
      title: `Отчёт по автоколонне «${input.motorcadeName}»`,
      periodLabel,
      generatedAt: new Date(),
      // Перечисление баз, из которых собраны данные, в шапке не нужно
      // пользователю — это внутренняя деталь интеграции, не фильтр отчёта
      // (см. buildOverviewReport).
      filterLines: [],
    }),
    kpiRow(doc, cards.slice(0, 4)),
    kpiRow(doc, cards.slice(4, 8)),
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
export function buildMotorcadeReport(input: MotorcadeReportInput): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  registerPdfFonts(doc)

  flowBlocks(doc, motorcadeBlocks(doc, input), PAGE.marginTop, { onSection: input.onSection })
  drawPageFooters(doc)

  return doc
}

export function saveMotorcadeReport(input: MotorcadeReportInput): void {
  const doc = buildMotorcadeReport(input)
  doc.save(buildReportFilename('avtokolonna', input.period, new Date()))
}
