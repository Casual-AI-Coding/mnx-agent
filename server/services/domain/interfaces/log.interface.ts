/**
 * LogService Domain Interface
 *
 * Defines the contract for all ExecutionLog-related operations.
 */

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
} from '../../../database/types.js'

export interface LogFilter {
  jobId?: string
  ownerId?: string
  limit?: number
  startDate?: string
  endDate?: string
}

export interface LogStats {
  totalExecutions: number
  successRate: number
  avgDuration: number
  errorCount: number
}

export interface ILogService {
  /**
   * Get all execution logs, optionally filtered
   */
  getAll(filter: LogFilter): Promise<ExecutionLog[]>

  /**
   * Get a single execution log by ID
   */
  getById(id: string, ownerId?: string): Promise<ExecutionLog | null>

  /**
   * Create a new execution log
   */
  create(data: CreateExecutionLog, ownerId?: string): Promise<ExecutionLog>

  /**
   * Update an existing execution log
   */
  update(id: string, data: UpdateExecutionLog, ownerId?: string): Promise<ExecutionLog>

  /**
   * Create a new execution log detail entry
   */
  createDetail(data: CreateExecutionLogDetail): Promise<ExecutionLogDetail>

  /**
   * Get all detail entries for a specific execution log
   */
  getDetails(logId: string): Promise<ExecutionLogDetail[]>

  /**
   * Get aggregate statistics for execution logs
   */
  getStats(ownerId?: string): Promise<LogStats>

  getExecutionStatsOverview(ownerId?: string): Promise<LogStats>

  getExecutionStatsTrend(period: 'day' | 'week' | 'month', ownerId?: string): Promise<{ date: string; total: number; success: number; failed: number }[]>

  getExecutionStatsDistribution(ownerId?: string): Promise<{ type: string; count: number }[]>

  getExecutionStatsErrors(limit?: number, ownerId?: string): Promise<{ errorSummary: string; count: number }[]>

  createAuditLog(data: CreateAuditLog): Promise<AuditLog>

  getAuditLogById(id: string, ownerId?: string): Promise<AuditLog | null>

  getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }>

  getAuditStats(userId?: string): Promise<AuditStats>

  getUniqueRequestPaths(userId?: string): Promise<string[]>

  getUniqueAuditUsers(userId?: string): Promise<{ id: string; username: string }[]>

  getExternalApiLogById(id: number): Promise<ExternalApiLog | null>

  getExternalApiLogs(query: ExternalApiLogQuery): Promise<{ logs: ExternalApiLog[]; total: number }>

  getExternalApiLogStats(userId?: string): Promise<ExternalApiLogStats>

  getUniqueExternalApiOperations(userId?: string): Promise<string[]>

  getUniqueExternalApiProviders(): Promise<string[]>
}
