import axios, { AxiosInstance } from 'axios'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface StatsOverview {
  totalExecutions: number
  successRate: number
  avgDuration: number
  errorCount: number
}

export interface StatsTrendItem {
  date: string
  total: number
  success: number
  failed: number
}

export interface StatsDistributionItem {
  type: string
  count: number
}

export interface StatsErrorItem {
  errorSummary: string
  count: number
}

const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4511',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getStatsOverview(): Promise<ApiResponse<StatsOverview>> {
  try {
    const response = await client.get('/stats/overview')
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getSuccessRateTrend(period: 'day' | 'week' | 'month' = 'day'): Promise<ApiResponse<StatsTrendItem[]>> {
  try {
    const response = await client.get('/stats/success-rate', { params: { period } })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getTaskDistribution(): Promise<ApiResponse<StatsDistributionItem[]>> {
  try {
    const response = await client.get('/stats/distribution')
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getErrorRanking(limit: number = 10): Promise<ApiResponse<StatsErrorItem[]>> {
  try {
    const response = await client.get('/stats/errors', { params: { limit } })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}