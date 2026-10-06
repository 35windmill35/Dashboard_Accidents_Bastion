import { t } from '@/shared/i18n'
import { ApiError } from './httpClient'

const STATUS_MESSAGES: Record<number, string> = {
  400: t('roadAccidents.error.status.400'),
  401: t('roadAccidents.error.status.401'),
  403: t('roadAccidents.error.status.403'),
  404: t('roadAccidents.error.status.404'),
  408: t('roadAccidents.error.status.timeout'),
  429: t('roadAccidents.error.status.429'),
  500: t('roadAccidents.error.status.500'),
  502: t('roadAccidents.error.status.unavailable'),
  503: t('roadAccidents.error.status.unavailable'),
  504: t('roadAccidents.error.status.timeout'),
}

const RAW_HTTP_MESSAGE = /^HTTP \d+$/

export interface ErrorMessageOptions {
  fallback?: string
  statusMessages?: Record<number, string>
}

export function getErrorMessage(err: unknown, options: ErrorMessageOptions = {}): string {
  const { fallback = t('error.unknown'), statusMessages = {} } = options

  if (!err) return fallback

  if (err instanceof TypeError) {
    return t('err.internet.off')
  }

  const status = err instanceof ApiError ? err.status : (err as { status?: number })?.status

  if (status && statusMessages[status]) return statusMessages[status]
  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]

  const message = (err as { message?: string })?.message
  if (message && !RAW_HTTP_MESSAGE.test(message)) return message

  return fallback
}
