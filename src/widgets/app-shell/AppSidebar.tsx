import type { ComponentType, CSSProperties } from 'react'
import { observer } from 'mobx-react-lite'
import { NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { IconGrid, IconBus, IconChart, IconLogout } from './icons'
import styles from './AppSidebar.module.css'

interface NavItem {
  to: string
  label: string
  end?: boolean
  Icon: ComponentType
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Обзор', end: true, Icon: IconGrid },
  { to: '/motorcade', label: 'Статистика по автоколонне', Icon: IconBus },
  { to: '/analytics', label: 'Аналитика', Icon: IconChart },
]

interface AppSidebarProps {
  isOpen: boolean
  onNavigate: () => void
}

// Выдвигающееся меню: на десктопе — фиксированная колонка, на мобильном —
// оверлей поверх контента, открывается/закрывается кнопкой в шапке
// (см. AppShell).
//
// Как в эталоне: подсветка активного раздела — одна плашка, которая
// «переезжает» к выбранному пункту (а не фон на самой ссылке). Переключателя
// темы из эталона нет — по ТЗ тема берётся из настроек браузера
// (shared/lib/theme/themeStore). Внизу — «Выйти» (в эталоне её нет,
// перенесена сюда из шапки).
export const AppSidebar = observer(function AppSidebar({ isOpen, onNavigate }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const activeIndex = NAV_ITEMS.findIndex(
    (item) => matchPath({ path: item.to, end: item.end ?? false }, location.pathname) !== null
  )

  const handleLogout = () => {
    authStore.logout()
    navigate('/login')
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}>
        <BrandLogo size={40} />
        <div className={styles.brandText}>
          <span className={styles.brandName}>Дашборд ДТП</span>
          <span className={styles.brandCaption}>Аналитика аварийности</span>
        </div>
      </div>

      <span className={styles.sectionLabel}>Разделы</span>

      <nav className={styles.nav} aria-label="Разделы">
        {activeIndex >= 0 && (
          <span
            className={styles.indicator}
            style={{ '--active-index': activeIndex } as CSSProperties}
            aria-hidden="true"
          />
        )}
        {NAV_ITEMS.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <button
          type="button"
          className={`${styles.footerButton} ${styles.logout}`}
          onClick={handleLogout}
        >
          <span className={styles.footerButtonLabel}>
            <IconLogout />
            <span>Выйти</span>
          </span>
        </button>
      </div>
    </aside>
  )
})
