import { getToken } from './storage'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080'

export async function post<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = data?.message || res.statusText || 'Request failed'
    throw new Error(`${res.status} ${message}`)
  }

  return data as T
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  mainImageUrl: string | null
}

export interface PaginatedResponse<T> {
  content: T[]
  pageable?: any
  last?: boolean
  totalElements?: number
  totalPages?: number
  first?: boolean
  size?: number
  number?: number
  sort?: any
  numberOfElements?: number
  empty?: boolean
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
}

export interface UserResponse {
  id: number
  name: string
  email: string
  role: string
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const query = params
    ? Object.entries(params)
        // Permitimos cadenas vacías ('') porque el backend puede requerirlas;
        // sólo filtramos undefined y null.
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''

  const url = `${API_BASE}${path}${query ? `?${query}` : ''}`
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { headers })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = data?.message || res.statusText || 'Request failed'
    throw new Error(`${res.status} ${message}`)
  }

  return data as T
}

/**
 * Busca productos paginados.
 * Parámetros opcionales: `description`, `name`, `page`, `pagesize`.
 * Ejemplo:
 * const resp = await searchProducts({ name: 'playera', page: 0, pagesize: 10 })
 */
export function searchProducts(params: { description?: string; name?: string; page?: number; pagesize?: number }) {
  return get<PaginatedResponse<Product>>('/api/products/search', params)
}

/**
 * Crea un usuario.
 * Request: { name, email, password }
 * Response: { id, name, email, role }
 */
export function createUser(body: CreateUserRequest) {
  return post<UserResponse>('/api/users', body)
}
