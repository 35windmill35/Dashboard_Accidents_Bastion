// DB_GUID приходит в адресной строке (до хэша или внутри hash-query) и
// запоминается в localStorage, чтобы не потеряться при переходе на /login
// без этого параметра.
//
// Ключ отдельный от дашборда «Точки роста» — см. shared/api/session.ts.
const DB_GUID_STORAGE_KEY = 'road_accidents_db_guid'

function readFromLocation(): string | null {
  const fromSearch = new URLSearchParams(window.location.search || '').get('DB_GUID')
  if (fromSearch) return fromSearch

  const hash = window.location.hash || ''
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return null

  const params = new URLSearchParams(hash.slice(queryIndex + 1))
  return params.get('DB_GUID')
}

export function getDbGuidFromUrl(): string | null {
  const fromUrl = readFromLocation()

  if (fromUrl) {
    localStorage.setItem(DB_GUID_STORAGE_KEY, fromUrl)
    return fromUrl
  }

  return localStorage.getItem(DB_GUID_STORAGE_KEY)
}
