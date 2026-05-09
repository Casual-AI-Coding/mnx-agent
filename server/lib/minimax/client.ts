import axios, { AxiosError, type AxiosInstance } from 'axios'
import { API_HOSTS, getErrorMapping, MiniMaxClientError, type MiniMaxErrorResponse, type Region } from './types.js'
import { retryWithBackoff, type RetryOptions } from '../retry.js'

export class MiniMaxClient {
  protected client: AxiosInstance
  private retryConfig: RetryOptions

  constructor(apiKey: string, region: Region = 'international', retryConfig?: RetryOptions) {
    const baseURL = API_HOSTS[region]

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    })

    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      baseDelayMs: retryConfig?.baseDelayMs ?? 1000,
      maxDelayMs: retryConfig?.maxDelayMs ?? 30000,
      retryableStatusCodes: retryConfig?.retryableStatusCodes ?? [429, 500, 502, 503, 504],
    }
  }

  protected async request<T>(fn: () => Promise<T>): Promise<T> {
    return retryWithBackoff(fn, this.retryConfig)
  }

  static handleError(error: AxiosError<MiniMaxErrorResponse>): never {
    if (error.response?.data) {
      const data = error.response.data
      const parsedErrorCode = data.error?.code ? Number(data.error.code) : undefined
      const code = data.base_resp?.status_code
        ?? (Number.isNaN(parsedErrorCode) ? undefined : parsedErrorCode)
        ?? error.response.status
        ?? 500
      const status = error.response.status ?? getErrorMapping(code).status
      const message = data.base_resp?.status_msg ?? data.error?.message ?? 'Unknown error'

      throw new MiniMaxClientError(message, {
        code,
        status,
        response: data,
        cause: error,
        axiosCode: error.code,
      })
    }

    if (error.code === 'ECONNABORTED') {
      throw new MiniMaxClientError('Request timeout', {
        code: 408,
        status: 408,
        cause: error,
        axiosCode: error.code,
      })
    }

    throw new MiniMaxClientError(error.message || 'Request failed', {
      code: error.response?.status ?? 500,
      status: error.response?.status ?? 500,
      response: error.response?.data,
      cause: error,
      axiosCode: error.code,
    })
  }
}
