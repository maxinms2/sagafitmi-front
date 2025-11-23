export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080'

export async function post<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = data?.message || res.statusText || 'Request failed'
    throw new Error(message)
  }

  return data as T
}
