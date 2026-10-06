import { useNavigate } from 'react-router-dom'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { authStore } from '@/entities/user/model/authStore'
import { StatusScreen } from '@/shared/ui/StatusScreen/StatusScreen'
import { t } from '@/shared/i18n'

interface DataErrorPageProps {
  message?: string
  onRetry?: () => void
}

// Данные не загрузились ни по одной базе или не удалось проверить права
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
