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
import type { OverviewData } from '@/pages/overview/model/overviewData'
import { COLOR, PAGE, registerPdfFonts } from './pdfKit'
import { columns, drawPageFooters, flowBlocks, type BlockFactory } from './pdfFlow'
import { kpiRow, reportHeader, type KpiCardData } from './pdfChrome'
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
  formatCountAxis,
  formatMonthAxisLabel,
  formatMoneyAxis,
  splitMonthLabel,
} from './pdfFormat'

// Топ-N в отчёте совпадает со свёрнутым состоянием таблиц на экране; полный
// список пользователь берёт выгрузкой CSV, об этом подпись под таблицей.
const DRIVERS_TOP_N = 8
const VEHICLES_TOP_N = 8
const MOTORCADES_TOP_N = 10

const TREND_CHART_HEIGHT = 102
const DAMAGE_CHART_HEIGHT = 76

export interface OverviewReportInput {
  data: OverviewData
  period: Period
  firmNames: string[]
  onSection?: (done: number, total: number) => void
}

function kpiCards(data: OverviewData): KpiCardData[] {
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
    build('Всего ДТП', formatNumber(kpi.count), kpi.count, previousKpi?.count, false),
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
      'Средний ущерб на ДТП',
      formatCurrency(kpi.averageDamage),
      kpi.averageDamage,
      previousKpi?.averageDamage,
      false
    ),
  ]
}

// Короткие выводы под карточками считаются по тем же данным, что и графики —
// это не аналитика "на глаз", а пересказ чисел, которые уже на странице.
function causesNote(data: OverviewData): string {
  const total = data.kpi.count
  if (total === 0) return 'За выбранный период ДТП не зарегистрировано.'

  const top = [...data.causeSlices].sort((a, b) => b.count - a.count)[0]
  if (!top || top.count === 0) return 'Причины ДТП за период не классифицированы.'
  if (top.count === total) {
    return `Все ДТП периода отнесены к категории «${top.label}» — 100% случаев.`
  }
  return `Больше всего ДТП в категории «${top.label}» — ${formatNumber(top.count)} из ${formatNumber(total)} (${formatPercent(top.count / total)}).`
}

function motorcadeNote(data: OverviewData): string | undefined {
  const aggregates = data.motorcadeAgg
  if (aggregates.length === 0) return 'За выбранный период ДТП не зарегистрировано.'
  if (aggregates.length === 1) return 'Данные за период поступили только по одной автоколонне.'

  const top = aggregates[0]
  const total = data.kpi.count
  if (!total) return undefined
  return `Лидирует «${top.name}» — ${formatNumber(top.count)} из ${formatNumber(total)} ДТП (${formatPercent(top.count / total)}).`
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
      note: causesNote(data),
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

  const motorcadeCountCard: BlockFactory = (x, width) =>
    card(doc, x, width, {
      title: 'ДТП по автоколоннам',
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
      title: 'Ущерб и возмещение по автоколоннам',
      legend: [
        { label: 'Ущерб', color: COLOR.accent },
        { label: 'Возмещение', color: COLOR.teal },
      ],
      bodyHeight: Math.max(1, motorcades.length) * DUAL_ROW_HEIGHT,
      note: motorcades.length === 0 ? 'За выбранный период ДТП не зарегистрировано.' : undefined,
      drawBody: dualBarsBody(
        doc,
        motorcades.map((item) => ({
          label: item.name,
          primary: item.sumDamage,
          secondary: item.sumCompensated,
          formatted: formatCurrency(item.sumDamage),
        })),
        { colors: [COLOR.accent, COLOR.teal] }
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
      kicker: 'Дашборд ДТП · Обзор',
      title: 'Отчёт по общим показателям',
      periodLabel,
      generatedAt: new Date(),
      filterLines: [
        'Автоколонны: все',
        `Базы: ${input.firmNames.length > 0 ? input.firmNames.join(', ') : '—'}`,
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

// Собирает отчёт «Обзор» целиком векторной отрисовкой — без снимков экрана,
// поэтому текст в PDF остаётся текстом (ищется и выделяется), файл весит
// сотни килобайт, а вёрстка не зависит от размера окна пользователя.
export function buildOverviewReport(input: OverviewReportInput): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  registerPdfFonts(doc)

  flowBlocks(doc, overviewBlocks(doc, input), PAGE.marginTop, { onSection: input.onSection })
  drawPageFooters(doc)

  return doc
}

export function saveOverviewReport(input: OverviewReportInput): void {
  const doc = buildOverviewReport(input)
  doc.save(buildReportFilename('obzor', input.period, new Date()))
}
