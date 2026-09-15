import { useState, type ReactNode } from 'react'
import { AppSidebar } from './AppSidebar'
import { AppTopBar } from './AppTopBar'
import styles from './AppShell.module.css'

interface AppShellProps {
  children: ReactNode
}

// Общий каркас трёх защищённых экранов: сайдбар + шапка с фильтрами.
// Сайдбар открыт по умолчанию, на мобильном — оверлей, закрывающийся по
// клику на подложку или переходу по ссылке меню.
export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={styles.wrapper}>
      <AppSidebar isOpen={isSidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {isSidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <div className={styles.contentColumn}>
        <AppTopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
