const TOKEN_KEY = 'sagafitmi_auth_token'
const USER_KEY = 'sagafitmi_user'

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

// User helpers: guardamos un string (email o nombre) para mostrar en la UI
export function setUser(user: string) {
  try {
    sessionStorage.setItem(USER_KEY, user)
  } catch (e) {
    console.warn('No se pudo guardar usuario en sessionStorage', e)
  }
}

export function getUser(): string | null {
  try {
    return sessionStorage.getItem(USER_KEY)
  } catch (e) {
    console.warn('No se pudo leer usuario de sessionStorage', e)
    return null
  }
}

export function clearUser() {
  try {
    sessionStorage.removeItem(USER_KEY)
  } catch (e) {
    console.warn('No se pudo eliminar usuario de sessionStorage', e)
  }
}

export default { setToken, getToken, clearToken, setUser, getUser, clearUser }
