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

/** Busca un usuario por id */
export function getUserById(userId: number) {
  return get<UserResponse>(`/api/users/${userId}`)
}

/** Añade un item al carrito especificando userId */
export function addToCart(body: CartItemCreateRequest) {
  return post<CartItemDTO>('/api/cart', body)
}

/** Obtiene el carrito de un usuario por userId */
export function getCartByUserId(userId: number) {
  return get<CartItemDTO[]>(`/api/cart/${userId}`)
}
/** Obtiene items del carrito que tienen desajuste de precio para un `userId` */
export function getCartPriceMismatch(userId: number) {
  return get<CartItemDTO[]>(`/api/cart/price-mismatch/${userId}`)
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
/** Obtiene una orden por su id. Response: OrderDTO */
export function getOrderById(orderId: number) {
  return get<OrderDTO>(`/api/orders/${orderId}`)
}

/** Actualiza el estado de una orden. URL: PUT /api/orders/{orderId}/status/{status} */
export async function updateOrderStatus(orderId: number, status: string): Promise<OrderDTO> {
  const url = `${API_BASE}/api/orders/${orderId}/status/${encodeURIComponent(status)}`
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { method: 'PUT', headers })

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
 * Formatea una `Date` o cadena en `yyyy-MM-dd` para el backend.
 */
function formatDateParam(d?: string | Date) {
  if (!d) return undefined
  if (typeof d === 'string') return d
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Obtiene órdenes paginadas. Parámetros:
 * - `startDate`/`endDate`: string (yyyy-MM-dd) o `Date`
 * - `status`: filtro por estado (ej. "NEW")
 * - `page` y `size`: paginación
 * Response: `PaginatedResponse<OrderDTO>`
 */
export function getOrders(params: {
  startDate?: string | Date
  endDate?: string | Date
  status?: string
  page?: number
  size?: number
}) {
  const q: Record<string, unknown> = {}
  if (params.startDate) q.startDate = formatDateParam(params.startDate)
  if (params.endDate) q.endDate = formatDateParam(params.endDate)
  if (params.status) q.status = params.status
  if (typeof params.page === 'number') q.page = params.page
  if (typeof params.size === 'number') q.size = params.size

  return get<PaginatedResponse<OrderDTO>>('/api/orders', q)
}

/**
 * Crea un producto.
 * Request: { name, description, price }
 * Response: `Product` (puede incluir `id` y `mainImageUrl` según el backend)
 */
export function createProduct(body: { name: string; description: string; price: number }) {
  return post<Product>('/api/products', body)
}

/** Actualiza un producto por id. Request: ProductDTO parcial/total. Response: ProductDTO o null si no existe o validación falla */
export async function updateProduct(id: number, body: Partial<Product>) {
  const url = `${API_BASE}/api/products/${id}`
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) })
  const text = await res.text()
  let data: any = null
  if (text) {
    try { data = JSON.parse(text) } catch (e) { data = text }
  }
  if (!res.ok) {
    const message = (data && typeof data === 'object' ? data.message : data) || res.statusText || 'Request failed'
    throw new Error(`${res.status} ${message}`)
  }
  return data as Product | null
}

/** Elimina un producto por id. URL fija en puerto 8080. Response: 204 No Content */
export async function deleteProduct(id: number): Promise<void> {
  const url = `${API_BASE}/api/products/${id}`
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { method: 'DELETE', headers })

  // 204 No Content -> éxito silencioso
  if (res.status === 204) return

  const text = await res.text()
  let data: any = null
  if (text) {
    try { data = JSON.parse(text) } catch (e) { data = text }
  }

  if (!res.ok) {
    const message = (data && typeof data === 'object' ? data.message : data) || res.statusText || 'Request failed'
    throw new Error(`${res.status} ${message}`)
  }

  return
}

/**
 * Crea un usuario.
 * Request: { name, email, password }
 * Response: { id, name, email, role }
 */
export function createUser(body: CreateUserRequest) {
  return post<UserResponse>('/api/users', body)
}

/**
 * Sube una imagen para un producto.
 * Endpoint: POST {API_BASE}/api/images/{productId}?mainImage=true
 * Request: multipart/form-data con campo `file` (archivo)
 * Response: 201 Created -> resuelve void, en caso de error lanza excepción con mensaje.
 */
export async function uploadProductImage(productId: number, file: File | Blob, mainImage = true): Promise<void> {
  const url = `${API_BASE}/api/images/${productId}?mainImage=${mainImage}`
  const token = getToken()

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const form = new FormData()
  form.append('file', file)

  const res = await fetch(url, {
    method: 'POST',
    headers, // IMPORTANT: do not set 'Content-Type', browser sets multipart boundary
    body: form,
  })

  // 201 Created expected
  if (res.status === 201) return

  const text = await res.text()
  let data: any = null
  if (text) {
    try { data = JSON.parse(text) } catch (e) { data = text }
  }

  const message = (data && typeof data === 'object' ? data.message : data) || res.statusText || 'Request failed'
  throw new Error(`${res.status} ${message}`)
}
