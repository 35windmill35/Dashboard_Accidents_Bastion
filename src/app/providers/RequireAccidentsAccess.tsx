import { useEffect, type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import { Navigate, useLocation } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { StatusScreen } from '@/shared/ui/StatusScreen/StatusScreen'
import { NoAccessPage } from '@/pages/no-access/NoAccessPage'
import { DataErrorPage } from '@/pages/data-error/DataErrorPage'
import { AppShell } from '@/widgets/app-shell/AppShell'
import { t } from '@/shared/i18n'

interface RequireAccidentsAccessProps {
  children?: ReactNode
}

// Guard защищённых экранов: сессия → права по базам → загрузка данных.
// Частичный отказ баз не блокирует экран — его показывает DataStatusBanner.
export const RequireAccidentsAccess = observer(function RequireAccidentsAccess({
  children,
}: RequireAccidentsAccessProps) {
  const location = useLocation()

  // Сессия могла истечь, пока вкладка спала
  useEffect(() => {
    authStore.checkSessionExpiry()
  }, [location.pathname])

  const rightsNeedCheck = authStore.rightsNeedCheck
  useEffect(() => {
    if (rightsNeedCheck) void authStore.checkAccidentsAccess()
  }, [rightsNeedCheck])

  if (!authStore.isAuthenticated) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  // Повторная проверка прав экран не прячет
  if (authStore.isLoggingIn || authStore.allowedDbIndexes === null) {
    return (
      <StatusScreen
        tone="loading"
        title={t('roadAccidents.access.checkingTitle')}
        message={t('roadAccidents.access.checkingMessage')}
        progress={null}
      />
    )
  }

  if (authStore.rightsCheckFailed) {
    return (
      <DataErrorPage
        message={t('roadAccidents.access.checkFailed', {
          bases: authStore.rightsCheckErrors.join(', '),
        })}
        onRetry={() => void accidentsStore.retry()}
      />
    )
  }

  if (!authStore.hasAccidentsAccess) {
    return <NoAccessPage />
  }

  if (accidentsStore.isInitialLoad) {
    const total = accidentsStore.totalCount
    return (
      <StatusScreen
        tone="loading"
        title={t('roadAccidents.access.loadingTitle')}
        message={
          total > 0
            ? t('roadAccidents.common.loadedBases', {
                count: accidentsStore.loadedCount,
                total: total,
              })
            : t('roadAccidents.access.loadingMessage')
        }
        progress={total > 0 ? accidentsStore.loadedCount / total : null}
      />
    )
  }

  if (accidentsStore.status === 'failed') {
    return <DataErrorPage />
  }

  return <AppShell>{children}</AppShell>
})
