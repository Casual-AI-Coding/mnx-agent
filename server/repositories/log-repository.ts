import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import { TriggerType, ExecutionStatus } from '../database/types.js'
import type {
  ExecutionLog,
  ExecutionLogRow,
  ExecutionLogDetail,
  ExecutionLogDetailRow,
  CreateExecutionLog,
  CreateExecutionLogDetail,
  UpdateExecutionLog,
  RunStats,
} from '../database/types.js'
import { BaseRepository } from './base-repository.js'

import { toLocalISODateString } from '../lib/date-utils.js'

function rowToExecutionLog(row: ExecutionLogRow): ExecutionLog {
  return {
    ...row,
    trigger_type: row.trigger_type as TriggerType,
    status: row.status as ExecutionStatus,
  }
}

function rowToExecutionLogDetail(row: ExecutionLogDetailRow): ExecutionLogDetail {
  return { ...row }
}

export interface ExecutionLogListOptions {
  jobId?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  ownerId?: string
}

export class LogRepository extends BaseRepository<ExecutionLog, CreateExecutionLog, UpdateExecutionLog> {
  protected readonly tableName = 'execution_logs'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): ExecutionLog {
    return rowToExecutionLog(row as ExecutionLogRow)
  }

  async getAll(jobId?: string, limit: number = 100, ownerId?: string): Promise<ExecutionLog[]> {
    let rows: ExecutionLogRow[]
    if (ownerId) {
      if (jobId) {
        rows = await this.conn.query<ExecutionLogRow>(
          'SELECT * FROM execution_logs WHERE job_id = $1 AND owner_id = $2 ORDER BY started_at DESC LIMIT $3',
          [jobId, ownerId, limit]
        )
      } else {
        rows = await this.conn.query<ExecutionLogRow>(
          'SELECT * FROM execution_logs WHERE owner_id = $1 ORDER BY started_at DESC LIMIT $2',
          [ownerId, limit]
        )
      }
    } else {
      if (jobId) {
        rows = await this.conn.query<ExecutionLogRow>(
          'SELECT * FROM execution_logs WHERE job_id = $1 ORDER BY started_at DESC LIMIT $2',
          [jobId, limit]
        )
      } else {
        rows = await this.conn.query<ExecutionLogRow>(
          'SELECT * FROM execution_logs ORDER BY started_at DESC LIMIT $1',
          [limit]
        )
      }
    }
    return rows.map(rowToExecutionLog)
  }

  async getPaginated(options: ExecutionLogListOptions): Promise<{ logs: ExecutionLog[]; total: number }> {
    const { limit = 50, offset = 0, startDate, endDate, ownerId } = options

    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (ownerId) {
      conditions.push(`owner_id = $${paramIndex}`)
      params.push(ownerId)
      paramIndex++
    }

    if (startDate) {
      conditions.push(`started_at >= $${paramIndex}`)
      params.push(startDate)
      paramIndex++
    }
    if (endDate) {
      conditions.push(`started_at <= $${paramIndex}`)
      params.push(endDate)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM execution_logs ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<ExecutionLogRow>(
      `SELECT * FROM execution_logs ${whereClause} ORDER BY started_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      logs: rows.map(rowToExecutionLog),
      total,
    }
  }

  async create(log: CreateExecutionLog, ownerId?: string): Promise<ExecutionLog> {
    const id = uuidv4()
    const now = toLocalISODateString()
    await this.conn.execute(
      `INSERT INTO execution_logs (id, job_id, trigger_type, status, started_at, tasks_executed, tasks_succeeded, tasks_failed, error_summary, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, log.job_id ?? null, log.trigger_type, log.status, now, log.tasks_executed ?? 0, log.tasks_succeeded ?? 0, log.tasks_failed ?? 0, log.error_summary ?? null, ownerId ?? null]
    )
    return (await this.getById(id))!
  }

  async update(id: string, updates: UpdateExecutionLog, ownerId?: string): Promise<ExecutionLog | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []
    let paramIndex = 1

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`)
      values.push(updates.status)
      paramIndex++
    }
    if (updates.completed_at !== undefined) {
      fields.push(`completed_at = $${paramIndex}`)
      values.push(updates.completed_at)
      paramIndex++
    }
    if (updates.duration_ms !== undefined) {
      fields.push(`duration_ms = $${paramIndex}`)
      values.push(updates.duration_ms)
      paramIndex++
    }
    if (updates.tasks_executed !== undefined) {
      fields.push(`tasks_executed = $${paramIndex}`)
      values.push(updates.tasks_executed)
      paramIndex++
    }
    if (updates.tasks_succeeded !== undefined) {
      fields.push(`tasks_succeeded = $${paramIndex}`)
      values.push(updates.tasks_succeeded)
      paramIndex++
    }
    if (updates.tasks_failed !== undefined) {
      fields.push(`tasks_failed = $${paramIndex}`)
      values.push(updates.tasks_failed)
      paramIndex++
    }
    if (updates.error_summary !== undefined) {
      fields.push(`error_summary = $${paramIndex}`)
      values.push(updates.error_summary)
      paramIndex++
    }

    if (fields.length === 0) return existing
    values.push(id)
    if (ownerId) values.push(ownerId)

    const whereClause = ownerId
      ? `WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}`
      : `WHERE id = $${paramIndex}`

    await this.conn.execute(
      `UPDATE execution_logs SET ${fields.join(', ')} ${whereClause}`,
      values
    )
    return this.getById(id, ownerId)
  }

  async complete(id: string, stats: RunStats, ownerId?: string): Promise<ExecutionLog | null> {
    const status = stats.success ? 'completed' : 'failed'
    if (ownerId) {
      await this.conn.execute(
        `UPDATE execution_logs SET status = $1, completed_at = $2, duration_ms = $3, tasks_executed = $4, tasks_succeeded = $5, tasks_failed = $6, error_summary = $7 WHERE id = $8 AND owner_id = $9`,
        [status, toLocalISODateString(), stats.durationMs, stats.tasksExecuted, stats.tasksSucceeded, stats.tasksFailed, stats.errorSummary ?? null, id, ownerId]
      )
    } else {
      await this.conn.execute(
        `UPDATE execution_logs SET status = $1, completed_at = $2, duration_ms = $3, tasks_executed = $4, tasks_succeeded = $5, tasks_failed = $6, error_summary = $7 WHERE id = $8`,
        [status, toLocalISODateString(), stats.durationMs, stats.tasksExecuted, stats.tasksSucceeded, stats.tasksFailed, stats.errorSummary ?? null, id]
      )
    }
    return this.getById(id, ownerId)
  }

  async getRecent(limit: number = 20, ownerId?: string): Promise<ExecutionLog[]> {
    return this.getAll(undefined, limit, ownerId)
  }

  async createDetail(data: CreateExecutionLogDetail): Promise<string> {
    const id = uuidv4()
    const now = toLocalISODateString()
    const inputPayload = data.input_payload ?? null
    const outputResult = data.output_result ?? null

    if (this.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO execution_log_details (id, log_id, node_id, node_type, service_name, method_name, input_payload, output_result, error_message, started_at, completed_at, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, data.log_id, data.node_id ?? null, data.node_type ?? null, data.service_name ?? null, data.method_name ?? null, inputPayload, outputResult, data.error_message ?? null, data.started_at ?? now, data.completed_at ?? null, data.duration_ms ?? null]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO execution_log_details (id, log_id, node_id, node_type, service_name, method_name, input_payload, output_result, error_message, started_at, completed_at, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.log_id, data.node_id ?? null, data.node_type ?? null, data.service_name ?? null, data.method_name ?? null, inputPayload, outputResult, data.error_message ?? null, data.started_at ?? now, data.completed_at ?? null, data.duration_ms ?? null]
      )
    }
    return id
  }

  async updateDetail(
    id: string,
    data: {
      output_result?: string
      error_message?: string
      completed_at?: string
      duration_ms?: number
    }
  ): Promise<void> {
    const updates: string[] = []
    const values: (string | number | null)[] = []
    let paramIndex = 1

    if (data.output_result !== undefined) {
      updates.push(`output_result = $${paramIndex}`)
      values.push(data.output_result)
      paramIndex++
    }
    if (data.error_message !== undefined) {
      updates.push(`error_message = $${paramIndex}`)
      values.push(data.error_message)
      paramIndex++
    }
    if (data.completed_at !== undefined) {
      updates.push(`completed_at = $${paramIndex}`)
      values.push(data.completed_at)
      paramIndex++
    }
    if (data.duration_ms !== undefined) {
      updates.push(`duration_ms = $${paramIndex}`)
      values.push(data.duration_ms)
      paramIndex++
    }

    if (updates.length === 0) return

    values.push(id)
    await this.conn.execute(
      `UPDATE execution_log_details SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }

  async getDetailsByLogId(logId: string): Promise<ExecutionLogDetail[]> {
    const rows = await this.conn.query<ExecutionLogDetailRow>(
      'SELECT * FROM execution_log_details WHERE log_id = $1 ORDER BY started_at',
      [logId]
    )
    return rows.map(rowToExecutionLogDetail)
  }

  async getStatsOverview(ownerId?: string): Promise<{
    totalExecutions: number
    successRate: number
    avgDuration: number
    errorCount: number
  }> {
    const ownerFilter = ownerId ? 'WHERE owner_id = $1' : ''
    const params = ownerId ? [ownerId] : []

    const rows = await this.conn.query<{
      totalexecutions: string
      successcount: string
      avgduration: string
      errorcount: string
    }>(`
      SELECT
        COUNT(*) as totalExecutions,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as successCount,
        COALESCE(AVG(duration_ms), 0) as avgDuration,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as errorCount
      FROM execution_logs
      ${ownerFilter}
    `, params)

    const stats = rows[0]
    const totalExecutions = parseInt(stats?.totalexecutions ?? '0', 10)
    const successCount = parseInt(stats?.successcount ?? '0', 10)
    const avgDuration = parseFloat(stats?.avgduration ?? '0')
    const errorCount = parseInt(stats?.errorcount ?? '0', 10)

    return {
      totalExecutions,
      successRate: totalExecutions > 0 ? successCount / totalExecutions : 0,
      avgDuration: Math.round(avgDuration || 0),
      errorCount,
    }
  }

  async getStatsTrend(period: 'day' | 'week' | 'month', ownerId?: string): Promise<{ date: string; total: number; success: number; failed: number }[]> {
    let dateFormat: string
    if (this.isPostgres()) {
      switch (period) {
        case 'day':
          dateFormat = 'YYYY-MM-DD'
          break
        case 'week':
          dateFormat = 'IYYY-IW'
          break
        case 'month':
          dateFormat = 'YYYY-MM'
          break
      }
    } else {
      switch (period) {
        case 'day':
          dateFormat = '%Y-%m-%d'
          break
        case 'week':
          dateFormat = '%Y-%W'
          break
        case 'month':
          dateFormat = '%Y-%m'
          break
      }
    }

    const ownerFilter = ownerId ? 'WHERE owner_id = $1' : ''
    const params = ownerId ? [ownerId] : []

    if (this.isPostgres()) {
      const rows = await this.conn.query<{ date: string; total: string; success: string; failed: string }>(`
        SELECT
          TO_CHAR(started_at, '${dateFormat}') as date,
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as success,
          COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed
        FROM execution_logs
        ${ownerFilter}
        GROUP BY TO_CHAR(started_at, '${dateFormat}')
        ORDER BY date DESC
        LIMIT 90
      `, params)
      return rows.map(r => ({
        date: r.date,
        total: parseInt(r.total, 10),
        success: parseInt(r.success, 10),
        failed: parseInt(r.failed, 10),
      }))
    } else {
      const rows = await this.conn.query<{ date: string; total: string; success: string; failed: string }>(`
        SELECT
          strftime('${dateFormat}', started_at) as date,
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as success,
          COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed
        FROM execution_logs
        ${ownerFilter}
        GROUP BY strftime('${dateFormat}', started_at)
        ORDER BY date DESC
        LIMIT 90
      `, params)
      return rows.map(r => ({
        date: r.date,
        total: parseInt(r.total, 10),
        success: parseInt(r.success, 10),
        failed: parseInt(r.failed, 10),
      }))
    }
  }

  async getStatsDistribution(ownerId?: string): Promise<{ type: string; count: number }[]> {
    const ownerFilter = ownerId ? 'WHERE el.owner_id = $1' : ''
    const params = ownerId ? [ownerId] : []

    const rows = await this.conn.query<{ type: string; count: string }>(`
      SELECT
        COALESCE(eld.node_type, 'unknown') as type,
        COUNT(DISTINCT el.id) as count
      FROM execution_logs el
      LEFT JOIN execution_log_details eld ON el.id = eld.log_id
      ${ownerFilter}
      GROUP BY COALESCE(eld.node_type, 'unknown')
      ORDER BY count DESC
    `, params)

    const result = rows.map(r => ({ type: r.type, count: parseInt(r.count, 10) }))
    return result.length > 0 ? result.filter(r => r.type !== 'unknown') : []
  }

  async getStatsErrors(limit: number = 10, ownerId?: string): Promise<{ errorSummary: string; count: number }[]> {
    const ownerFilter = ownerId ? 'WHERE owner_id = $1' : ''
    const params = ownerId ? [ownerId, limit] : [limit]

    const rows = await this.conn.query<{ errorsummary: string; count: string }>(`
      SELECT
        COALESCE(NULLIF(TRIM(error_summary), ''), 'Unknown error') as errorSummary,
        COUNT(*) as count
      FROM execution_logs
      ${ownerFilter}
        ${ownerId ? 'AND' : 'WHERE'} error_summary IS NOT NULL AND error_summary != ''
      GROUP BY error_summary
      ORDER BY count DESC
      LIMIT $${ownerId ? 2 : 1}
    `, params)

    return rows.map(r => ({ errorSummary: r.errorsummary, count: parseInt(r.count, 10) }))
  }
}
