import type { ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import { IconGrid, IconBus, IconChart } from './icons'
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
export function AppSidebar({ isOpen, onNavigate }: AppSidebarProps) {
  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}>
        <span className={styles.logo}>ДТП</span>
        <div className={styles.brandName}>Дашборд ДТП</div>
      </div>

      <nav className={styles.nav}>
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
    </aside>
  )
}
