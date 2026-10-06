import { getWithBasicAuth, getAuthorized } from '@/shared/api/httpClient'
import { APP_CODE, ACCIDENTS_RIGHT_CODE } from '@/shared/config/api'

export interface Firm {
  DBIndex?: number
  FIRM_SHORT_NAME?: string
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

// DB_GUID передаётся и параметром, и заголовком — бэкенд читает то одно, то другое
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

export async function checkAccidentsRight(dbIndex: number, signal?: AbortSignal): Promise<boolean> {
  const { data } = await getAuthorized<Record<string, boolean>>(
    `/api-v2/SpecialRequests/UserRight/${ACCIDENTS_RIGHT_CODE}`,
    { params: { DBIndex: dbIndex }, signal }
  )

  return Boolean(data?.[ACCIDENTS_RIGHT_CODE])
}
