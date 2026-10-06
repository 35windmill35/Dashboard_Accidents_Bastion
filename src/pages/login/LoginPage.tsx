import { useState, type ChangeEvent, type FormEvent } from 'react'
import { observer } from 'mobx-react-lite'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { authStore } from '@/entities/user/model/authStore'
import { formatPhoneInput } from '@/shared/lib/phoneMask'
import { PasswordInput } from '@/shared/ui/PasswordInput/PasswordInput'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { t } from '@/shared/i18n'
import styles from './LoginPage.module.css'

export const LoginPage = observer(function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneInput(e.target.value))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const success = await authStore.login(phone, password)
    // replace — «Назад» не возвращает на форму входа
    if (success) {
      navigate({ pathname: '/', search: location.search }, { replace: true })
    }
  }

  if (authStore.isAuthenticated && !authStore.isLoggingIn) {
    return <Navigate to={{ pathname: '/', search: location.search }} replace />
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <BrandLogo size={56} />
          <h1 className={styles.title}>{t('roadAccidents.appTitle')}</h1>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>{t('phone')}</span>
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
          <span className={styles.label}>{t('password')}</span>
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
          {authStore.isLoggingIn ? t('logining') : t('login')}
        </button>
      </form>
    </div>
  )
})
