import { getToken } from './storage'

function base64UrlDecode(input: string) {
  // replace url-safe chars
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  // pad with '='
  const pad = input.length % 4
  if (pad === 2) input += '=='
  else if (pad === 3) input += '='
  try {
    // atob is available in browsers
    return decodeURIComponent(escape(atob(input)))
  } catch (e) {
    try {
      return atob(input)
    } catch (e2) {
      return ''
    }
  }
}

export function parseJwtPayload(token?: string | null) {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
    const json = base64UrlDecode(payload)
    return JSON.parse(json)
  } catch (e) {
    console.warn('Failed to parse JWT payload', e)
    return null
  }
}

export function getRolesFromStoredToken(): string[] {
  const token = getToken()
  const payload = parseJwtPayload(token)
  if (!payload) return []

  // Try common claim names
  if (Array.isArray(payload.roles)) return payload.roles
  if (Array.isArray(payload.authorities)) return payload.authorities
  if (typeof payload.role === 'string') return [payload.role]
  if (typeof payload.roles === 'string') return payload.roles.split(',').map((s: string) => s.trim())
  // scope sometimes contains space separated roles
  if (typeof payload.scope === 'string') return payload.scope.split(' ').map((s: string) => s.trim())

  return []
}

export function hasRole(role: string) {
  const roles = getRolesFromStoredToken()
  if (!roles) return false
  return roles.some(r => r === role || r === `ROLE_${role}` || r === role.toUpperCase())
}

export function isAdmin() {
  return hasRole('ADMIN')
}

export default { parseJwtPayload, getRolesFromStoredToken, hasRole, isAdmin }
