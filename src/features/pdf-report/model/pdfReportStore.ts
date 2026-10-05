import { makeAutoObservable, observableRef, runInAction } from 'mobx'
import { t } from '@/shared/i18n'

// Экспортёр возвращает, сколько разделов не отрисовалось (void — нечего
// сообщать, например нет данных для отчёта)
export type PdfExporter = () => Promise<{ failed: number } | void>

// Кнопка "PDF отчёт" в шапке общая на все экраны, но саму генерацию умеет
// собрать только тот экран, что сейчас отрисован ("Обзор", "Автоколонна",
// "Аналитика"). Экран при монтировании регистрирует свой
// обработчик здесь, стор не знает о конкретных экранах.
class PdfReportStore {
  exporter: PdfExporter | null = null
  isGenerating = false
  progress: { current: number; total: number } = { current: 0, total: 0 }
  // Сообщение пользователю по итогам формирования: ошибка (файла нет) или
  // предупреждение (файл сохранён, но часть разделов пропущена)
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

  // Блокирует повторный клик, пока идёт формирование. Движок раскладки сам
  // переживает отказ отдельных разделов (результат — failed), здесь ловится
  // только полный сбой (например, не загрузился модуль отчёта).
  async trigger(): Promise<void> {
    const exporter = this.exporter
    if (this.isGenerating || !exporter) return

    this.isGenerating = true
    this.lastError = null
    this.lastWarning = null
    this.progress = { current: 0, total: 0 }

    try {
      // Сборка PDF синхронная и на пару сотен миллисекунд блокирует поток —
      // отдаём браузеру кадр, чтобы оверлей успел отрисоваться до этого.
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
