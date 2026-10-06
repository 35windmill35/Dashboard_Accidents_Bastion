// DB_GUID из ссылки сохраняется, чтобы не потеряться при переходе на /login
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
    try {
      localStorage.setItem(DB_GUID_STORAGE_KEY, fromUrl)
    } catch {
      // хранилище недоступно
    }
    return fromUrl
  }

  try {
    return localStorage.getItem(DB_GUID_STORAGE_KEY)
  } catch {
    return null
  }
}
