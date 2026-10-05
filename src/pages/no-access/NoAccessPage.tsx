import { useNavigate } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { StatusScreen } from '@/shared/ui/StatusScreen/StatusScreen'
import { t } from '@/shared/i18n'

// Показывается через RequireAccidentsAccess, когда ни одна база не дала
// право на дашборд ДТП.
export function NoAccessPage() {
  const navigate = useNavigate()

  const handleLogout = () => {
    authStore.logout()
    navigate('/login')
  }

  return (
    <StatusScreen
      tone="locked"
      title={t('roadAccidents.access.noAccessTitle')}
      message={t('roadAccidents.access.noAccessMessage')}
    >
      <button type="button" onClick={handleLogout}>
        {t('roadAccidents.common.logout')}
      </button>
    </StatusScreen>
  )
}
