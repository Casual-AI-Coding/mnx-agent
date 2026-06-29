import { internalAxios } from './client'
import { withApiResponse } from './request'
import type { ApiResponse } from './errors'
import type {
  AsyncTaskStatus,
  CreateExternalApiLog,
  ExternalApiLog,
  ExternalApiLogQuery,
  ExternalApiLogStats as BackendExternalApiLogStats,
  ExternalApiStatus,
  ServiceProvider,
  UpdateExternalApiLog,
} from '@mnx/shared-types'

export type {
  AsyncTaskStatus,
  ExternalApiLog,
  ExternalApiLogQuery,
  ExternalApiStatus,
  ServiceProvider,
}

export interface ExternalApiLogStats {
  total: number
  byServiceProvider: { provider: string; count: number }[]
  byStatus: { status: string; count: number }[]
  byOperation: { operation: string; count: number }[]
  avgDuration: number
}

interface ExternalApiLogsPayload {
  readonly logs: ExternalApiLog[]
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly total: number
    readonly totalPages: number
  }
}

interface ExternalApiOperationsPayload {
  readonly operations: string[]
}

interface ExternalApiProvidersPayload {
  readonly providers: string[]
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

export async function getExternalApiLogs(params: ExternalApiLogQuery): Promise<ApiResponse<ExternalApiLogsPayload>> {
  return withApiResponse<ExternalApiLogsPayload>(() => internalAxios.get('/external-api-logs', { params }))
}

export async function getExternalApiLog(id: number): Promise<ApiResponse<ExternalApiLog>> {
  return withApiResponse<ExternalApiLog>(() => internalAxios.get(`/external-api-logs/${id}`))
}

export async function getExternalApiLogStats(): Promise<ApiResponse<ExternalApiLogStats>> {
  return withApiResponse<BackendExternalApiLogStats, ExternalApiLogStats>(
    () => internalAxios.get('/external-api-logs/stats'),
    transformStats
  )
}

export async function getUniqueExternalApiOperations(): Promise<ApiResponse<string[]>> {
  return withApiResponse<ExternalApiOperationsPayload, string[]>(
    () => internalAxios.get('/external-api-logs/operations'),
    (payload) => payload.operations
  )
}

export type CreateExternalApiLogInput = Omit<CreateExternalApiLog, 'status' | 'user_id'> & {
  readonly status?: ExternalApiStatus
}

export type UpdateExternalApiLogInput = UpdateExternalApiLog

export async function createExternalApiLog(input: CreateExternalApiLogInput): Promise<ApiResponse<ExternalApiLog>> {
  return withApiResponse<ExternalApiLog>(() => internalAxios.post('/external-api-logs', input))
}

export async function updateExternalApiLog(id: number, input: UpdateExternalApiLogInput): Promise<ApiResponse<ExternalApiLog>> {
  return withApiResponse<ExternalApiLog>(() => internalAxios.patch(`/external-api-logs/${id}`, input))
}

export async function getUniqueExternalApiProviders(): Promise<ApiResponse<string[]>> {
  return withApiResponse<ExternalApiProvidersPayload, string[]>(
    () => internalAxios.get('/external-api-logs/providers'),
    (payload) => payload.providers
  )
}

export interface SubmitTaskInput {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
  service_provider: string
  operation: string
  media_type?: 'image' | 'video' | 'audio' | 'music'
}

export interface SubmitTaskResponse {
  taskId: number
  status: string
  message: string
}

export interface TaskStatusResponse {
  taskId: number
  task_status: AsyncTaskStatus
  status: ExternalApiStatus
  result_media_id: string | null
  error_message: string | null
  created_at: string
}

export async function submitTask(input: SubmitTaskInput): Promise<ApiResponse<SubmitTaskResponse>> {
  return withApiResponse<SubmitTaskResponse>(() => internalAxios.post('/external-proxy/submit', input))
}

export async function getTaskStatus(taskId: number): Promise<ApiResponse<TaskStatusResponse>> {
  return withApiResponse<TaskStatusResponse>(() => internalAxios.get(`/external-proxy/status/${taskId}`))
}
