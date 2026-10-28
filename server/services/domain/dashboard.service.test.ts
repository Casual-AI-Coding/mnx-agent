import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardService } from './dashboard.service'
import type { ILogService } from './interfaces/log.interface.js'
import type { ITaskService } from './interfaces/task.interface.js'
import type { ICapacityService } from './interfaces/capacity.interface.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { DatabasePoolStatsService } from '../database-pool-stats-service.js'
import type { ExecutionLog, CapacityRecord } from '../../database/types.js'

function isOk<T>(section: T | { error: string }): section is T {
  return !(typeof section === 'object' && section !== null && 'error' in section)
}

/** 断言板块未降级并返回收窄后的值 */
function expectOk<T>(section: T | { error: string }): T {
  if (!isOk(section)) {
    throw new Error(`板块意外降级: ${section.error}`)
  }
  return section
}

function buildExecutionLog(overrides: Partial<ExecutionLog> = {}): ExecutionLog {
  return {
    id: 'log-1',
    owner_id: 'owner-1',
    job_id: null,
    trigger_type: 'manual',
    status: 'failed',
    started_at: '2026-10-29T00:00:00',
    completed_at: '2026-10-29T00:00:05',
    duration_ms: 5000,
    tasks_executed: 1,
    tasks_succeeded: 0,
    tasks_failed: 1,
    error_summary: 'boom',
    ...overrides,
  }
}

function buildCapacityRecord(overrides: Partial<CapacityRecord> = {}): CapacityRecord {
  return {
    id: 'cap-1',
    service_type: 'image',
    remaining_quota: 10,
    total_quota: 100,
    reset_at: null,
    last_checked_at: '2026-10-29T00:00:00',
    ...overrides,
  }
}

interface ServiceStubs {
  logService: ILogService
  taskService: ITaskService
  capacityService: ICapacityService
  database: DatabaseService
  poolStatsService: DatabasePoolStatsService
}

function buildStubs(overrides: {
  stats?: Partial<{ totalExecutions: number; successRate: number; avgDuration: number; errorCount: number }>
  distribution?: { type: string; count: number }[]
  failedLogs?: ExecutionLog[]
  dlqCount?: number
  capacityRecords?: CapacityRecord[]
  connected?: boolean
  poolReport?: unknown
} = {}): ServiceStubs {
  const logService = {
    getExecutionStatsOverview: vi.fn().mockResolvedValue({
      totalExecutions: 10,
      successRate: 0.8,
      avgDuration: 1500,
      errorCount: 2,
      ...overrides.stats,
    }),
    getExecutionStatsDistribution: vi.fn().mockResolvedValue(overrides.distribution ?? [{ type: 'text', count: 7 }]),
    getRecentFailedExecutions: vi.fn().mockResolvedValue(overrides.failedLogs ?? [buildExecutionLog()]),
  } as unknown as ILogService

  const taskService = {
    countUnresolvedDeadLetters: vi.fn().mockResolvedValue(overrides.dlqCount ?? 3),
    getDeadLetterQueue: vi.fn().mockResolvedValue(overrides.dlqItems ?? [
      { id: 'dlq-1', task_type: 'image', error_message: 'quota', failed_at: '2026-10-29T01:00:00' },
    ]),
  } as unknown as ITaskService

  const capacityService = {
    getAll: vi.fn().mockResolvedValue(overrides.capacityRecords ?? [buildCapacityRecord()]),
  } as unknown as ICapacityService

  const database = {
    isConnected: vi.fn().mockResolvedValue(overrides.connected ?? true),
  } as unknown as DatabaseService

  const poolStatsService = {
    getReport: vi.fn().mockReturnValue(overrides.poolReport ?? null),
  } as unknown as DatabasePoolStatsService

  return { logService, taskService, capacityService, database, poolStatsService }
}

function buildService(stubs: ServiceStubs): DashboardService {
  return new DashboardService(
    stubs.logService,
    stubs.taskService,
    stubs.capacityService,
    stubs.database,
    stubs.poolStatsService
  )
}

describe('DashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOperationsOverview', () => {
    it('聚合全部六个板块数据', async () => {
      const service = buildService(buildStubs())

      const overview = await service.getOperationsOverview('owner-1')

      expect(expectOk(overview.executions)).toEqual({
        totalExecutions: 10,
        successRate: 0.8,
        failureRate: 0.2,
        avgDuration: 1500,
        errorCount: 2,
      })
      expect(expectOk(overview.distribution)).toEqual([{ type: 'text', count: 7 }])
      const failures = expectOk(overview.recentFailures)
      expect(failures).toHaveLength(1)
      expect(failures[0]).toMatchObject({ id: 'log-1', status: 'failed' })
      expect(expectOk(overview.dlq)).toMatchObject({ unresolvedCount: 3 })
      expect(expectOk(overview.capacity).records).toHaveLength(1)
      expect(expectOk(overview.health)).toMatchObject({ database: true, pool: null })
    })

    it('owner 隔离参数透传给执行统计与 DLQ 查询', async () => {
      const stubs = buildStubs()
      const service = buildService(stubs)

      await service.getOperationsOverview('owner-42')

      expect(stubs.logService.getExecutionStatsOverview).toHaveBeenCalledWith('owner-42')
      expect(stubs.logService.getRecentFailedExecutions).toHaveBeenCalledWith(5, 'owner-42')
      expect(stubs.taskService.countUnresolvedDeadLetters).toHaveBeenCalledWith('owner-42')
      expect(stubs.taskService.getDeadLetterQueue).toHaveBeenCalledWith('owner-42', 5)
    })

    it('容量剩余不足 20% 的服务进入 atRisk', async () => {
      const service = buildService(buildStubs({
        capacityRecords: [
          buildCapacityRecord({ service_type: 'image', remaining_quota: 10, total_quota: 100 }),
          buildCapacityRecord({ id: 'cap-2', service_type: 'video', remaining_quota: 80, total_quota: 100 }),
          buildCapacityRecord({ id: 'cap-3', service_type: 'music', remaining_quota: 0, total_quota: 0 }),
        ],
      }))

      const overview = await service.getOperationsOverview()

      const capacity = expectOk(overview.capacity)
      expect(capacity.atRisk).toEqual(['image'])
      expect(capacity.records[2]).toMatchObject({ usage_ratio: 0 })
    })

    it('单一板块失败时降级为 { error }，不影响其余板块', async () => {
      const stubs = buildStubs()
      vi.mocked(stubs.logService.getExecutionStatsOverview).mockRejectedValue(new Error('stats down'))
      vi.mocked(stubs.capacityService.getAll).mockRejectedValue(new Error('capacity down'))
      const service = buildService(stubs)

      const overview = await service.getOperationsOverview('owner-1')

      expect(overview.executions).toEqual({ error: 'stats down' })
      expect(overview.capacity).toEqual({ error: 'capacity down' })
      expect(expectOk(overview.distribution)).toEqual([{ type: 'text', count: 7 }])
      expect(expectOk(overview.dlq)).toMatchObject({ unresolvedCount: 3 })
      expect(expectOk(overview.health)).toMatchObject({ database: true })
    })

    it('健康板块汇总数据库连通性、进程运行时长与连接池报告', async () => {
      const poolReport = {
        pool: { totalCount: 5, idleCount: 4, waitingCount: 0 },
        status: 'healthy',
        warning: null,
        recommendation: null,
      }
      const service = buildService(buildStubs({ connected: false, poolReport }))

      const overview = await service.getOperationsOverview()

      const health = expectOk(overview.health)
      expect(health.database).toBe(false)
      expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0)
      expect(health.pool).toEqual(poolReport)
    })
  })
})
