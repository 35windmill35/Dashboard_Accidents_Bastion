import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import { useLocation } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { useFiltersUrlSync } from '@/features/filters-url-sync/useFiltersUrlSync'
import { DataStatusBanner } from '@/widgets/data-status-banner/DataStatusBanner'
import { AppSidebar } from './AppSidebar'
import { AppTopBar } from './AppTopBar'
import styles from './AppShell.module.css'

const SESSION_CHECK_INTERVAL_MS = 60 * 1000

interface AppShellProps {
  children: ReactNode
}

// Каркас защищённых экранов: сайдбар, шапка, баннер о полноте данных
export const AppShell = observer(function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  const { pathname } = useLocation()

  useFiltersUrlSync()

  // Только на смену экрана, не на смену фильтров
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    const id = window.setInterval(() => authStore.checkSessionExpiry(), SESSION_CHECK_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={styles.wrapper}>
      <AppSidebar isOpen={isSidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {isSidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <div className={styles.contentColumn}>
        <AppTopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className={styles.main}>
          <DataStatusBanner />
          {children}
        </main>
      </div>
    </div>
  )
})
