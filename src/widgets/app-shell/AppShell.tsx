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

// Общий каркас трёх защищённых экранов: сайдбар + шапка с фильтрами +
// баннер о полноте данных. Сайдбар открыт по умолчанию, на мобильном —
// оверлей, закрывающийся по клику на подложку или переходу по ссылке меню.
//
// Здесь же: прокрутка к началу при смене экрана, синхронизация фильтров с
// адресной строкой и периодическая
// проверка срока сессии (10 ч / 30 мин без запросов) — истёкшая
// сессия разлогинивает, guard уводит на экран входа.
export const AppShell = observer(function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  const { pathname } = useLocation()

  useFiltersUrlSync()

  // Каждый экран открывается сверху: без этого браузер сохраняет прокрутку
  // предыдущего экрана. Реагируем только на смену экрана (pathname), а не
  // на смену фильтров в query-строке — иначе выбор периода сбрасывал бы
  // прокрутку. useLayoutEffect — до отрисовки, без мигания старой позиции.
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
