/**
 * LogService Domain Interface
 *
 * Defines the contract for all ExecutionLog-related operations.
 */

import type { ExecutionLog, ExecutionLogDetail, CreateExecutionLog, CreateExecutionLogDetail, UpdateExecutionLog } from '../../../database/types.js'

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
}
