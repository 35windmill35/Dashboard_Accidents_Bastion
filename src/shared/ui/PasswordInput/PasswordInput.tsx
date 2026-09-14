import { useState, type InputHTMLAttributes } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'
import styles from './PasswordInput.module.css'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'style'> {
  className?: string
}

// Поле пароля с кнопкой показать/скрыть.
export function PasswordInput({ className, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={styles.wrapper}>
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        className={className}
        style={{ paddingRight: 40, width: '100%' }}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}
