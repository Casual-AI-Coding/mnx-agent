/**
 * Dashboard Domain Service 接口
 *
 * 运营总览聚合服务：编排执行统计、失败任务、死信队列、容量与系统健康，
 * 为 Dashboard 运营总览（R-005）提供单一数据源。各板块独立降级，不互相阻塞。
 */

import type { DatabasePoolStatsReport } from '../../database-pool-stats-service.js'

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
  /** 已用配额占总配额比例，0~1；总配额为 0 时为 0 */
  usage_ratio: number
  reset_at: string | null
}

export interface OperationsCapacity {
  records: OperationsCapacityRecord[]
  /** 剩余配额占比不足（默认 < 20%）的 service_type 列表 */
  atRisk: string[]
}

export interface OperationsHealth {
  database: boolean
  uptimeSeconds: number
  pool: DatabasePoolStatsReport | null
}

export interface OperationsOverview {
  executions: OperationsExecutionsStats | { error: string }
  distribution: { type: string; count: number }[] | { error: string }
  recentFailures: OperationsRecentFailure[] | { error: string }
  dlq: OperationsDlqSummary | { error: string }
  capacity: OperationsCapacity | { error: string }
  health: OperationsHealth | { error: string }
}

export interface IDashboardService {
  /**
   * 聚合运营总览数据。板块之间相互独立：
   * 单一板块查询失败时该板块返回 { error }，不影响其余板块。
   */
  getOperationsOverview(ownerId?: string): Promise<OperationsOverview>
}
