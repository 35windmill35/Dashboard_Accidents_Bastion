import { getWithBasicAuth, getAuthorized } from '@/shared/api/httpClient'
import { APP_CODE, ACCIDENTS_RIGHT_CODE } from '@/shared/config/api'

export interface Firm {
  DBIndex?: number
  FIRM_SHORT_NAME?: string
  [key: string]: unknown
}

interface LoginAppUserArgs {
  phone: string
  password: string
  dbGuid: string | null
}

interface LoginAppUserResult {
  firms: Firm[]
  sessionId?: string
  remaining?: number
}

// Ответ — массив баз, доступных пользователю. DBIndex, который принимают
// остальные методы, — это порядковый индекс элемента в этом массиве, а не
// PFIRM_ID.
//
// DB_GUID отправляется и query-параметром, и заголовком одновременно —
// бэкенд на практике смотрит то в один, то в другой.
export async function loginAppUser({
  phone,
  password,
  dbGuid,
}: LoginAppUserArgs): Promise<LoginAppUserResult> {
  const { data, sessionId, remaining } = await getWithBasicAuth<Firm[]>(
    '/api-v2/auth/loginAppUser',
    {
      username: phone,
      password,
      params: {
        AppCode: APP_CODE,
        Params: { DB_GUID: dbGuid },
      },
      headers: dbGuid ? { Params: JSON.stringify({ DB_GUID: dbGuid }) } : undefined,
    }
  )

  return { firms: data, sessionId, remaining }
}

// Проверка права на дашборд ДТП по одной базе. Вызывается для каждой
// базы из ответа loginAppUser — база попадает в рабочий список только при
// Dashboard_Accidents === true.
export async function checkAccidentsRight(dbIndex: number): Promise<boolean> {
  const { data } = await getAuthorized<Record<string, boolean>>(
    `/api-v2/SpecialRequests/UserRight/${ACCIDENTS_RIGHT_CODE}`,
    { params: { DBIndex: dbIndex } }
  )

  return Boolean(data?.[ACCIDENTS_RIGHT_CODE])
}
