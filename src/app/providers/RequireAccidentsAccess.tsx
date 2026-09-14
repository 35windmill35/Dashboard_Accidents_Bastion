import { useEffect, type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import { Navigate, useLocation } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton'
import { NoAccessPage } from '@/pages/no-access/NoAccessPage'
import styles from './RequireAccidentsAccess.module.css'

interface RequireAccidentsAccessProps {
  children?: ReactNode
}

// Guard для защищённых экранов: нет сессии — редирект на /login; права по
// базам ещё не проверялись или проверка идёт — скелетон; ни одной базы с
// доступом — NoAccessPage; иначе — контент экрана.
//
// Сайдбар и шапка с фильтрами сюда не добавлены — это отдельный виджет
// уровня макета экранов.
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

  return <>{children}</>
})
