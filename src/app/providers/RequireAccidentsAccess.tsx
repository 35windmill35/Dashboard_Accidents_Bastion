import { useEffect, type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import { Navigate, useLocation } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton'
import { NoAccessPage } from '@/pages/no-access/NoAccessPage'
import { DataErrorPage } from '@/pages/data-error/DataErrorPage'
import { AppShell } from '@/widgets/app-shell/AppShell'
import styles from './RequireAccidentsAccess.module.css'

interface RequireAccidentsAccessProps {
  children?: ReactNode
}

// Guard для защищённых экранов, покрывает весь трёхшаговый сценарий
// инициализации: нет сессии — редирект на /login; шаг 2 (права по базам)
// не проверялся или идёт — скелетон; ни одной базы с доступом —
// NoAccessPage; шаг 3 (данные) грузится — скелетон с прогрессом; ни одна
// база не отдала данные — DataErrorPage; иначе — контент экрана. Частичный
// отказ шага 3 (accidentsStore.hasPartialFailure) контент не блокирует,
// баннер об этом — отдельный виджет уровня экранов.
//
// Сайдбар и шапка с фильтрами (AppShell) оборачивают только готовый
// контент — экраны загрузки/ошибки/отказа их не показывают.
export const RequireAccidentsAccess = observer(function RequireAccidentsAccess({
  children,
}: RequireAccidentsAccessProps) {
  const location = useLocation()

  useEffect(() => {
    if (authStore.rightsNeedCheck) {
      void authStore.checkAccidentsAccess()
    }
  })

  if (!authStore.isAuthenticated) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  if (authStore.isInitializing || authStore.allowedDbIndexes === null) {
    return (
      <div className={styles.loading}>
        <Skeleton height={32} count={4} />
      </div>
    )
  }

  if (!authStore.hasAccidentsAccess) {
    return <NoAccessPage />
  }

  if (accidentsStore.isInitialLoad) {
    return (
      <div className={styles.loading}>
        <Skeleton height={32} count={4} />
        {accidentsStore.totalCount > 0 && (
          <p className={styles.progress}>
            Загружено баз {accidentsStore.loadedCount} из {accidentsStore.totalCount}
          </p>
        )}
      </div>
    )
  }

  if (accidentsStore.status === 'failed') {
    return <DataErrorPage />
  }

  return <AppShell>{children}</AppShell>
})
