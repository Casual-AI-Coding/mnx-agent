import { internalAxios } from './client'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type AuditAction = 'create' | 'update' | 'delete' | 'execute'

export interface AuditLog {
  id: string
  action: AuditAction
  resource_type: string
  resource_id: string | null
  user_id: string | null
  username: string | null
  ip_address: string | null
  user_agent: string | null
  request_method: string
  request_path: string
  request_body: string | Record<string, unknown> | null
  response_status: number | null
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

interface BackendAuditStats {
  total_logs: number
  by_action: Record<string, number>
  by_resource_type: Record<string, number>
  by_response_status: Record<string, number>
  avg_duration_ms: number
}

export interface AuditStats {
  total: number
  byAction: { action: string; count: number }[]
  byResourceType: { resource_type: string; count: number }[]
  byResponseStatus: { response_status: number; count: number }[]
  avgDuration: number
}

export interface AuditLogQuery {
  action?: AuditAction
  resource_type?: string
  resource_id?: string
  user_id?: string
  response_status?: number
  request_path?: string
  status_filter?: 'all' | 'success' | 'error'
  sort_by?: 'created_at' | 'duration_ms'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

function transformAuditStats(backend: BackendAuditStats): AuditStats {
  return {
    total: backend.total_logs,
    byAction: Object.entries(backend.by_action).map(([action, count]) => ({ action, count })),
    byResourceType: Object.entries(backend.by_resource_type).map(([resource_type, count]) => ({ resource_type, count })),
    byResponseStatus: Object.entries(backend.by_response_status).map(([status, count]) => ({ response_status: parseInt(status), count })),
    avgDuration: backend.avg_duration_ms,
  }
}

export async function getAuditLogs(params: AuditLogQuery): Promise<ApiResponse<{ logs: AuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
  try {
    const response = await internalAxios.get('/audit', { params })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
  try {
    const response = await internalAxios.get(`/audit/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getAuditStats(): Promise<ApiResponse<AuditStats>> {
  try {
    const response = await internalAxios.get<{ data: BackendAuditStats }>('/audit/stats')
    return { success: true, data: transformAuditStats(response.data.data) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getUniqueRequestPaths(): Promise<ApiResponse<string[]>> {
  try {
    const response = await internalAxios.get('/audit/paths')
    return { success: true, data: response.data.data.paths }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getUniqueAuditUsers(): Promise<ApiResponse<{ id: string; username: string }[]>> {
  try {
    const response = await internalAxios.get('/audit/users')
    return { success: true, data: response.data.data.users }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}