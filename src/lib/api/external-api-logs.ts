import { internalAxios } from './client'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type ServiceProvider = 'minimax' | 'openai' | 'deepseek' | string
export type ExternalApiStatus = 'success' | 'failed'

export interface ExternalApiLog {
  id: number
  service_provider: ServiceProvider
  api_endpoint: string
  operation: string
  request_params: Record<string, unknown> | null
  response_body: string | null
  status: ExternalApiStatus
  error_message: string | null
  duration_ms: number | null
  user_id: string | null
  trace_id: string | null
  created_at: string
}

interface BackendExternalApiLogStats {
  total_logs: number
  by_service_provider: Record<string, number>
  by_status: Record<string, number>
  by_operation: Record<string, number>
  avg_duration_ms: number
}

export interface ExternalApiLogStats {
  total: number
  byServiceProvider: { provider: string; count: number }[]
  byStatus: { status: string; count: number }[]
  byOperation: { operation: string; count: number }[]
  avgDuration: number
}

export interface ExternalApiLogQuery {
  service_provider?: ServiceProvider
  status?: ExternalApiStatus
  operation?: string
  user_id?: string
  start_date?: string
  end_date?: string
  sort_by?: 'created_at' | 'duration_ms'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

function transformStats(backend: BackendExternalApiLogStats): ExternalApiLogStats {
  return {
    total: backend.total_logs,
    byServiceProvider: Object.entries(backend.by_service_provider).map(([provider, count]) => ({ provider, count })),
    byStatus: Object.entries(backend.by_status).map(([status, count]) => ({ status, count })),
    byOperation: Object.entries(backend.by_operation).map(([operation, count]) => ({ operation, count })),
    avgDuration: backend.avg_duration_ms,
  }
}

export async function getExternalApiLogs(params: ExternalApiLogQuery): Promise<ApiResponse<{ logs: ExternalApiLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
  try {
    const response = await internalAxios.get('/external-api-logs', { params })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getExternalApiLog(id: number): Promise<ApiResponse<ExternalApiLog>> {
  try {
    const response = await internalAxios.get(`/external-api-logs/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getExternalApiLogStats(): Promise<ApiResponse<ExternalApiLogStats>> {
  try {
    const response = await internalAxios.get<{ data: BackendExternalApiLogStats }>('/external-api-logs/stats')
    return { success: true, data: transformStats(response.data.data) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getUniqueExternalApiOperations(): Promise<ApiResponse<string[]>> {
  try {
    const response = await internalAxios.get('/external-api-logs/operations')
    return { success: true, data: response.data.data.operations }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getUniqueExternalApiProviders(): Promise<ApiResponse<string[]>> {
  try {
    const response = await internalAxios.get('/external-api-logs/providers')
    return { success: true, data: response.data.data.providers }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}