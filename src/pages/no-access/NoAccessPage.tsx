import { useNavigate } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { StatusScreen } from '@/shared/ui/StatusScreen/StatusScreen'

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
      title="Нет доступа"
      message="У вашей учётной записи нет доступа к дашборду ДТП. Обратитесь к администратору, чтобы получить право."
    >
      <button type="button" onClick={handleLogout}>
        Выйти
      </button>
    </StatusScreen>
  )
}
