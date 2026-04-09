import axios from 'axios'
import type { AuthUser } from '@/stores/auth'

const authApi = axios.create({
  baseURL: '/api/auth',
  timeout: 10000,
  withCredentials: true,
})

export interface LoginResponse {
  success: boolean
  data?: { user: AuthUser; accessToken: string }
  error?: string
}

export interface RefreshResponse {
  success: boolean
  data?: { accessToken: string }
  error?: string
}

export interface LogoutResponse {
  success: boolean
  data?: { message: string }
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

export async function refreshToken(): Promise<RefreshResponse> {
  const response = await authApi.post<RefreshResponse>('/refresh')
  return response.data
}

export async function logout(accessToken: string): Promise<LogoutResponse> {
  const response = await authApi.post<LogoutResponse>('/logout', {}, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return response.data
}

export interface UpdateProfileResponse {
  success: boolean
  data?: AuthUser
  error?: string
}

export async function updateProfile(
  accessToken: string,
  updates: { minimax_api_key?: string | null; minimax_region?: string }
): Promise<UpdateProfileResponse> {
  const response = await authApi.patch<UpdateProfileResponse>('/me', updates, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return response.data
}