import axios, { AxiosInstance } from 'axios'

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
  ip_address: string | null
  user_agent: string | null
  request_method: string
  request_path: string
  request_body: string | null
  response_status: number | null
  duration_ms: number | null
  created_at: string
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
  response_status?: number
  page?: number
  limit?: number
}

const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4511',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function getAuditLogs(params: AuditLogQuery): Promise<ApiResponse<{ logs: AuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
  try {
    const response = await client.get('/audit', { params })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
  try {
    const response = await client.get(`/audit/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getAuditStats(): Promise<ApiResponse<AuditStats>> {
  try {
    const response = await client.get('/audit/stats')
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}