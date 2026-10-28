/**
 * DashboardService Implementation
 *
 * 运营总览聚合服务（R-005）：编排 LogService / TaskService / CapacityService /
 * DatabaseService / DatabasePoolStatsService，输出 Dashboard 运营总览所需的全量指标。
 *
 * 设计约束：
 * - 只编排领域服务，不直接写 SQL（Route → Domain Service → Repository 单向依赖）
 * - 六个板块相互独立、并发查询，单一板块失败降级为 { error }，不阻塞整体
 * - 容量风险判定基于本地快照（capacity_records），不触发外部 MiniMax API 调用
 */

import type {
  IDashboardService,
  OperationsOverview,
  OperationsExecutionsStats,
  OperationsRecentFailure,
  OperationsDlqSummary,
  OperationsCapacity,
  OperationsHealth,
} from './interfaces/index.js'
import type { ILogService } from './interfaces/log.interface.js'
import type { ITaskService } from './interfaces/task.interface.js'
import type { ICapacityService } from './interfaces/capacity.interface.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { DatabasePoolStatsService } from '../database-pool-stats-service.js'

/** 剩余配额低于总配额该比例时视为容量风险 */
const CAPACITY_RISK_REMAINING_RATIO = 0.2
const RECENT_FAILURES_LIMIT = 5
const DLQ_RECENT_LIMIT = 5

/** 单板块查询的统一返回：成功返回值，失败返回 { error } */
type Section<T> = T | { error: string }

async function safely<T>(load: () => Promise<T>): Promise<Section<T>> {
  try {
    return await load()
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

export class DashboardService implements IDashboardService {
  constructor(
    private readonly logService: ILogService,
    private readonly taskService: ITaskService,
    private readonly capacityService: ICapacityService,
    private readonly database: DatabaseService,
    private readonly poolStatsService: DatabasePoolStatsService
  ) {}

  async getOperationsOverview(ownerId?: string): Promise<OperationsOverview> {
    const [executions, distribution, recentFailures, dlq, capacity, health] = await Promise.all([
      this.loadExecutions(ownerId),
      this.loadDistribution(ownerId),
      this.loadRecentFailures(ownerId),
      this.loadDlq(ownerId),
      this.loadCapacity(),
      this.loadHealth(),
    ])

    return { executions, distribution, recentFailures, dlq, capacity, health }
  }

  private async loadExecutions(ownerId?: string): Promise<Section<OperationsExecutionsStats>> {
    return safely(async () => {
      const stats = await this.logService.getExecutionStatsOverview(ownerId)
      const successRate = stats.successRate
      return {
        totalExecutions: stats.totalExecutions,
        successRate,
        failureRate: stats.totalExecutions > 0
          ? Math.round((1 - successRate) * 10_000) / 10_000
          : 0,
        avgDuration: stats.avgDuration,
        errorCount: stats.errorCount,
      }
    })
  }

  private async loadDistribution(ownerId?: string): Promise<Section<{ type: string; count: number }[]>> {
    return safely(() => this.logService.getExecutionStatsDistribution(ownerId))
  }

  private async loadRecentFailures(ownerId?: string): Promise<Section<OperationsRecentFailure[]>> {
    return safely(async () => {
      const logs = await this.logService.getRecentFailedExecutions(RECENT_FAILURES_LIMIT, ownerId)
      return logs.map(log => ({
        id: log.id,
        job_id: log.job_id,
        trigger_type: log.trigger_type,
        status: log.status,
        started_at: log.started_at,
        duration_ms: log.duration_ms,
        tasks_failed: log.tasks_failed,
        error_summary: log.error_summary,
      }))
    })
  }

  private async loadDlq(ownerId?: string): Promise<Section<OperationsDlqSummary>> {
    return safely(async () => {
      const [unresolvedCount, recent] = await Promise.all([
        this.taskService.countUnresolvedDeadLetters(ownerId),
        this.taskService.getDeadLetterQueue(ownerId, DLQ_RECENT_LIMIT),
      ])
      return {
        unresolvedCount,
        recent: recent.map(item => ({
          id: item.id,
          task_type: item.task_type,
          error_message: item.error_message,
          failed_at: item.failed_at,
        })),
      }
    })
  }

  private async loadCapacity(): Promise<Section<OperationsCapacity>> {
    return safely(async () => {
      const records = await this.capacityService.getAll()
      const mapped = records.map(record => ({
        service_type: record.service_type,
        remaining_quota: record.remaining_quota,
        total_quota: record.total_quota,
        usage_ratio: record.total_quota > 0
          ? (record.total_quota - record.remaining_quota) / record.total_quota
          : 0,
        reset_at: record.reset_at,
      }))
      const atRisk = mapped
        .filter(record => record.total_quota > 0 && record.remaining_quota / record.total_quota < CAPACITY_RISK_REMAINING_RATIO)
        .map(record => record.service_type)
      return { records: mapped, atRisk }
    })
  }

  private async loadHealth(): Promise<Section<OperationsHealth>> {
    return safely(async () => {
      const [database, pool] = await Promise.all([
        this.database.isConnected(),
        Promise.resolve(this.poolStatsService.getReport()),
      ])
      return {
        database,
        uptimeSeconds: Math.floor(process.uptime()),
        pool,
      }
    })
  }
}
