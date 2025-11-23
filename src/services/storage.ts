const TOKEN_KEY = 'sagafitmi_auth_token'

export function setToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch (e) {
    // sessionStorage puede fallar en algunos entornos; logueamos y seguimos
    console.warn('No se pudo guardar token en sessionStorage', e)
  }
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch (e) {
    console.warn('No se pudo leer token de sessionStorage', e)
    return null
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch (e) {
    console.warn('No se pudo eliminar token de sessionStorage', e)
  }
}

export default { setToken, getToken, clearToken }
