import axios from 'axios'
import type { AuthUser } from '@/stores/auth'

const authApi = axios.create({
  baseURL: '/api/auth',
  timeout: 10000,
})

export interface LoginResponse {
  success: boolean
  data?: { user: AuthUser; accessToken: string; refreshToken: string }
  error?: string
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/login', { username, password })
  return response.data
}

export async function register(
  username: string,
  password: string,
  invitationCode: string,
  email?: string | null
): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/register', {
    username, password, invitationCode, email,
  })
  return response.data
}