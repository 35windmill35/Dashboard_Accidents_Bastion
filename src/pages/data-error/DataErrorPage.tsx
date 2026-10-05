import { useNavigate } from 'react-router-dom'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { authStore } from '@/entities/user/model/authStore'
import { StatusScreen } from '@/shared/ui/StatusScreen/StatusScreen'
import { t } from '@/shared/i18n'

interface DataErrorPageProps {
  message?: string
  onRetry?: () => void
}

// Показывается через RequireAccidentsAccess, когда шаг 3 не отдал данные
// ни по одной базе — или когда шаг 2 не смог проверить право ни по одной
// базе (сеть/бэкенд), что не то же самое, что "нет доступа".
export function DataErrorPage({
  message = t('roadAccidents.access.dataErrorMessage'),
  onRetry = () => accidentsStore.reload(),
}: DataErrorPageProps) {
  const navigate = useNavigate()

  const handleLogout = () => {
    authStore.logout()
    navigate('/login')
  }

  return (
    <StatusScreen tone="error" title={t('roadAccidents.access.dataErrorTitle')} message={message}>
      <button type="button" onClick={onRetry}>
        {t('roadAccidents.common.retry')}
      </button>
      <button type="button" onClick={handleLogout}>
        {t('roadAccidents.common.logout')}
      </button>
    </StatusScreen>
  )
}
