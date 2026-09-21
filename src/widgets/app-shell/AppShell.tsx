import { useEffect, useState, type ReactNode } from 'react'
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

// Общий каркас трёх защищённых экранов: сайдбар + шапка с фильтрами +
// баннер о полноте данных. Сайдбар открыт по умолчанию, на мобильном —
// оверлей, закрывающийся по клику на подложку или переходу по ссылке меню.
//
// Здесь же: синхронизация фильтров с адресной строкой и периодическая
// проверка срока сессии (10 ч / 30 мин без запросов, ТЗ §2.3) — истёкшая
// сессия разлогинивает, guard уводит на экран входа.
export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  useFiltersUrlSync()

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
}
