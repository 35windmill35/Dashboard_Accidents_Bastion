import type { ComponentType, CSSProperties } from 'react'
import { observer } from 'mobx-react-lite'
import { NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { t } from '@/shared/i18n'
import { IconGrid, IconBus, IconChart, IconLogout } from './icons'
import styles from './AppSidebar.module.css'

interface NavItem {
  to: string
  label: string
  end?: boolean
  Icon: ComponentType
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: t('roadAccidents.nav.overview'), end: true, Icon: IconGrid },
  { to: '/motorcade', label: t('roadAccidents.nav.motorcade'), Icon: IconBus },
  { to: '/analytics', label: t('roadAccidents.nav.analytics'), Icon: IconChart },
]

interface AppSidebarProps {
  isOpen: boolean
  onNavigate: () => void
}

// Активный пункт — одна плашка, которая переезжает между пунктами
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
          <span className={styles.brandName}>{t('roadAccidents.appTitle')}</span>
          <span className={styles.brandCaption}>{t('roadAccidents.appSubtitle')}</span>
        </div>
      </div>

      <span className={styles.sectionLabel}>{t('roadAccidents.nav.sections')}</span>

      <nav className={styles.nav} aria-label={t('roadAccidents.nav.sections')}>
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
            <span>{t('roadAccidents.common.logout')}</span>
          </span>
        </button>
      </div>
    </aside>
  )
})
