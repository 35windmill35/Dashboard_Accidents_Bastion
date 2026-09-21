import { useNavigate } from 'react-router-dom'
import { accidentsStore } from '@/entities/accident/model/accidentsStore'
import { authStore } from '@/entities/user/model/authStore'
import styles from './DataErrorPage.module.css'

interface DataErrorPageProps {
  message?: string
  onRetry?: () => void
}

// Показывается через RequireAccidentsAccess, когда шаг 3 не отдал данные
// ни по одной базе — или когда шаг 2 не смог проверить право ни по одной
// базе (сеть/бэкенд), что не то же самое, что "нет доступа".
export function DataErrorPage({
  message = 'Не удалось загрузить данные ни по одной базе',
  onRetry = () => accidentsStore.reload(),
}: DataErrorPageProps) {
  const navigate = useNavigate()

  const handleLogout = () => {
    authStore.logout()
    navigate('/login')
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button type="button" onClick={onRetry}>
          Повторить
        </button>
        <button type="button" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  )
}
