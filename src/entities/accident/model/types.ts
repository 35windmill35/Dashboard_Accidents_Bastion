// Поля элемента массива DashboardAccidentStat.data. Ответ отдаётся целиком,
// без фильтров и сортировки — весь отбор делается на клиенте (см.
// accidentsStore/filtersStore). DB_INDEX в API нет, он добавляется при
// склейке баз на шаге 3 инициализации.
export interface AccidentRow {
  ACCIDENT_ID: number
  ACCIDENT_DATE: string
  ACCIDENT_TIME?: string | null

  DRIVER_ID?: number | null
  DRIVER_NAME?: string | null

  CAR_ID?: number | null
  GARAGE_NUM?: string | null
  CAR_MAKE_MODEL?: string | null
  MARK?: string | null
  MODEL_NAME?: string | null
  SUBMODEL?: string | null
  FUEL_NAME?: string | null
  CAR_OWNER?: string | null

  CURRENCY_CODE?: string | null
  CURRENCY_NAME?: string | null

  MOTORCADE_ID?: number | null
  MOTORCADE_NAME?: string | null

  ROUTE_ID?: number | null
  ROUTE_NAME?: string | null

  ACCIDENT_ADDRESS?: string | null

  INSURANCE_COMPANY_ID?: number | null
  INSURANCE_COMPANY_NAME?: string | null
  ACCIDENT_INSURANCE_CASE_NUMBER?: string | null
  ACCIDENT_INSURANCE_CASE_DATE?: string | null

  ACCIDENT_IS_CASE_CLOSED?: boolean
  ACCIDENT_STATUS_ID?: number | null
  ACCIDENT_STATUS_NAME?: string | null

  ACCIDENT_CAUSE_ID?: number | null
  ACCIDENT_CAUSE_NAME?: string | null
  ACCIDENT_CAUSER_NAME?: string | null

  ACCIDENT_DAMAGE?: number | null
  ACCIDENT_COMPENSATED_DAMAGE?: number | null

  ACCIDENT_DETAILS?: string | null
  ACCIDENT_COMMENT?: string | null
  ACCIDENT_VICTIM?: string | null

  // добавляется клиентом при склейке результатов по базам
  DB_INDEX: number

  [key: string]: unknown
}
