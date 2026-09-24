import { makeAutoObservable } from 'mobx'
import { applyChartScheme } from '@/shared/lib/chartColors'

export type Theme = 'dark' | 'light'

const LIGHT_QUERY = '(prefers-color-scheme: light)'

// Ключ, под которым тестовая сборка шага 1 запоминала ручной выбор темы.
// Переключателя больше нет — удаляем остаток, чтобы он ни на что не влиял.
const LEGACY_STORAGE_KEY = 'dtp-theme'

function readSystemTheme(): Theme {
  return window.matchMedia?.(LIGHT_QUERY).matches ? 'light' : 'dark'
}

// Тема интерфейса по ТЗ — только из настроек браузера/системы
// (prefers-color-scheme), без переключателя в UI; по умолчанию тёмная.
// Смена системной темы подхватывается сразу, без перезагрузки.
//
// Сама тема — атрибут data-theme на <html> (см. app/styles/theme.css;
// до загрузки бандла его ставит скрипт в index.html). Палитра графиков
// (Recharts не читает CSS-переменные) переключается здесь же через
// applyChartScheme, а AppShell перемонтирует контент экрана по смене
// темы, чтобы графики перерисовались новыми цветами.
//
// Смена мгновенная, без CSS-переходов: плавный переход всех цветов на
// всех элементах страницы (включая тысячи SVG-узлов графиков и размытие
// шапки) перерисовывал экран каждый кадр и давал заметные подтормаживания.
class ThemeStore {
  theme: Theme

  constructor() {
    this.theme = readSystemTheme()
    makeAutoObservable(this)

    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // хранилище недоступно — удалять нечего
    }

    this.apply()
    window.matchMedia?.(LIGHT_QUERY).addEventListener('change', (event) => {
      this.setTheme(event.matches ? 'light' : 'dark')
    })
  }

  get isDark(): boolean {
    return this.theme === 'dark'
  }

  private setTheme(theme: Theme): void {
    if (theme === this.theme) return
    this.theme = theme
    this.apply()
  }

  private apply(): void {
    document.documentElement.setAttribute('data-theme', this.theme)
    applyChartScheme(this.theme)
  }
}

export const themeStore = new ThemeStore()
