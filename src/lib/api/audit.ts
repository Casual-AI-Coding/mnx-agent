import { internalAxios } from './client'
import { withApiResponse } from './request'
import type { ApiResponse } from './errors'

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
  query_params: Record<string, unknown> | null
  response_body: string | null
  response_status: number | null
  error_message: string | null
  duration_ms: number | null
  trace_id: string | null
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

interface AuditLogsPayload {
  readonly logs: AuditLog[]
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly total: number
    readonly totalPages: number
  }
}

interface RequestPathsPayload {
  readonly paths: string[]
}

interface AuditUsersPayload {
  readonly users: { readonly id: string; readonly username: string }[]
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

export async function getAuditLogs(params: AuditLogQuery): Promise<ApiResponse<AuditLogsPayload>> {
  return withApiResponse<AuditLogsPayload>(() => internalAxios.get('/audit', { params }))
}

export async function getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
  return withApiResponse<AuditLog>(() => internalAxios.get(`/audit/${id}`))
}

export async function getAuditStats(): Promise<ApiResponse<AuditStats>> {
  return withApiResponse<BackendAuditStats, AuditStats>(
    () => internalAxios.get('/audit/stats'),
    transformAuditStats
  )
}

export async function getUniqueRequestPaths(): Promise<ApiResponse<string[]>> {
  return withApiResponse<RequestPathsPayload, string[]>(
    () => internalAxios.get('/audit/paths'),
    (payload) => payload.paths
  )
}

export async function getUniqueAuditUsers(): Promise<ApiResponse<{ id: string; username: string }[]>> {
  return withApiResponse<AuditUsersPayload, { readonly id: string; readonly username: string }[]>(
    () => internalAxios.get('/audit/users'),
    (payload) => payload.users
  )
}
