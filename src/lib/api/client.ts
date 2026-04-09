import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useSettingsStore } from '@/settings/store'
import { useAuthStore } from '@/stores/auth'
import { API_HOSTS } from '@/types'
import { TIMEOUTS } from '@/lib/config'
import { refreshToken } from './auth'
import { ApiError } from './errors'

class InternalAPIClient {
  private client: AxiosInstance
  private isRefreshing = false
  private refreshSubscribers: Array<(token: string) => void> = []

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: TIMEOUTS.API_REQUEST,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use((config) => {
      const { settings } = useSettingsStore.getState()
      const { minimaxKey: apiKey, region } = settings.api
      const { accessToken } = useAuthStore.getState()
      config.headers['X-API-Key'] = apiKey
      config.headers['X-Region'] = region
      config.headers['X-API-Host'] = API_HOSTS[region]
      if (accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<{ error?: string; base_resp?: { status_code: number; status_msg: string } }>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          if (originalRequest.url?.includes('/auth/refresh')) {
            useAuthStore.getState().logout()
            window.location.href = '/login'
            return Promise.reject(error)
          }

          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`
                resolve(this.client.request(originalRequest))
              })
            })
          }

          this.isRefreshing = true
          originalRequest._retry = true

          try {
            const response = await refreshToken()
            if (response.success && response.data?.accessToken) {
              const newToken = response.data.accessToken
              useAuthStore.getState().updateAccessToken(newToken)
              this.refreshSubscribers.forEach((cb) => cb(newToken))
              this.refreshSubscribers = []
              this.isRefreshing = false
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              return this.client.request(originalRequest)
            }
          } catch {
            useAuthStore.getState().logout()
            window.location.href = '/login'
          }

          this.isRefreshing = false
          this.refreshSubscribers = []
          useAuthStore.getState().logout()
          window.location.href = '/login'
          return Promise.reject(error)
        }

        const statusCode = error.response?.status
        const apiCode = error.response?.data?.base_resp?.status_code
        const message =
          error.response?.data?.error ||
          error.response?.data?.base_resp?.status_msg ||
          error.message ||
          'Unknown error'
        return Promise.reject(new ApiError(message, statusCode, apiCode?.toString()))
      }
    )
  }

  get client_() {
    return this.client
  }

  async get<T>(url: string, params?: Record<string, unknown>) {
    const response = await this.client.get<T>(url, { params })
    return response.data
  }

  async post<T>(url: string, data?: unknown) {
    const response = await this.client.post<T>(url, data)
    return response.data
  }

  async put<T>(url: string, data?: unknown) {
    const response = await this.client.put<T>(url, data)
    return response.data
  }

  async patch<T>(url: string, data?: unknown) {
    const response = await this.client.patch<T>(url, data)
    return response.data
  }

  async delete<T>(url: string) {
    const response = await this.client.delete<T>(url)
    return response.data
  }
}

export const apiClient = new InternalAPIClient()

// Export the axios instance for direct use if needed
export const internalAxios = apiClient.client_