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
  private authWaitTimeout = 5000 // 最多等待 5 秒
  private hydrationRefreshPromise: Promise<void> | null = null // 防止 hydration 时 token 刷新竞态

  /**
   * 执行 token 刷新（hydration 阶段专用）
   * 所有调用者共享同一个 Promise，避免竞态
   */
  private async doHydrationRefresh(updateAccessToken: (token: string) => void): Promise<void> {
    try {
      const response = await refreshToken()
      if (response.success && response.data?.accessToken) {
        updateAccessToken(response.data.accessToken)
      }
    } catch (err) {
      console.warn('[API Client] Failed to refresh token during hydration:', err)
    }
  }

  private async waitForAuth(): Promise<void> {
    const start = Date.now()
    
    while (!useAuthStore.getState().isHydrated) {
      if (Date.now() - start > this.authWaitTimeout) {
        console.warn('[API Client] Auth hydration timeout')
        break
      }
      await new Promise(r => setTimeout(r, 50))
    }
    
    const { isAuthenticated, accessToken, updateAccessToken } = useAuthStore.getState()
    if (isAuthenticated && !accessToken) {
      // 使用共享 Promise 防止多个并发请求同时触发刷新
      if (!this.hydrationRefreshPromise) {
        this.hydrationRefreshPromise = this.doHydrationRefresh(updateAccessToken)
          .finally(() => {
            this.hydrationRefreshPromise = null
          })
      }
      await this.hydrationRefreshPromise
    }
  }

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: TIMEOUTS.API_REQUEST,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use(async (config) => {
      await this.waitForAuth()
      
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