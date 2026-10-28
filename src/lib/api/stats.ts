import { internalAxios } from './client'

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

export async function getStatsOverview(): Promise<ApiResponse<StatsOverview>> {
  try {
    const response = await internalAxios.get('/stats/overview')
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getSuccessRateTrend(period: 'day' | 'week' | 'month' = 'day'): Promise<ApiResponse<StatsTrendItem[]>> {
  try {
    const response = await internalAxios.get('/stats/success-rate', { params: { period } })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getTaskDistribution(): Promise<ApiResponse<StatsDistributionItem[]>> {
  try {
    const response = await internalAxios.get('/stats/distribution')
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getErrorRanking(limit: number = 10): Promise<ApiResponse<StatsErrorItem[]>> {
  try {
    const response = await internalAxios.get('/stats/errors', { params: { limit } })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}
/** 运营总览聚合数据（R-005） */
export interface OperationsExecutionsStats {
  totalExecutions: number
  successRate: number
  failureRate: number
  avgDuration: number
  errorCount: number
}

export interface OperationsRecentFailure {
  id: string
  job_id: string | null
  trigger_type: string
  status: string
  started_at: string
  duration_ms: number | null
  tasks_failed: number
  error_summary: string | null
}

export interface OperationsDlqSummary {
  unresolvedCount: number
  recent: {
    id: string
    task_type: string
    error_message: string | null
    failed_at: string
  }[]
}

export interface OperationsCapacityRecord {
  service_type: string
  remaining_quota: number
  total_quota: number
  usage_ratio: number
  reset_at: string | null
}

export interface OperationsCapacity {
  records: OperationsCapacityRecord[]
  atRisk: string[]
}

export interface OperationsHealth {
  database: boolean
  uptimeSeconds: number
  pool: {
    pool: { totalCount: number; idleCount: number; waitingCount: number }
    status: 'healthy' | 'congested'
    warning: string | null
    recommendation: string | null
  } | null
}

export type OperationsSection<T> = T | { error: string }

export interface OperationsOverview {
  executions: OperationsSection<OperationsExecutionsStats>
  distribution: OperationsSection<StatsDistributionItem[]>
  recentFailures: OperationsSection<OperationsRecentFailure[]>
  dlq: OperationsSection<OperationsDlqSummary>
  capacity: OperationsSection<OperationsCapacity>
  health: OperationsSection<OperationsHealth>
}

export async function getOperationsOverview(): Promise<ApiResponse<OperationsOverview>> {
  try {
    const response = await internalAxios.get('/stats/operations')
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}
