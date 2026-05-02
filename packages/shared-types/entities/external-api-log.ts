/**
 * External API Log Entity Types
 */

export type ServiceProvider = 'minimax' | 'openai' | 'deepseek' | string
export type ExternalApiStatus = 'pending' | 'success' | 'failed'
export type AsyncTaskStatus = 'sync' | 'pending' | 'completed' | 'failed'

export interface ExternalApiLog {
  id: number
  service_provider: ServiceProvider
  api_endpoint: string
  operation: string
  request_params: Record<string, unknown> | null
  request_body: string | null
  response_body: string | null
  status: ExternalApiStatus
  error_message: string | null
  duration_ms: number | null
  user_id: string | null
  trace_id: string | null
  created_at: string
  task_status: AsyncTaskStatus
  result_media_id: string | null
  result_data: Record<string, unknown> | null
}

export interface ExternalApiLogRow {
  id: number
  service_provider: string
  api_endpoint: string
  operation: string
  request_params: string | null
  request_body: string | null
  response_body: string | null
  status: string
  error_message: string | null
  duration_ms: number | null
  user_id: string | null
  trace_id: string | null
  created_at: string
  task_status: string
  result_media_id: string | null
  result_data: string | null
}

export interface CreateExternalApiLog {
  service_provider: ServiceProvider
  api_endpoint: string
  operation: string
  request_params?: Record<string, unknown> | null
  request_body?: string | null
  response_body?: string | null
  status: ExternalApiStatus
  error_message?: string | null
  duration_ms?: number | null
  user_id?: string | null
  trace_id?: string | null
  task_status?: AsyncTaskStatus
  result_media_id?: string | null
  result_data?: Record<string, unknown> | null
}

export interface UpdateExternalApiLog {
  response_body?: string
  status?: ExternalApiStatus
  error_message?: string
  duration_ms?: number
  task_status?: AsyncTaskStatus
  result_media_id?: string | null
  result_data?: Record<string, unknown> | null
}

export interface ExternalApiLogQuery {
  service_provider?: ServiceProvider
  status?: ExternalApiStatus
  operation?: string
  user_id?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
  sort_by?: 'created_at' | 'duration_ms'
  sort_order?: 'asc' | 'desc'
}

export interface ExternalApiLogStats {
  total_logs: number
  by_service_provider: Record<string, number>
  by_status: Record<ExternalApiStatus, number>
  by_operation: Record<string, number>
  avg_duration_ms: number
}
