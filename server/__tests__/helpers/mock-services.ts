import { vi } from 'vitest'
import type { ILogService, LogStats } from '../../services/domain/interfaces/log.interface.js'
import type { ITaskService } from '../../services/domain/interfaces/task.interface.js'
import type {
  AuditLog,
  AuditLogQuery,
  AuditStats,
  CreateAuditLog,
  CreateExecutionLog,
  CreateExecutionLogDetail,
  ExecutionLog,
  ExecutionLogDetail,
  ExternalApiLog,
  ExternalApiLogQuery,
  ExternalApiLogStats,
  UpdateExecutionLog,
  TaskQueueItem,
  DeadLetterQueueItem,
  CreateTaskQueueItem,
  UpdateTaskQueueItem,
} from '../../database/types.js'
import {
  TaskStatus,
  ExecutionStatus,
  TriggerType,
} from '@mnx/shared-types/entities/enums.js'

/**
 * 创建 ILogService 的全量 mock。所有方法返回安全的默认值（空数组/null/Promise<void>）。
 *
 * 用法：
 *   const mock = createMockLogService()
 *   // 覆盖特定方法：
 *   mock.createDetail = vi.fn().mockResolvedValue({ id: 'detail-1' })
 *
 * 设计原因：WorkflowEngine 重构（ADR-0013 Phase A）后，构造函数强制注入
 * logService / taskService 以彻底消除 workflow ↔ service-registration 的循环依赖。
 * 所有 WorkflowEngine 测试调用点都需要这些 mock。
 */
export function createMockLogService(overrides: Partial<ILogService> = {}): ILogService {
  const emptyLogStats: LogStats = {
    totalExecutions: 0,
    successRate: 0,
    avgDuration: 0,
    errorCount: 0,
  }

  return {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (data: CreateExecutionLog) => ({
      id: 'log-mock',
      owner_id: null,
      job_id: null,
      started_at: new Date().toISOString(),
      completed_at: null,
      duration_ms: null,
      tasks_executed: 0,
      tasks_succeeded: 0,
      tasks_failed: 0,
      error_summary: null,
      ...data,
    })) as ILogService['create'],
    update: vi.fn().mockImplementation(async (id: string, data: UpdateExecutionLog) => ({
      id,
      owner_id: null,
      job_id: null,
      trigger_type: TriggerType.MANUAL,
      status: data.status ?? ExecutionStatus.COMPLETED,
      started_at: new Date().toISOString(),
      completed_at: data.completed_at ?? new Date().toISOString(),
      duration_ms: data.duration_ms ?? null,
      tasks_executed: data.tasks_executed ?? 0,
      tasks_succeeded: data.tasks_succeeded ?? 0,
      tasks_failed: data.tasks_failed ?? 0,
      error_summary: data.error_summary ?? null,
    })) as ILogService['update'],
    createDetail: vi.fn().mockImplementation(async (data: CreateExecutionLogDetail) => ({
      id: 'detail-mock',
      log_id: data.log_id,
      node_id: data.node_id ?? null,
      node_type: data.node_type ?? null,
      service_name: data.service_name ?? null,
      method_name: data.method_name ?? null,
      input_payload: data.input_payload ?? null,
      output_result: data.output_result ?? null,
      error_message: data.error_message ?? null,
      started_at: data.started_at ?? null,
      completed_at: data.completed_at ?? null,
      duration_ms: data.duration_ms ?? null,
    })) as ILogService['createDetail'],
    updateDetail: vi.fn().mockResolvedValue(undefined),
    getDetails: vi.fn().mockResolvedValue([]) as ILogService['getDetails'],
    getStats: vi.fn().mockResolvedValue(emptyLogStats),
    getExecutionStatsOverview: vi.fn().mockResolvedValue(emptyLogStats),
    getExecutionStatsTrend: vi.fn().mockResolvedValue([]),
    getExecutionStatsDistribution: vi.fn().mockResolvedValue([]),
    getExecutionStatsErrors: vi.fn().mockResolvedValue([]),
    getRecentFailedExecutions: vi.fn().mockResolvedValue([]) as ILogService['getRecentFailedExecutions'],
    createAuditLog: vi.fn().mockImplementation(async (data: CreateAuditLog) => ({
      id: 'audit-mock',
      username: null,
      query_params: null,
      response_body: null,
      error_message: null,
      duration_ms: null,
      trace_id: null,
      created_at: new Date().toISOString(),
      ...data,
    })) as ILogService['createAuditLog'],
    getAuditLogById: vi.fn().mockResolvedValue(null),
    getAuditLogs: vi.fn().mockResolvedValue({ logs: [] as AuditLog[], total: 0 }),
    getAuditStats: vi.fn().mockResolvedValue({
      total_logs: 0,
      by_action: {} as AuditStats['by_action'],
      by_resource_type: {},
      by_response_status: {},
      avg_duration_ms: 0,
    } satisfies AuditStats),
    getUniqueRequestPaths: vi.fn().mockResolvedValue([]),
    getUniqueAuditUsers: vi.fn().mockResolvedValue([]),
    getExternalApiLogById: vi.fn().mockResolvedValue(null),
    getExternalApiLogs: vi.fn().mockResolvedValue({ logs: [] as ExternalApiLog[], total: 0 }),
    getExternalApiLogStats: vi.fn().mockResolvedValue({
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      operations: [],
    } as unknown as ExternalApiLogStats),
    getUniqueExternalApiOperations: vi.fn().mockResolvedValue([]),
    getUniqueExternalApiProviders: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

/**
 * 创建 ITaskService 的全量 mock。所有方法返回安全的默认值。
 *
 * 关键方法（被 workflow queue-executor 使用）：
 * - getPendingByJobId / getPendingByType：默认空数组
 * - markRunning / markCompleted / markFailed：返回最小 TaskQueueItem mock
 * - moveToDeadLetter：返回 void
 */
export function createMockTaskService(overrides: Partial<ITaskService> = {}): ITaskService {
  const emptyTask = (id: string, status: TaskStatus): TaskQueueItem => ({
    id,
    job_id: null,
    task_type: 'mock',
    payload: '{}',
    priority: 1,
    status,
    retry_count: 0,
    max_retries: 3,
    result: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    owner_id: null,
  })

  return {
    create: vi.fn().mockImplementation(async (data: CreateTaskQueueItem) => ({
      id: 'task-mock',
      job_id: data.job_id ?? null,
      task_type: data.task_type,
      payload: data.payload ?? '{}',
      priority: data.priority ?? 1,
      status: TaskStatus.PENDING,
      retry_count: 0,
      max_retries: data.max_retries ?? 3,
      result: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      owner_id: null,
    })) as ITaskService['create'],
    getById: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation(async (id: string, data: UpdateTaskQueueItem) => ({
      ...emptyTask(id, TaskStatus.PENDING),
      ...data,
    })) as ITaskService['update'],
    delete: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue({ tasks: [] as TaskQueueItem[], total: 0 }),
    getPending: vi.fn().mockResolvedValue([]),
    getByStatus: vi.fn().mockResolvedValue([]),
    moveToDeadLetter: vi.fn().mockResolvedValue(undefined),
    retryFromDeadLetter: vi.fn().mockImplementation(async (taskId: string) => emptyTask(taskId, TaskStatus.PENDING)) as ITaskService['retryFromDeadLetter'],
    getDeadLetterQueue: vi.fn().mockResolvedValue([]) as ITaskService['getDeadLetterQueue'],
    countUnresolvedDeadLetters: vi.fn().mockResolvedValue(0) as ITaskService['countUnresolvedDeadLetters'],
    getDeadLetterItemById: vi.fn().mockResolvedValue(null),
    resolveDeadLetterItem: vi.fn().mockResolvedValue(undefined),
    incrementRetryCount: vi.fn().mockResolvedValue(undefined),
    getByJobId: vi.fn().mockResolvedValue([]),
    markRunning: vi.fn().mockImplementation(async (id: string) => emptyTask(id, TaskStatus.RUNNING)) as ITaskService['markRunning'],
    markCompleted: vi.fn().mockImplementation(async (id: string) => emptyTask(id, TaskStatus.COMPLETED)) as ITaskService['markCompleted'],
    markFailed: vi.fn().mockImplementation(async (id: string) => emptyTask(id, TaskStatus.FAILED)) as ITaskService['markFailed'],
    getPendingByJobId: vi.fn().mockResolvedValue([]),
    getPendingByType: vi.fn().mockResolvedValue([]),
    getQueueStats: vi.fn().mockResolvedValue({
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    }),
    ...overrides,
  }
}

// 类型完整性编译期检查：mock 工厂必须可赋值给对应接口（防止接口扩展时遗漏 stub）。
// 仅类型推导，不生成运行时代码。
const _logCompileCheck: ILogService = createMockLogService()
const _taskCompileCheck: ITaskService = createMockTaskService()
void _logCompileCheck
void _taskCompileCheck

// 以下类型仅用于 ensure mock helper 与 domain interface 同步演进，避免 import 被裁剪。
export type {
  ExecutionLog,
  ExecutionLogDetail,
  UpdateExecutionLog,
  CreateExecutionLog,
  CreateExecutionLogDetail,
  AuditLog,
  AuditLogQuery,
  AuditStats,
  CreateAuditLog,
  ExternalApiLog,
  ExternalApiLogQuery,
  ExternalApiLogStats,
  TaskQueueItem,
  DeadLetterQueueItem,
  CreateTaskQueueItem,
  UpdateTaskQueueItem,
}
