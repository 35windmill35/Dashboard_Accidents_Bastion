import { useNavigate } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import styles from './NoAccessPage.module.css'

// Показывается через RequireAccidentsAccess, когда ни одна база не дала
// право на дашборд ДТП.
export function NoAccessPage() {
  const navigate = useNavigate()

  const handleLogout = () => {
    authStore.logout()
    navigate('/login')
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.message}>У вашей учётной записи нет доступа к дашборду ДТП</p>
      <button className={styles.logout} type="button" onClick={handleLogout}>
        Выйти
      </button>
    </div>
  )
}
