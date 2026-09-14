import { useNavigate } from 'react-router-dom'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { authStore } from '@/entities/user/model/authStore'
import styles from './DataErrorPage.module.css'

// Показывается через RequireAccidentsAccess, когда шаг 3 не отдал данные
// ни по одной базе.
export function DataErrorPage() {
  const navigate = useNavigate()

  const handleLogout = () => {
    authStore.logout()
    navigate('/login')
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.message}>Не удалось загрузить данные ни по одной базе</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => accidentsStore.reload()}>
          Повторить
        </button>
        <button type="button" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  )
}
