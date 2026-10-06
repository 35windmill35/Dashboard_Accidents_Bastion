import { makeAutoObservable, observableRef, runInAction } from 'mobx'
import { t } from '@/shared/i18n'

// Возвращает число неотрисованных разделов
export type PdfExporter = () => Promise<{ failed: number } | void>

// Экспортёр регистрирует экран, который сейчас отрисован
class PdfReportStore {
  exporter: PdfExporter | null = null
  isGenerating = false
  progress: { current: number; total: number } = { current: 0, total: 0 }
  lastError: string | null = null
  lastWarning: string | null = null

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

  dismissNotice(): void {
    this.lastError = null
    this.lastWarning = null
  }

  // Здесь ловится только полный сбой; отказ отдельных разделов — в failed
  async trigger(): Promise<void> {
    const exporter = this.exporter
    if (this.isGenerating || !exporter) return

    this.isGenerating = true
    this.lastError = null
    this.lastWarning = null
    this.progress = { current: 0, total: 0 }

    try {
      // Отдаём кадр, чтобы оверлей успел отрисоваться до синхронной сборки
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const result = await exporter()
      runInAction(() => {
        if (result && result.failed > 0) {
          this.lastWarning = t('roadAccidents.pdf.warningIncomplete', { count: result.failed })
        }
      })
    } catch (err) {
      console.error('[pdf-report] формирование отчёта прервано:', err)
      runInAction(() => {
        this.lastError = t('roadAccidents.pdf.error')
      })
    } finally {
      runInAction(() => {
        this.isGenerating = false
      })
    }
  }
}

export const pdfReportStore = new PdfReportStore()
