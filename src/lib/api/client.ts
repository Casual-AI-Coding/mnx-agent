import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { API_HOSTS, type Region } from '@/types'
import { TIMEOUTS } from '@/lib/config'
import { refreshToken } from './auth'
import { ApiError } from './errors'
import type { AuthProvider, SettingsProvider, NavigationProvider } from './providers/types'

class InternalAPIClient {
  private client: AxiosInstance
  private isRefreshing = false
  private refreshSubscribers: Array<{ resolve: (token: string) => void; reject: (e: unknown) => void }> = []
  private authWaitTimeout = 5000
  private hydrationRefreshPromise: Promise<void> | null = null
  private readonly subscriberTimeout = 10000

  constructor(
    private readonly auth: AuthProvider,
    private readonly settings: SettingsProvider,
    private readonly navigation: NavigationProvider,
  ) {
    this.client = axios.create({
      baseURL: '/api',
      timeout: TIMEOUTS.API_REQUEST,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    })

    this.setupInterceptors()
  }

  private async doHydrationRefresh(): Promise<void> {
    try {
      const response = await refreshToken()
      if (response.success && response.data?.accessToken) {
        this.auth.updateAccessToken(response.data.accessToken)
      }
    } catch (err) {
      console.warn('[API Client] Failed to refresh token during hydration:', err)
    }
  }

  private async waitForAuth(): Promise<void> {
    const start = Date.now()

    while (!this.auth.isHydrated()) {
      if (Date.now() - start > this.authWaitTimeout) {
        console.warn('[API Client] Auth hydration timeout')
        break
      }
      await new Promise(r => setTimeout(r, 50))
    }

    if (this.auth.isAuthenticated() && !this.auth.getAccessToken()) {
      if (!this.hydrationRefreshPromise) {
        this.hydrationRefreshPromise = this.doHydrationRefresh()
          .finally(() => { this.hydrationRefreshPromise = null })
      }
      await Promise.race([
        this.hydrationRefreshPromise,
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Hydration refresh timeout')), this.authWaitTimeout))
      ]).catch((err) => {
        console.warn('[API Client] Hydration refresh failed:', err)
      })
    }
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(async (config) => {
      await this.waitForAuth()

      const apiKey = this.settings.getApiKey()
      const settingsRegion = this.settings.getRegion()
      const region: Region = settingsRegion === 'domestic' ? 'cn' : 'intl'
      const accessToken = this.auth.getAccessToken()

      config.headers['X-API-Key'] = apiKey
      config.headers['X-Region'] = settingsRegion
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
            this.auth.logout()
            this.navigation.redirectToLogin()
            return Promise.reject(error)
          }

          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                const idx = this.refreshSubscribers.findIndex(s => s.resolve === resolve)
                if (idx !== -1) this.refreshSubscribers.splice(idx, 1)
                reject(new Error('Token refresh timeout'))
              }, this.subscriberTimeout)

              this.refreshSubscribers.push({
                resolve: (token: string) => {
                  clearTimeout(timer)
                  originalRequest.headers['Authorization'] = `Bearer ${token}`
                  resolve(this.client.request(originalRequest))
                },
                reject: (e: unknown) => {
                  clearTimeout(timer)
                  reject(e)
                },
              })
            })
          }

          this.isRefreshing = true
          originalRequest._retry = true

          try {
            const response = await refreshToken()
            if (response.success && response.data?.accessToken) {
              const newToken = response.data.accessToken
              this.auth.updateAccessToken(newToken)
              this.refreshSubscribers.forEach((s) => s.resolve(newToken))
              this.refreshSubscribers = []
              this.isRefreshing = false
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              return this.client.request(originalRequest)
            }
          } catch {
            // refreshToken threw or returned success=false
          }

          this.refreshSubscribers.forEach((s) => s.reject(new Error('Token refresh failed')))
          this.refreshSubscribers = []
          this.isRefreshing = false
          this.auth.logout()
          this.navigation.redirectToLogin()
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

  async get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) {
    const response = await this.client.get<T>(url, { ...config, params })
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    const response = await this.client.post<T>(url, data, config)
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

  async delete<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
}

import { createAuthProvider, createSettingsProvider, createBrowserNavigationProvider } from './providers/adapters'

export const apiClient = new InternalAPIClient(
  createAuthProvider(),
  createSettingsProvider(),
  createBrowserNavigationProvider(),
)

export const internalAxios = apiClient.client_
