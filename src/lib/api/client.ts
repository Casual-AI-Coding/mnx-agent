import axios, { AxiosInstance, AxiosError } from 'axios'
import { useAppStore } from '@/stores/app'
import { API_HOSTS } from '@/types'

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use((config) => {
      const { apiKey, region } = useAppStore.getState()
      config.headers['X-API-Key'] = apiKey
      config.headers['X-Region'] = region
      config.headers['X-API-Host'] = API_HOSTS[region]
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<{ error?: string; base_resp?: { status_code: number; status_msg: string } }>) => {
        const message = error.response?.data?.error 
          || error.response?.data?.base_resp?.status_msg 
          || error.message 
          || 'Unknown error'
        return Promise.reject(new Error(message))
      }
    )
  }

  get client_() {
    return this.client
  }
}

export const apiClient = new APIClient()