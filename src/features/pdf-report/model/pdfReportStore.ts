import { makeAutoObservable, observableRef } from 'mobx'

export type PdfExporter = () => Promise<void>

// Кнопка "PDF отчёт" в шапке общая на все экраны, но саму генерацию умеет
// собрать только тот экран, что сейчас отрисован ("Обзор" и "Автоколонна" —
// "Аналитика" пока заглушка). Экран при монтировании регистрирует свой
// обработчик здесь, стор не знает о конкретных экранах.
class PdfReportStore {
  exporter: PdfExporter | null = null
  isGenerating = false
  progress: { current: number; total: number } = { current: 0, total: 0 }
  lastError: string | null = null

  constructor() {
    makeAutoObservable(this, { exporter: observableRef })
  }

  get isAvailable(): boolean {
    return this.exporter !== null
  }

  register(exporter: PdfExporter): void {
    this.exporter = exporter
  }

  unregister(exporter: PdfExporter): void {
    if (this.exporter === exporter) this.exporter = null
  }

  setProgress(current: number, total: number): void {
    this.progress = { current, total }
  }

  // Блокирует повторный клик, пока идёт формирование — сам генератор
  // (generatePdfReport) уже терпим к отказу отдельных секций, здесь ловим
  // только катастрофический сбой (например, jsPDF не смог инициализироваться).
  async trigger(): Promise<void> {
    if (this.isGenerating || !this.exporter) return

    this.isGenerating = true
    this.lastError = null
    this.progress = { current: 0, total: 0 }

    try {
      // Сборка PDF синхронная и на пару сотен миллисекунд блокирует поток —
      // отдаём браузеру кадр, чтобы оверлей успел отрисоваться до этого.
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await this.exporter()
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Не удалось сформировать PDF-отчёт'
      console.error('[pdf-report] формирование отчёта прервано:', err)
    } finally {
      this.isGenerating = false
    }
  }
}

export const pdfReportStore = new PdfReportStore()
