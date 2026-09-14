import { ApiError } from './httpClient'

// Тексты по умолчанию для случаев, когда у ошибки нет собственного
// сообщения от сервера.
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Некорректный запрос к серверу',
  401: 'Сессия истекла или доступ запрещён — попробуйте войти заново',
  403: 'Нет доступа к этим данным',
  404: 'Данные не найдены',
  408: 'Сервер долго не отвечает — попробуйте ещё раз',
  429: 'Слишком много запросов подряд — подождите немного и повторите',
  500: 'Ошибка на сервере, попробуйте позже',
  502: 'Сервер временно недоступен',
  503: 'Сервер временно недоступен',
  504: 'Сервер долго не отвечает — попробуйте ещё раз',
}

const RAW_HTTP_MESSAGE = /^HTTP \d+$/

export interface ErrorMessageOptions {
  fallback?: string
  statusMessages?: Record<number, string>
}

// Превращает пойманную ошибку в понятный пользователю текст.
export function getErrorMessage(err: unknown, options: ErrorMessageOptions = {}): string {
  const { fallback = 'Что-то пошло не так, попробуйте ещё раз', statusMessages = {} } = options

  if (!err) return fallback

  if (err instanceof TypeError) {
    return 'Нет соединения с сервером. Проверьте интернет и попробуйте снова'
  }

  const status = err instanceof ApiError ? err.status : (err as { status?: number })?.status

  if (status && statusMessages[status]) return statusMessages[status]
  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]

  const message = (err as { message?: string })?.message
  if (message && !RAW_HTTP_MESSAGE.test(message)) return message

  return fallback
}
