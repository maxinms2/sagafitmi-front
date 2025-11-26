import { getToken } from './storage'

declare global {
  interface Window {
    __ENV__?: { VITE_API_BASE_URL?: string }
  }
}

// Prefer runtime config injected into `window.__ENV__.VITE_API_BASE_URL` (set by Docker/nginx),
// then fallback to build-time Vite env `import.meta.env.VITE_API_BASE_URL`,
// finally fallback to a local default.
export const API_BASE =
  (typeof window !== 'undefined' && window.__ENV__?.VITE_API_BASE_URL) ||
  (import.meta.env.VITE_API_BASE_URL as string) ||
  'http://localhost:8081'

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
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      // respuesta no-JSON (ej. "Invalid credentials") -> mantener el texto crudo
      data = text
    }
  }

  if (!res.ok) {
    const message = (data && typeof data === 'object' ? data.message : data) || res.statusText || 'Request failed'
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

export interface CartItemDTO {
  id: number
  userId: number
  product: Product
  quantity: number
  currentPrice: number
}

export interface CartItemCreateRequest {
  userId: number
  productId: number
  quantity: number
}

export interface OrderItem {
  id: number
  product: Product
  quantity: number
  price: number
}

export interface OrderDTO {
  id: number
  userId: number
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
}

/** Busca un usuario por email */
export function getUserByEmail(email: string) {
  return get<UserResponse>('/api/users/by-email', { email })
}


/** Añade un item al carrito especificando userId */
export function addToCart(body: CartItemCreateRequest) {
  return post<CartItemDTO>('/api/cart', body)
}

/** Obtiene el carrito de un usuario por userId */
export function getCartByUserId(userId: number) {
  return get<CartItemDTO[]>(`/api/cart/${userId}`)
}
/** Elimina un item del carrito por su id (usa puerto 8082) */
export async function deleteCartItem(itemId: number): Promise<void> {
  const url = `${API_BASE}/api/cart/${itemId}`
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { method: 'DELETE', headers })

  // 204 No Content -> éxito silencioso
  if (res.status === 204) return

  const text = await res.text()
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      data = text
    }
  }

  if (!res.ok) {
    const message = (data && typeof data === 'object' ? data.message : data) || res.statusText || 'Request failed'
    throw new Error(`${res.status} ${message}`)
  }

  return
}
/** Actualiza la cantidad de un item del carrito. Request: { quantity }. Response: CartItemDTO */
export async function updateCartItemQuantity(itemId: number, quantity: number): Promise<CartItemDTO> {
  const url = `${API_BASE}/api/cart/${itemId}`
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ quantity }) })

  const text = await res.text()
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      data = text
    }
  }

  if (!res.ok) {
    const message = (data && typeof data === 'object' ? data.message : data) || res.statusText || 'Request failed'
    throw new Error(`${res.status} ${message}`)
  }

  return data as CartItemDTO
}

/** Crea una orden para el usuario indicado. Response: OrderDTO */
export async function createOrderForUser(userId: number): Promise<OrderDTO> {
  const url = `${API_BASE}/api/orders/user/${userId}`
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({}) })

  const text = await res.text()
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      data = text
    }
  }

  if (!res.ok) {
    const message = (data && typeof data === 'object' ? data.message : data) || res.statusText || 'Request failed'
    throw new Error(`${res.status} ${message}`)
  }

  return data as OrderDTO
}
/** Añade al carrito resolviendo userId a partir del email almacenado */
export async function addToCartByUserEmail(email: string, productId: number, quantity: number) {
  const user = await getUserByEmail(email)
  return addToCart({ userId: user.id, productId, quantity })
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
  let data: any = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      data = text
    }
  }

  if (!res.ok) {
    const message = (data && typeof data === 'object' ? data.message : data) || res.statusText || 'Request failed'
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
