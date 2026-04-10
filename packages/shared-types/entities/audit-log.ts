/**
 * Audit Log Entity Types
 */

import { AuditAction } from './enums.js'

export interface AuditLog {
  id: string
  action: AuditAction
  resource_type: string
  resource_id: string | null
  user_id: string | null
  ip_address: string | null
  user_agent: string | null
  request_method: string | null
  request_path: string | null
  request_body: string | null
  response_status: number | null
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

export interface AuditLogRow {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  user_id: string | null
  ip_address: string | null
  user_agent: string | null
  request_method: string | null
  request_path: string | null
  request_body: string | null
  response_status: number | null
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

export interface CreateAuditLog {
  action: AuditAction
  resource_type: string
  resource_id?: string | null
  user_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  request_method?: string | null
  request_path?: string | null
  request_body?: string | null
  response_status?: number | null
  error_message?: string | null
  duration_ms?: number | null
}

export interface AuditLogQuery {
  action?: AuditAction
  resource_type?: string
  resource_id?: string
  user_id?: string
  response_status?: number
  request_path?: string
  status_filter?: 'all' | 'success' | 'error'
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
  sort_by?: 'created_at' | 'duration_ms'
  sort_order?: 'asc' | 'desc'
}

export interface AuditStats {
  total_logs: number
  by_action: Record<AuditAction, number>
  by_resource_type: Record<string, number>
  by_response_status: Record<string, number>
  avg_duration_ms: number
}