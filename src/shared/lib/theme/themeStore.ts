import { makeAutoObservable } from 'mobx'
import { applyChartScheme } from '@/shared/lib/chartColors'

export type Theme = 'dark' | 'light'

const LIGHT_QUERY = '(prefers-color-scheme: light)'

// Остаток ручного выбора темы из старой сборки
const LEGACY_STORAGE_KEY = 'dtp-theme'

function readSystemTheme(): Theme {
  return window.matchMedia?.(LIGHT_QUERY).matches ? 'light' : 'dark'
}

// Тема — только из prefers-color-scheme, без переключателя.
// Без CSS-переходов: плавная смена цветов на графиках подтормаживала.
class ThemeStore {
  theme: Theme

  constructor() {
    this.theme = readSystemTheme()
    makeAutoObservable(this)

    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // хранилище недоступно
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
