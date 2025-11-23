import { post } from './api'

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  token: string
  tokenType?: string | null
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/login', payload)
}

export default { login }
