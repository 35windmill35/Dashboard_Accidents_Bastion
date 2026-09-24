import { useEffect, type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import { Navigate, useLocation } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { StatusScreen } from '@/shared/ui/StatusScreen/StatusScreen'
import { NoAccessPage } from '@/pages/no-access/NoAccessPage'
import { DataErrorPage } from '@/pages/data-error/DataErrorPage'
import { AppShell } from '@/widgets/app-shell/AppShell'

interface RequireAccidentsAccessProps {
  children?: ReactNode
}

// Guard для защищённых экранов, покрывает весь трёхшаговый сценарий
// инициализации: нет сессии — редирект на /login; шаг 2 (права по базам)
// не проверялся или идёт — скелетон; ни одной базы с доступом —
// NoAccessPage (или экран ошибки с повтором, если проверка прав упала по
// сети, а не вернула false); шаг 3 (данные) грузится — скелетон с
// прогрессом "Загружено баз N из M"; ни одна
// база не отдала данные — DataErrorPage; иначе — контент экрана. Частичный
// отказ шагов 2/3 контент не блокирует — баннер DataStatusBanner в AppShell.
//
// Сайдбар и шапка с фильтрами (AppShell) оборачивают только готовый
// контент — экраны загрузки/ошибки/отказа их не показывают; сами эти экраны
// — общий StatusScreen (карточка с логотипом, как экран входа).
export const RequireAccidentsAccess = observer(function RequireAccidentsAccess({
  children,
}: RequireAccidentsAccessProps) {
  const location = useLocation()

  useEffect(() => {
    // сессия истекла по времени, пока вкладка была закрыта/спала —
    // разлогиниваем с сообщением на экране входа
    authStore.checkSessionExpiry()
    if (authStore.rightsNeedCheck) {
      void authStore.checkAccidentsAccess()
    }
  })

  if (!authStore.isAuthenticated) {
    return <Navigate to={`/login${location.search}`} replace />
  }

  // Повторная проверка прав при уже известном результате (кнопка
  // "Повторить") экран не прячет — только самая первая.
  if (authStore.isLoggingIn || authStore.allowedDbIndexes === null) {
    return (
      <StatusScreen
        tone="loading"
        title="Проверяем доступ"
        message="Проверяем права на дашборд ДТП по каждой базе…"
        progress={null}
      />
    )
  }

  if (authStore.rightsCheckFailed) {
    return (
      <DataErrorPage
        message={`Не удалось проверить доступ к базам (${authStore.rightsCheckErrors.join(', ')}). Проверьте соединение и повторите.`}
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
        title="Загружаем данные"
        message={
          total > 0
            ? `Загружено баз ${accidentsStore.loadedCount} из ${total}`
            : 'Загружаем данные…'
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
