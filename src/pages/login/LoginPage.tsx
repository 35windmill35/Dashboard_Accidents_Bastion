import { useState, type ChangeEvent, type FormEvent } from 'react'
import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { formatPhoneInput } from '@/shared/lib/phoneMask'
import { PasswordInput } from '@/shared/ui/PasswordInput/PasswordInput'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import styles from './LoginPage.module.css'

// Регистрацию не делаем — у заказчика своя форма, поэтому ссылки на
// /register здесь нет.
//
// Оформление — по эталону: карточка с градиентом и тенью на фоне с синим
// свечением, логотип, узкий заголовок.
export const LoginPage = observer(function LoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneInput(e.target.value))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // login() сам запускает проверку прав по базам в фоне — переходим
    // сразу после успешного входа, а состояние загрузки/отказа доступа
    // покажет RequireAccidentsAccess.
    const success = await authStore.login(phone, password)
    if (success) {
      navigate('/')
    }
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <BrandLogo size={56} />
          <h1 className={styles.title}>Дашборд ДТП</h1>
          <span className={styles.subtitle}>Вход для сотрудников</span>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Телефон</span>
          <input
            className={styles.input}
            type="tel"
            inputMode="numeric"
            placeholder="+7 (___) ___-__-__"
            value={phone}
            onChange={handlePhoneChange}
            autoComplete="tel"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Пароль</span>
          <PasswordInput
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {authStore.sessionNotice && !authStore.loginError && (
          <p className={styles.notice} role="status">
            {authStore.sessionNotice}
          </p>
        )}

        {authStore.loginError && (
          <p className={styles.error} role="alert">
            {authStore.loginError}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={authStore.isLoggingIn}>
          {authStore.isLoggingIn ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  )
})
