import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection, createConnection, getConnection, closeConnection, QueryResultRow } from './connection.js'
import { TaskStatus, TriggerType, ExecutionStatus } from './types.js'
import type {
  CronJob,
  TaskQueueItem,
  ExecutionLog,
  ExecutionLogDetail,
  CapacityRecord,
  WorkflowTemplate,
  CreateCronJob,
  CreateTaskQueueItem,
  CreateExecutionLog,
  CreateExecutionLogDetail,
  UpdateCronJob,
  UpdateTaskQueueItem,
  UpdateExecutionLog,
  UpdateCapacityRecord,
  UpdateWorkflowTemplate,
  RunStats,
  CronJobRow,
  TaskQueueRow,
  ExecutionLogRow,
  ExecutionLogDetailRow,
  CapacityRecordRow,
  WorkflowTemplateRow,
  MediaRecord,
  MediaRecordRow,
  CreateMediaRecord,
  PromptTemplate,
  PromptTemplateRow,
  CreatePromptTemplate,
  UpdatePromptTemplate,
  AuditLog,
  AuditLogRow,
  CreateAuditLog,
  AuditLogQuery,
  AuditStats,
  ServiceNodePermission,
  ServiceNodePermissionRow,
} from './types.js'

function toISODate(): string {
  return new Date().toISOString()
}

function rowToCronJob(row: CronJobRow): CronJob {
  return { 
    ...row, 
    is_active: typeof row.is_active === 'boolean' ? row.is_active : row.is_active === 1,
    timeout_ms: row.timeout_ms ?? 300000,
  }
}

function rowToTaskQueueItem(row: TaskQueueRow): TaskQueueItem {
  return { ...row, status: row.status as TaskStatus }
}

function rowToExecutionLog(row: ExecutionLogRow): ExecutionLog {
  return { ...row, trigger_type: row.trigger_type as TriggerType, status: row.status as ExecutionStatus }
}

function rowToExecutionLogDetail(row: ExecutionLogDetailRow): ExecutionLogDetail {
  return { ...row }
}

function rowToCapacityRecord(row: CapacityRecordRow): CapacityRecord {
  return row
}

function rowToWorkflowTemplate(row: WorkflowTemplateRow): WorkflowTemplate {
  return { ...row, is_public: typeof row.is_public === 'boolean' ? row.is_public : row.is_public === 1 }
}

function rowToMediaRecord(row: MediaRecordRow): MediaRecord {
  const metadata = row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null
  return {
    ...row,
    type: row.type as MediaRecord['type'],
    source: row.source as MediaRecord['source'],
    is_deleted: typeof row.is_deleted === 'boolean' ? row.is_deleted : row.is_deleted === 1,
    metadata,
  }
}

function rowToPromptTemplate(row: PromptTemplateRow): PromptTemplate {
  const variables = row.variables ? (typeof row.variables === 'string' ? JSON.parse(row.variables) : row.variables) : []
  return {
    ...row,
    category: row.category as PromptTemplate['category'],
    is_builtin: typeof row.is_builtin === 'boolean' ? row.is_builtin : row.is_builtin === 1,
    variables,
  }
}

function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    ...row,
    action: row.action as AuditLog['action'],
  }
}

function rowToServiceNodePermission(row: ServiceNodePermissionRow): ServiceNodePermission {
  return {
    ...row,
  }
}

export class DatabaseService {
  private conn: DatabaseConnection

  constructor(conn: DatabaseConnection) {
    this.conn = conn
  }

  async init(): Promise<void> {
    const { runMigrations } = await import('./migrations-async.js')
    await runMigrations(this.conn)
  }

  async close(): Promise<void> {
    await closeConnection()
  }

  getConnection(): DatabaseConnection {
    return this.conn
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.conn.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  isPostgres(): boolean {
    return this.conn.isPostgres()
  }

  private formatDateForPostgres(date: string): string {
    return date
  }

  private getTimestampDefault(): string {
    return toISODate()
  }

  async getAllCronJobs(ownerId?: string): Promise<CronJob[]> {
    if (ownerId) {
      const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId])
      return rows.map(rowToCronJob)
    }
    const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs ORDER BY created_at DESC')
    return rows.map(rowToCronJob)
  }

  async getCronJobById(id: string, ownerId?: string): Promise<CronJob | null> {
    if (ownerId) {
      const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return rows[0] ? rowToCronJob(rows[0]) : null
    }
    const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE id = $1', [id])
    return rows[0] ? rowToCronJob(rows[0]) : null
  }

  async createCronJob(job: CreateCronJob, ownerId?: string): Promise<CronJob> {
    const id = uuidv4()
    const now = toISODate()
    const isActive = job.is_active !== false
    const timeoutMs = job.timeout_ms ?? 300000
    const timezone = job.timezone ?? 'UTC'
    
    if (this.conn.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_id, timezone, created_at, updated_at, timeout_ms, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, job.name, job.description ?? null, job.cron_expression, isActive, job.workflow_id ?? null, timezone, now, now, timeoutMs, ownerId ?? null]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_id, timezone, created_at, updated_at, timeout_ms, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, job.name, job.description ?? null, job.cron_expression, isActive ? 1 : 0, job.workflow_id ?? null, timezone, now, now, timeoutMs, ownerId ?? null]
      )
    }
    return (await this.getCronJobById(id))!
  }

  async updateCronJob(id: string, updates: UpdateCronJob, ownerId?: string): Promise<CronJob | null> {
    const existing = await this.getCronJobById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramIndex = 1

    const addField = (name: string, value: string | number | boolean | null | undefined) => {
      if (value !== undefined) {
        fields.push(`${name} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    addField('name', updates.name)
    addField('description', updates.description)
    addField('cron_expression', updates.cron_expression)
    if (updates.is_active !== undefined) {
      addField('is_active', this.conn.isPostgres() ? updates.is_active : (updates.is_active ? 1 : 0))
    }
    addField('workflow_id', updates.workflow_id)
    addField('timezone', updates.timezone)
    addField('last_run_at', updates.last_run_at)
    addField('next_run_at', updates.next_run_at)
    addField('total_runs', updates.total_runs)
    addField('total_failures', updates.total_failures)
    addField('timeout_ms', updates.timeout_ms)

    if (fields.length === 0) return existing
    
    fields.push(`updated_at = $${paramIndex}`)
    values.push(toISODate())
    paramIndex++
    values.push(id)

    await this.conn.execute(
      `UPDATE cron_jobs SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    return this.getCronJobById(id)
  }

  async deleteCronJob(id: string, ownerId?: string): Promise<boolean> {
    if (ownerId) {
      const result = await this.conn.execute('DELETE FROM cron_jobs WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return result.changes > 0
    }
    const result = await this.conn.execute('DELETE FROM cron_jobs WHERE id = $1', [id])
    return result.changes > 0
  }

  async toggleCronJobActive(id: string, ownerId?: string): Promise<CronJob | null> {
    const existing = await this.getCronJobById(id, ownerId)
    if (!existing) return null
    
    const newIsActive = !existing.is_active
    const now = toISODate()
    
    if (this.conn.isPostgres()) {
      await this.conn.execute(
        'UPDATE cron_jobs SET is_active = $1, updated_at = $2 WHERE id = $3',
        [newIsActive, now, id]
      )
    } else {
      await this.conn.execute(
        'UPDATE cron_jobs SET is_active = ?, updated_at = ? WHERE id = ?',
        [newIsActive ? 1 : 0, now, id]
      )
    }
    return this.getCronJobById(id)
  }

  async updateCronJobRunStats(id: string, stats: RunStats, ownerId?: string): Promise<CronJob | null> {
    const existing = await this.getCronJobById(id, ownerId)
    if (!existing) return null
    
    const newTotalRuns = existing.total_runs + 1
    const newTotalFailures = stats.success ? existing.total_failures : existing.total_failures + 1
    const now = toISODate()
    
    await this.conn.execute(
      'UPDATE cron_jobs SET total_runs = $1, total_failures = $2, last_run_at = $3, updated_at = $4 WHERE id = $5',
      [newTotalRuns, newTotalFailures, now, now, id]
    )
    return this.getCronJobById(id)
  }

  async updateCronJobLastRun(id: string, nextRun: string, ownerId?: string): Promise<CronJob | null> {
    const now = toISODate()
    if (ownerId) {
      await this.conn.execute(
        'UPDATE cron_jobs SET last_run_at = $1, next_run_at = $2, updated_at = $3 WHERE id = $4 AND owner_id = $5',
        [now, nextRun, now, id, ownerId]
      )
    } else {
      await this.conn.execute(
        'UPDATE cron_jobs SET last_run_at = $1, next_run_at = $2, updated_at = $3 WHERE id = $4',
        [now, nextRun, now, id]
      )
    }
    return this.getCronJobById(id, ownerId)
  }

  async getActiveCronJobs(ownerId?: string): Promise<CronJob[]> {
    if (ownerId) {
      if (this.conn.isPostgres()) {
        const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE is_active = true AND owner_id = $1 ORDER BY created_at DESC', [ownerId])
        return rows.map(rowToCronJob)
      } else {
        const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE is_active = 1 AND owner_id = ? ORDER BY created_at DESC', [ownerId])
        return rows.map(rowToCronJob)
      }
    }
    if (this.conn.isPostgres()) {
      const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE is_active = true ORDER BY created_at DESC')
      return rows.map(rowToCronJob)
    } else {
      const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE is_active = 1 ORDER BY created_at DESC')
      return rows.map(rowToCronJob)
    }
  }

  async getAllTasks(options?: { status?: TaskStatus; ownerId?: string; jobId?: string; limit?: number; offset?: number }): Promise<{ tasks: TaskQueueItem[]; total: number }> {
    const { status, ownerId, jobId, limit = 50, offset = 0 } = options ?? {}
    
    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (ownerId) {
      conditions.push(`owner_id = $${paramIndex}`)
      params.push(ownerId)
      paramIndex++
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    if (jobId) {
      conditions.push(`job_id = $${paramIndex}`)
      params.push(jobId)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM task_queue ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<TaskQueueRow>(
      `SELECT * FROM task_queue ${whereClause} ORDER BY priority DESC, created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      tasks: rows.map(rowToTaskQueueItem),
      total,
    }
  }

  async getTaskById(id: string, ownerId?: string): Promise<TaskQueueItem | null> {
    if (ownerId) {
      const rows = await this.conn.query<TaskQueueRow>('SELECT * FROM task_queue WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return rows[0] ? rowToTaskQueueItem(rows[0]) : null
    }
    const rows = await this.conn.query<TaskQueueRow>('SELECT * FROM task_queue WHERE id = $1', [id])
    return rows[0] ? rowToTaskQueueItem(rows[0]) : null
  }

  async getTaskPayload(id: string): Promise<{ payload: string; result: string | null } | null> {
    const rows = await this.conn.query<{ payload: string; result: string | null }>(
      'SELECT payload, result FROM task_queue WHERE id = $1',
      [id]
    )
    return rows[0] ?? null
  }

  async createTask(task: CreateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO task_queue (id, job_id, task_type, payload, priority, status, max_retries, created_at, owner_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, task.job_id ?? null, task.task_type, task.payload, task.priority ?? 0, task.status ?? TaskStatus.PENDING, task.max_retries ?? 3, now, ownerId ?? null]
    )
    return (await this.getTaskById(id))!
  }

  async updateTask(id: string, updates: UpdateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem | null> {
    const existing = await this.getTaskById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []
    let paramIndex = 1

    if (updates.status !== undefined) { fields.push(`status = $${paramIndex}`); values.push(updates.status); paramIndex++ }
    if (updates.retry_count !== undefined) { fields.push(`retry_count = $${paramIndex}`); values.push(updates.retry_count); paramIndex++ }
    if (updates.error_message !== undefined) { fields.push(`error_message = $${paramIndex}`); values.push(updates.error_message); paramIndex++ }
    if (updates.result !== undefined) { fields.push(`result = $${paramIndex}`); values.push(updates.result); paramIndex++ }
    if (updates.started_at !== undefined) { fields.push(`started_at = $${paramIndex}`); values.push(updates.started_at); paramIndex++ }
    if (updates.completed_at !== undefined) { fields.push(`completed_at = $${paramIndex}`); values.push(updates.completed_at); paramIndex++ }

    if (fields.length === 0) return existing
    values.push(id)

    await this.conn.execute(
      `UPDATE task_queue SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    return this.getTaskById(id)
  }

  async deleteTask(id: string, ownerId?: string): Promise<boolean> {
    if (ownerId) {
      const result = await this.conn.execute('DELETE FROM task_queue WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return result.changes > 0
    }
    const result = await this.conn.execute('DELETE FROM task_queue WHERE id = $1', [id])
    return result.changes > 0
  }

  async getPendingTasksByJob(jobId: string | null, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> {
    let rows: TaskQueueRow[]
    if (jobId) {
      if (ownerId) {
        rows = await this.conn.query<TaskQueueRow>(
          'SELECT * FROM task_queue WHERE job_id = $1 AND status = $2 AND owner_id = $3 ORDER BY priority DESC, created_at ASC LIMIT $4',
          [jobId, 'pending', ownerId, limit]
        )
      } else {
        rows = await this.conn.query<TaskQueueRow>(
          'SELECT * FROM task_queue WHERE job_id = $1 AND status = $2 ORDER BY priority DESC, created_at ASC LIMIT $3',
          [jobId, 'pending', limit]
        )
      }
    } else {
      if (ownerId) {
        rows = await this.conn.query<TaskQueueRow>(
          'SELECT * FROM task_queue WHERE status = $1 AND owner_id = $2 ORDER BY priority DESC, created_at ASC LIMIT $3',
          ['pending', ownerId, limit]
        )
      } else {
        rows = await this.conn.query<TaskQueueRow>(
          'SELECT * FROM task_queue WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT $2',
          ['pending', limit]
        )
      }
    }
    return rows.map(rowToTaskQueueItem)
  }

  async getPendingTaskCount(): Promise<number> {
    const rows = await this.conn.query<{ count: string }>('SELECT COUNT(*) as count FROM task_queue WHERE status = $1', ['pending'])
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async getPendingTasksByType(taskType: string, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> {
    let rows: TaskQueueRow[]
    if (ownerId) {
      rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue WHERE task_type = $1 AND status = $2 AND owner_id = $3 ORDER BY priority DESC, created_at ASC LIMIT $4',
        [taskType, 'pending', ownerId, limit]
      )
    } else {
      rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue WHERE task_type = $1 AND status = $2 ORDER BY priority DESC, created_at ASC LIMIT $3',
        [taskType, 'pending', limit]
      )
    }
    return rows.map(rowToTaskQueueItem)
  }

  async getRunningTaskCount(): Promise<number> {
    const rows = await this.conn.query<{ count: string }>('SELECT COUNT(*) as count FROM task_queue WHERE status = $1', ['running'])
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async getFailedTaskCount(): Promise<number> {
    const rows = await this.conn.query<{ count: string }>('SELECT COUNT(*) as count FROM task_queue WHERE status = $1', ['failed'])
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async getTaskCountsByStatus(ownerId?: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }> {
    const sql = ownerId
      ? `SELECT status, COUNT(*) as count FROM task_queue WHERE owner_id = $1 GROUP BY status`
      : `SELECT status, COUNT(*) as count FROM task_queue GROUP BY status`
    const rows = await this.conn.query<{ status: string; count: string }>(
      ownerId ? sql : sql.replace('WHERE owner_id = $1', ''),
      ownerId ? [ownerId] : []
    )
    const counts = { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0, total: 0 }
    for (const row of rows) {
      const count = parseInt(row.count, 10)
      counts.total += count
      if (row.status in counts) {
        (counts as Record<string, number>)[row.status] = count
      }
    }
    return counts
  }

  async markTaskRunning(id: string): Promise<TaskQueueItem | null> {
    await this.conn.execute(
      `UPDATE task_queue SET status = 'running', started_at = $1 WHERE id = $2`,
      [toISODate(), id]
    )
    return this.getTaskById(id)
  }

  async markTaskCompleted(id: string, result?: string, ownerId?: string): Promise<TaskQueueItem | null> {
    if (ownerId) {
      await this.conn.execute(
        `UPDATE task_queue SET status = 'completed', completed_at = $1, result = $2 WHERE id = $3 AND owner_id = $4`,
        [toISODate(), result ?? null, id, ownerId]
      )
    } else {
      await this.conn.execute(
        `UPDATE task_queue SET status = 'completed', completed_at = $1, result = $2 WHERE id = $3`,
        [toISODate(), result ?? null, id]
      )
    }
    return this.getTaskById(id, ownerId)
  }

  async markTaskFailed(id: string, error: string, ownerId?: string): Promise<TaskQueueItem | null> {
    const existing = await this.getTaskById(id, ownerId)
    if (!existing) return null
    
    const newRetryCount = existing.retry_count + 1
    const newStatus = newRetryCount >= existing.max_retries ? 'failed' : 'pending'
    
    if (ownerId) {
      await this.conn.execute(
        `UPDATE task_queue SET status = $1, retry_count = $2, error_message = $3, completed_at = $4 WHERE id = $5 AND owner_id = $6`,
        [newStatus, newRetryCount, error, newStatus === 'failed' ? toISODate() : null, id, ownerId]
      )
    } else {
      await this.conn.execute(
        `UPDATE task_queue SET status = $1, retry_count = $2, error_message = $3, completed_at = $4 WHERE id = $5`,
        [newStatus, newRetryCount, error, newStatus === 'failed' ? toISODate() : null, id]
      )
    }
    return this.getTaskById(id, ownerId)
  }

  async getTasksByJobId(jobId: string, ownerId?: string): Promise<TaskQueueItem[]> {
    if (ownerId) {
      const rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue WHERE job_id = $1 AND owner_id = $2 ORDER BY created_at ASC',
        [jobId, ownerId]
      )
      return rows.map(rowToTaskQueueItem)
    }
    const rows = await this.conn.query<TaskQueueRow>(
      'SELECT * FROM task_queue WHERE job_id = $1 ORDER BY created_at ASC',
      [jobId]
    )
    return rows.map(rowToTaskQueueItem)
  }

  async getAllExecutionLogs(jobId?: string, limit: number = 100, ownerId?: string): Promise<ExecutionLog[]> {
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

  async getExecutionLogsPaginated(options: {
    limit: number
    offset: number
    startDate?: string
    endDate?: string
    ownerId?: string
  }): Promise<{ logs: ExecutionLog[]; total: number }> {
    const { limit, offset, startDate, endDate, ownerId } = options

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

  async getExecutionLogById(id: string, ownerId?: string): Promise<ExecutionLog | null> {
    if (ownerId) {
      const rows = await this.conn.query<ExecutionLogRow>('SELECT * FROM execution_logs WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return rows[0] ? rowToExecutionLog(rows[0]) : null
    }
    const rows = await this.conn.query<ExecutionLogRow>('SELECT * FROM execution_logs WHERE id = $1', [id])
    return rows[0] ? rowToExecutionLog(rows[0]) : null
  }

  async createExecutionLog(log: CreateExecutionLog, ownerId?: string): Promise<ExecutionLog> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO execution_logs (id, job_id, trigger_type, status, started_at, tasks_executed, tasks_succeeded, tasks_failed, error_summary, owner_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, log.job_id ?? null, log.trigger_type, log.status, now, log.tasks_executed ?? 0, log.tasks_succeeded ?? 0, log.tasks_failed ?? 0, log.error_summary ?? null, ownerId ?? null]
    )
    return (await this.getExecutionLogById(id))!
  }

  async updateExecutionLog(id: string, updates: UpdateExecutionLog, ownerId?: string): Promise<ExecutionLog | null> {
    const existing = await this.getExecutionLogById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []
    let paramIndex = 1

    if (updates.status !== undefined) { fields.push(`status = $${paramIndex}`); values.push(updates.status); paramIndex++ }
    if (updates.completed_at !== undefined) { fields.push(`completed_at = $${paramIndex}`); values.push(updates.completed_at); paramIndex++ }
    if (updates.duration_ms !== undefined) { fields.push(`duration_ms = $${paramIndex}`); values.push(updates.duration_ms); paramIndex++ }
    if (updates.tasks_executed !== undefined) { fields.push(`tasks_executed = $${paramIndex}`); values.push(updates.tasks_executed); paramIndex++ }
    if (updates.tasks_succeeded !== undefined) { fields.push(`tasks_succeeded = $${paramIndex}`); values.push(updates.tasks_succeeded); paramIndex++ }
    if (updates.tasks_failed !== undefined) { fields.push(`tasks_failed = $${paramIndex}`); values.push(updates.tasks_failed); paramIndex++ }
    if (updates.error_summary !== undefined) { fields.push(`error_summary = $${paramIndex}`); values.push(updates.error_summary); paramIndex++ }

    if (fields.length === 0) return existing
    values.push(id)
    if (ownerId) values.push(ownerId)

    const whereClause = ownerId ? `WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}` : `WHERE id = $${paramIndex}`

    await this.conn.execute(
      `UPDATE execution_logs SET ${fields.join(', ')} ${whereClause}`,
      values
    )
    return this.getExecutionLogById(id, ownerId)
  }

  async completeExecutionLog(id: string, stats: RunStats, ownerId?: string): Promise<ExecutionLog | null> {
    const status = stats.success ? 'completed' : 'failed'
    if (ownerId) {
      await this.conn.execute(
        `UPDATE execution_logs SET status = $1, completed_at = $2, duration_ms = $3, tasks_executed = $4, tasks_succeeded = $5, tasks_failed = $6, error_summary = $7 WHERE id = $8 AND owner_id = $9`,
        [status, toISODate(), stats.durationMs, stats.tasksExecuted, stats.tasksSucceeded, stats.tasksFailed, stats.errorSummary ?? null, id, ownerId]
      )
    } else {
      await this.conn.execute(
        `UPDATE execution_logs SET status = $1, completed_at = $2, duration_ms = $3, tasks_executed = $4, tasks_succeeded = $5, tasks_failed = $6, error_summary = $7 WHERE id = $8`,
        [status, toISODate(), stats.durationMs, stats.tasksExecuted, stats.tasksSucceeded, stats.tasksFailed, stats.errorSummary ?? null, id]
      )
    }
    return this.getExecutionLogById(id, ownerId)
  }

  async getRecentExecutionLogs(limit: number = 20, ownerId?: string): Promise<ExecutionLog[]> {
    return this.getAllExecutionLogs(undefined, limit, ownerId)
  }

  async createExecutionLogDetail(data: CreateExecutionLogDetail): Promise<string> {
    const id = uuidv4()
    const now = toISODate()
    const inputPayload = data.input_payload ?? null
    const outputResult = data.output_result ?? null

    if (this.conn.isPostgres()) {
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

  async updateExecutionLogDetail(
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

  async getAllCapacityRecords(): Promise<CapacityRecord[]> {
    const rows = await this.conn.query<CapacityRecordRow>('SELECT * FROM capacity_tracking ORDER BY service_type')
    return rows.map(rowToCapacityRecord)
  }

  async getCapacityByService(serviceType: string): Promise<CapacityRecord | null> {
    const rows = await this.conn.query<CapacityRecordRow>(
      'SELECT * FROM capacity_tracking WHERE service_type = $1',
      [serviceType]
    )
    return rows[0] ? rowToCapacityRecord(rows[0]) : null
  }

  async upsertCapacityRecord(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): Promise<CapacityRecord> {
    const existing = await this.getCapacityByService(serviceType)
    const now = toISODate()

    if (existing) {
      await this.conn.execute(
        'UPDATE capacity_tracking SET remaining_quota = $1, total_quota = $2, reset_at = $3, last_checked_at = $4 WHERE service_type = $5',
        [data.remaining_quota, data.total_quota, data.reset_at ?? null, now, serviceType]
      )
      return (await this.getCapacityByService(serviceType))!
    }

    const id = uuidv4()
    await this.conn.execute(
      'INSERT INTO capacity_tracking (id, service_type, remaining_quota, total_quota, reset_at, last_checked_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, serviceType, data.remaining_quota, data.total_quota, data.reset_at ?? null, now]
    )
    return (await this.getCapacityByService(serviceType))!
  }

  async getAllWorkflowTemplates(ownerId?: string): Promise<WorkflowTemplate[]> {
    if (ownerId) {
      const rows = await this.conn.query<WorkflowTemplateRow>('SELECT * FROM workflow_templates WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId])
      return rows.map(rowToWorkflowTemplate)
    }
    const rows = await this.conn.query<WorkflowTemplateRow>('SELECT * FROM workflow_templates ORDER BY created_at DESC')
    return rows.map(rowToWorkflowTemplate)
  }

  async getWorkflowTemplatesPaginated(options: {
    ownerId?: string
    isTemplate?: boolean
    limit?: number
    offset?: number
  }): Promise<{ templates: WorkflowTemplate[]; total: number }> {
    const { ownerId, isTemplate, limit = 50, offset = 0 } = options

    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (ownerId) {
      conditions.push(`owner_id = $${paramIndex}`)
      params.push(ownerId)
      paramIndex++
    }

    if (isTemplate !== undefined) {
      conditions.push(`is_public = $${paramIndex}`)
      params.push(isTemplate ? 1 : 0)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM workflow_templates ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<WorkflowTemplateRow>(
      `SELECT * FROM workflow_templates ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      templates: rows.map(rowToWorkflowTemplate),
      total,
    }
  }

  async getWorkflowTemplateById(id: string, ownerId?: string): Promise<WorkflowTemplate | null> {
    if (ownerId) {
      const rows = await this.conn.query<WorkflowTemplateRow>('SELECT * FROM workflow_templates WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return rows[0] ? rowToWorkflowTemplate(rows[0]) : null
    }
    const rows = await this.conn.query<WorkflowTemplateRow>('SELECT * FROM workflow_templates WHERE id = $1', [id])
    return rows[0] ? rowToWorkflowTemplate(rows[0]) : null
  }

  async createWorkflowTemplate(template: { name: string; description?: string | null; nodes_json: string; edges_json: string; is_public?: boolean }, ownerId?: string): Promise<WorkflowTemplate> {
    const id = uuidv4()
    const now = toISODate()
    const isTemplate = template.is_public !== false
    
    if (this.conn.isPostgres()) {
      await this.conn.execute(
        'INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, created_at, is_public, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, template.name, template.description ?? null, template.nodes_json, template.edges_json, now, isTemplate, ownerId ?? null]
      )
    } else {
      await this.conn.execute(
        'INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, created_at, is_public, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, template.name, template.description ?? null, template.nodes_json, template.edges_json, now, isTemplate ? 1 : 0, ownerId ?? null]
      )
    }
    return (await this.getWorkflowTemplateById(id))!
  }

  async updateWorkflowTemplate(id: string, updates: UpdateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate | null> {
    const existing = await this.getWorkflowTemplateById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramIndex = 1

    if (updates.name !== undefined) { fields.push(`name = $${paramIndex}`); values.push(updates.name); paramIndex++ }
    if (updates.description !== undefined) { fields.push(`description = $${paramIndex}`); values.push(updates.description); paramIndex++ }
    if (updates.nodes_json !== undefined) { fields.push(`nodes_json = $${paramIndex}`); values.push(updates.nodes_json); paramIndex++ }
    if (updates.edges_json !== undefined) { fields.push(`edges_json = $${paramIndex}`); values.push(updates.edges_json); paramIndex++ }
    if (updates.is_public !== undefined) {
      fields.push(`is_public = $${paramIndex}`)
      values.push(this.conn.isPostgres() ? updates.is_public : (updates.is_public ? 1 : 0))
      paramIndex++
    }

    if (fields.length === 0) return existing
    values.push(id)
    if (ownerId) values.push(ownerId)

    const whereClause = ownerId ? `WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}` : `WHERE id = $${paramIndex}`

    await this.conn.execute(
      `UPDATE workflow_templates SET ${fields.join(', ')} ${whereClause}`,
      values
    )
    return this.getWorkflowTemplateById(id, ownerId)
  }

  async deleteWorkflowTemplate(id: string, ownerId?: string): Promise<boolean> {
    if (ownerId) {
      const result = await this.conn.execute('DELETE FROM workflow_templates WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return result.changes > 0
    }
    const result = await this.conn.execute('DELETE FROM workflow_templates WHERE id = $1', [id])
    return result.changes > 0
  }

  async getMarkedWorkflowTemplates(ownerId?: string): Promise<WorkflowTemplate[]> {
    if (ownerId) {
      if (this.conn.isPostgres()) {
        const rows = await this.conn.query<WorkflowTemplateRow>(
          'SELECT * FROM workflow_templates WHERE is_public = true AND owner_id = $1 ORDER BY created_at DESC',
          [ownerId]
        )
        return rows.map(rowToWorkflowTemplate)
      } else {
        const rows = await this.conn.query<WorkflowTemplateRow>(
          'SELECT * FROM workflow_templates WHERE is_public = 1 AND owner_id = ? ORDER BY created_at DESC',
          [ownerId]
        )
        return rows.map(rowToWorkflowTemplate)
      }
    }
    if (this.conn.isPostgres()) {
      const rows = await this.conn.query<WorkflowTemplateRow>(
        'SELECT * FROM workflow_templates WHERE is_public = true ORDER BY created_at DESC'
      )
      return rows.map(rowToWorkflowTemplate)
    } else {
      const rows = await this.conn.query<WorkflowTemplateRow>(
        'SELECT * FROM workflow_templates WHERE is_public = 1 ORDER BY created_at DESC'
      )
      return rows.map(rowToWorkflowTemplate)
    }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, updates?: { started_at?: string | null; completed_at?: string | null; error_message?: string | null; result?: string | null }, ownerId?: string): Promise<void> {
    const existing = await this.getTaskById(taskId, ownerId)
    if (!existing) return
    
    const fields: string[] = ['status = $1']
    const values: (string | number | null)[] = [status]
    let paramIndex = 2
    
    if (updates?.started_at !== undefined) { fields.push(`started_at = $${paramIndex}`); values.push(updates.started_at); paramIndex++ }
    if (updates?.completed_at !== undefined) { fields.push(`completed_at = $${paramIndex}`); values.push(updates.completed_at); paramIndex++ }
    if (updates?.error_message !== undefined) { fields.push(`error_message = $${paramIndex}`); values.push(updates.error_message); paramIndex++ }
    if (updates?.result !== undefined) { fields.push(`result = $${paramIndex}`); values.push(updates.result); paramIndex++ }
    values.push(taskId)
    if (ownerId) { values.push(ownerId) }

    const whereClause = ownerId ? `WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}` : `WHERE id = $${paramIndex}`

    await this.conn.execute(
      `UPDATE task_queue SET ${fields.join(', ')} ${whereClause}`,
      values
    )
  }

  async updateTasksStatusBatch(
    taskIds: string[],
    status: TaskStatus,
    ownerId?: string
  ): Promise<number> {
    if (taskIds.length === 0) {
      return 0
    }

    const values: (string | number)[] = [status]
    let paramIndex = 2

    const idPlaceholders: string[] = []
    for (let i = 0; i < taskIds.length; i++) {
      idPlaceholders.push(this.conn.isPostgres() ? `$${paramIndex}` : '?')
      values.push(taskIds[i])
      paramIndex++
    }

    let sql: string
    if (ownerId) {
      values.push(ownerId)
      sql = `UPDATE task_queue SET status = $1 WHERE id IN (${idPlaceholders.join(', ')}) AND owner_id = $${paramIndex}`
    } else {
      sql = `UPDATE task_queue SET status = $1 WHERE id IN (${idPlaceholders.join(', ')})`
    }

    const result = await this.conn.execute(sql, values)
    return result.changes
  }

  async getCapacityRecord(serviceType: string): Promise<CapacityRecord | null> {
    return this.getCapacityByService(serviceType)
  }

  async getPendingTasks(jobId: string, limit: number): Promise<TaskQueueItem[]> {
    return this.getPendingTasksByJob(jobId, limit)
  }

  async getQueueStats(jobId?: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }> {
    const stats = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    }

    let rows: { status: string; count: string }[]

    if (jobId) {
      rows = await this.conn.query<{ status: string; count: string }>(
        'SELECT status, COUNT(*) as count FROM task_queue WHERE job_id = $1 GROUP BY status',
        [jobId]
      )
    } else {
      rows = await this.conn.query<{ status: string; count: string }>(
        'SELECT status, COUNT(*) as count FROM task_queue GROUP BY status'
      )
    }

    for (const row of rows) {
      const count = parseInt(row.count, 10)
      stats.total += count
      switch (row.status) {
        case 'pending':
          stats.pending = count
          break
        case 'running':
          stats.running = count
          break
        case 'completed':
          stats.completed = count
          break
        case 'failed':
          stats.failed = count
          break
        case 'cancelled':
          stats.cancelled = count
          break
      }
    }

    return stats
  }

  async createTaskQueueItem(data: { job_id?: string | null; task_type: string; payload: string; priority?: number; status?: string; max_retries?: number }): Promise<string> {
    const item = await this.createTask({
      job_id: data.job_id ?? null,
      task_type: data.task_type,
      payload: data.payload,
      priority: data.priority ?? 0,
      status: (data.status as TaskStatus) ?? 'pending',
      max_retries: data.max_retries ?? 3,
    })
    return item.id
  }

  async getCapacity(serviceType: string): Promise<{ remaining: number; total: number } | null> {
    const record = await this.getCapacityByService(serviceType)
    if (!record) return null
    return { remaining: record.remaining_quota, total: record.total_quota }
  }

  async updateCapacity(serviceType: string, remaining: number): Promise<void> {
    await this.conn.execute(
      'UPDATE capacity_tracking SET remaining_quota = $1, last_checked_at = $2 WHERE service_type = $3',
      [remaining, toISODate(), serviceType]
    )
  }

  async decrementCapacity(serviceType: string, amount: number = 1): Promise<CapacityRecord | null> {
    const existing = await this.getCapacityByService(serviceType)
    if (!existing) return null
    
    const newRemaining = Math.max(0, existing.remaining_quota - amount)
    await this.conn.execute(
      'UPDATE capacity_tracking SET remaining_quota = $1, last_checked_at = $2 WHERE service_type = $3',
      [newRemaining, toISODate(), serviceType]
    )
    return this.getCapacityByService(serviceType)
  }

  async getMediaRecords(options: {
    type?: string
    source?: string
    limit: number
    offset: number
    includeDeleted?: boolean
    ownerId?: string
  }): Promise<{ records: MediaRecord[]; total: number }> {
    const { type, source, limit, offset, includeDeleted = false, ownerId } = options
    
    let whereClause = ''
    const params: (string | number)[] = []
    let paramIndex = 1
    
    if (ownerId) {
      whereClause = `owner_id = $${paramIndex}`
      params.push(ownerId)
      paramIndex++
    }
    
    if (!includeDeleted) {
      if (this.conn.isPostgres()) {
        whereClause += whereClause ? ` AND is_deleted = false` : `is_deleted = false`
      } else {
        whereClause += whereClause ? ` AND is_deleted = 0` : `is_deleted = 0`
      }
    }
    
    if (type) {
      whereClause += whereClause ? ` AND type = $${paramIndex}` : `type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }
    
    if (source) {
      whereClause += whereClause ? ` AND source = $${paramIndex}` : `source = $${paramIndex}`
      params.push(source)
      paramIndex++
    }
    
    if (whereClause) {
      whereClause = 'WHERE ' + whereClause
    }
    
    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM media_records ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)
    
    params.push(limit, offset)
    const rows = await this.conn.query<MediaRecordRow>(
      `SELECT * FROM media_records ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )
    
    return {
      records: rows.map(rowToMediaRecord),
      total,
    }
  }

  async getMediaRecordById(id: string, ownerId?: string): Promise<MediaRecord | null> {
    if (ownerId) {
      const rows = await this.conn.query<MediaRecordRow>('SELECT * FROM media_records WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return rows[0] ? rowToMediaRecord(rows[0]) : null
    }
    const rows = await this.conn.query<MediaRecordRow>('SELECT * FROM media_records WHERE id = $1', [id])
    return rows[0] ? rowToMediaRecord(rows[0]) : null
  }

  async createMediaRecord(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord> {
    const id = uuidv4()
    const now = toISODate()
    const metadata = data.metadata ? JSON.stringify(data.metadata) : null
    
    await this.conn.execute(
      `INSERT INTO media_records (id, filename, original_name, filepath, type, mime_type, size_bytes, source, task_id, metadata, created_at, updated_at, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, data.filename, data.original_name ?? null, data.filepath, data.type, data.mime_type ?? null, data.size_bytes, data.source ?? null, data.task_id ?? null, metadata, now, now, ownerId ?? null]
    )
    
    return (await this.getMediaRecordById(id))!
  }

  async updateMediaRecord(id: string, data: { original_name?: string | null; metadata?: Record<string, unknown> | null }, ownerId?: string): Promise<MediaRecord | null> {
    const existing = await this.getMediaRecordById(id, ownerId)
    if (!existing) return null
    
    const now = toISODate()
    const metadata = data.metadata !== undefined 
      ? (data.metadata ? JSON.stringify(data.metadata) : null)
      : existing.metadata
    
    if (ownerId) {
      await this.conn.execute(
        'UPDATE media_records SET original_name = $1, metadata = $2, updated_at = $3 WHERE id = $4 AND owner_id = $5',
        [data.original_name ?? existing.original_name, metadata, now, id, ownerId]
      )
    } else {
      await this.conn.execute(
        'UPDATE media_records SET original_name = $1, metadata = $2, updated_at = $3 WHERE id = $4',
        [data.original_name ?? existing.original_name, metadata, now, id]
      )
    }
    
    return this.getMediaRecordById(id, ownerId)
  }

  async softDeleteMediaRecord(id: string, ownerId?: string): Promise<boolean> {
    const existing = await this.getMediaRecordById(id, ownerId)
    if (!existing) return false
    
    const now = toISODate()
    
    if (ownerId) {
      if (this.conn.isPostgres()) {
        await this.conn.execute(
          'UPDATE media_records SET is_deleted = true, deleted_at = $1, updated_at = $2 WHERE id = $3 AND owner_id = $4',
          [now, now, id, ownerId]
        )
      } else {
        await this.conn.execute(
          'UPDATE media_records SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
          [now, now, id, ownerId]
        )
      }
    } else {
      if (this.conn.isPostgres()) {
        await this.conn.execute(
          'UPDATE media_records SET is_deleted = true, deleted_at = $1, updated_at = $2 WHERE id = $3',
          [now, now, id]
        )
      } else {
        await this.conn.execute(
          'UPDATE media_records SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?',
          [now, now, id]
        )
      }
    }
    return true
  }

  async hardDeleteMediaRecord(id: string, ownerId?: string): Promise<boolean> {
    if (ownerId) {
      const result = await this.conn.execute('DELETE FROM media_records WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return result.changes > 0
    }
    const result = await this.conn.execute('DELETE FROM media_records WHERE id = $1', [id])
    return result.changes > 0
  }

  async getExecutionStatsOverview(ownerId?: string): Promise<{
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

  async getExecutionStatsTrend(period: 'day' | 'week' | 'month', ownerId?: string): Promise<{ date: string; total: number; success: number; failed: number }[]> {
    let dateFormat: string
    if (this.conn.isPostgres()) {
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

    if (this.conn.isPostgres()) {
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

  async getExecutionStatsDistribution(ownerId?: string): Promise<{ type: string; count: number }[]> {
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

  async getExecutionStatsErrors(limit: number = 10, ownerId?: string): Promise<{ errorSummary: string; count: number }[]> {
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

  async getPromptTemplates(options: {
    category?: string
    limit: number
    offset: number
    ownerId?: string
  }): Promise<{ templates: PromptTemplate[]; total: number }> {
    const { category, limit, offset, ownerId } = options

    let whereClause = ''
    const params: (string | number)[] = []
    let paramIndex = 1

    if (ownerId) {
      whereClause = `owner_id = $${paramIndex}`
      params.push(ownerId)
      paramIndex++
    }

    if (category) {
      whereClause += whereClause ? ` AND category = $${paramIndex}` : `category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    if (whereClause) {
      whereClause = 'WHERE ' + whereClause
    }

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM prompt_templates ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<PromptTemplateRow>(
      `SELECT * FROM prompt_templates ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      templates: rows.map(rowToPromptTemplate),
      total,
    }
  }

  async getPromptTemplateById(id: string, ownerId?: string): Promise<PromptTemplate | null> {
    if (ownerId) {
      const rows = await this.conn.query<PromptTemplateRow>('SELECT * FROM prompt_templates WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return rows[0] ? rowToPromptTemplate(rows[0]) : null
    }
    const rows = await this.conn.query<PromptTemplateRow>('SELECT * FROM prompt_templates WHERE id = $1', [id])
    return rows[0] ? rowToPromptTemplate(rows[0]) : null
  }

  async createPromptTemplate(data: CreatePromptTemplate, ownerId?: string): Promise<PromptTemplate> {
    const id = uuidv4()
    const now = toISODate()
    const variables = data.variables ? JSON.stringify(data.variables) : null
    const isBuiltin = data.is_builtin === true

    if (this.conn.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO prompt_templates (id, name, description, content, category, variables, is_builtin, created_at, updated_at, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, data.name, data.description ?? null, data.content, data.category ?? null, variables, isBuiltin, now, now, ownerId ?? null]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO prompt_templates (id, name, description, content, category, variables, is_builtin, created_at, updated_at, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.name, data.description ?? null, data.content, data.category ?? null, variables, isBuiltin ? 1 : 0, now, now, ownerId ?? null]
      )
    }

    return (await this.getPromptTemplateById(id))!
  }

  async updatePromptTemplate(id: string, data: UpdatePromptTemplate, ownerId?: string): Promise<PromptTemplate | null> {
    const existing = await this.getPromptTemplateById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []
    let paramIndex = 1

    if (data.name !== undefined) { fields.push(`name = $${paramIndex}`); values.push(data.name); paramIndex++ }
    if (data.description !== undefined) { fields.push(`description = $${paramIndex}`); values.push(data.description); paramIndex++ }
    if (data.content !== undefined) { fields.push(`content = $${paramIndex}`); values.push(data.content); paramIndex++ }
    if (data.category !== undefined) { fields.push(`category = $${paramIndex}`); values.push(data.category); paramIndex++ }
    if (data.variables !== undefined) { fields.push(`variables = $${paramIndex}`); values.push(JSON.stringify(data.variables)); paramIndex++ }

    if (fields.length === 0) return existing

    fields.push(`updated_at = $${paramIndex}`)
    values.push(toISODate())
    paramIndex++
    values.push(id)
    if (ownerId) values.push(ownerId)

    const whereClause = ownerId ? `WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}` : `WHERE id = $${paramIndex}`

    await this.conn.execute(
      `UPDATE prompt_templates SET ${fields.join(', ')} ${whereClause}`,
      values
    )
    return this.getPromptTemplateById(id, ownerId)
  }

  async deletePromptTemplate(id: string, ownerId?: string): Promise<boolean> {
    if (ownerId) {
      const result = await this.conn.execute('DELETE FROM prompt_templates WHERE id = $1 AND owner_id = $2', [id, ownerId])
      return result.changes > 0
    }
    const result = await this.conn.execute('DELETE FROM prompt_templates WHERE id = $1', [id])
    return result.changes > 0
  }

  async softDeleteMediaRecords(ids: string[]): Promise<{ deleted: number; failed: number }> {
    if (ids.length === 0) {
      return { deleted: 0, failed: 0 }
    }

    const now = toISODate()
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    
    if (this.conn.isPostgres()) {
      const result = await this.conn.execute(
        `UPDATE media_records SET is_deleted = true, deleted_at = $${ids.length + 1}, updated_at = $${ids.length + 2} WHERE id IN (${placeholders})`,
        [...ids, now, now]
      )
      return { deleted: result.changes, failed: ids.length - result.changes }
    } else {
      const result = await this.conn.execute(
        `UPDATE media_records SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id IN (${placeholders})`,
        [now, now, ...ids]
      )
      return { deleted: result.changes, failed: ids.length - result.changes }
    }
  }

  async getMediaRecordsByIds(ids: string[]): Promise<MediaRecord[]> {
    if (ids.length === 0) return []
    
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    
    if (this.conn.isPostgres()) {
      const rows = await this.conn.query<MediaRecordRow>(
        `SELECT * FROM media_records WHERE id IN (${placeholders}) AND is_deleted = false`,
        ids
      )
      return rows.map(rowToMediaRecord)
    } else {
      const rows = await this.conn.query<MediaRecordRow>(
        `SELECT * FROM media_records WHERE id IN (${placeholders}) AND is_deleted = 0`,
        ids
      )
      return rows.map(rowToMediaRecord)
    }
  }

  async createAuditLog(data: CreateAuditLog): Promise<AuditLog> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO audit_logs (id, action, resource_type, resource_id, user_id, ip_address, user_agent, request_method, request_path, request_body, response_status, error_message, duration_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [id, data.action, data.resource_type, data.resource_id ?? null, data.user_id ?? null, data.ip_address ?? null, data.user_agent ?? null, data.request_method ?? null, data.request_path ?? null, data.request_body ?? null, data.response_status ?? null, data.error_message ?? null, data.duration_ms ?? null, now]
    )
    return (await this.getAuditLogById(id))!
  }

  async getAuditLogById(id: string): Promise<AuditLog | null> {
    const rows = await this.conn.query<AuditLogRow>('SELECT * FROM audit_logs WHERE id = $1', [id])
    return rows[0] ? rowToAuditLog(rows[0]) : null
  }

  async getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }> {
    const { action, resource_type, resource_id, user_id, response_status, start_date, end_date, page = 1, limit = 20 } = query
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (action) {
      conditions.push(`action = $${paramIndex}`)
      params.push(action)
      paramIndex++
    }
    if (resource_type) {
      conditions.push(`resource_type = $${paramIndex}`)
      params.push(resource_type)
      paramIndex++
    }
    if (resource_id) {
      conditions.push(`resource_id = $${paramIndex}`)
      params.push(resource_id)
      paramIndex++
    }
    if (user_id) {
      conditions.push(`user_id = $${paramIndex}`)
      params.push(user_id)
      paramIndex++
    }
    if (response_status !== undefined) {
      conditions.push(`response_status = $${paramIndex}`)
      params.push(response_status)
      paramIndex++
    }
    if (start_date) {
      conditions.push(`created_at >= $${paramIndex}`)
      params.push(start_date)
      paramIndex++
    }
    if (end_date) {
      conditions.push(`created_at <= $${paramIndex}`)
      params.push(end_date)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRows = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      params
    )
    const total = parseInt(countRows[0]?.count ?? '0', 10)

    params.push(limit, offset)
    const rows = await this.conn.query<AuditLogRow>(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return {
      logs: rows.map(rowToAuditLog),
      total,
    }
  }

  async getAuditStats(userId?: string): Promise<AuditStats> {
    const ownerFilter = userId ? 'WHERE user_id = $1' : ''
    const params = userId ? [userId] : []

    const totalRows = await this.conn.query<{ count: string }>(`SELECT COUNT(*) as count FROM audit_logs ${ownerFilter}`, params)
    const total_logs = parseInt(totalRows[0]?.count ?? '0', 10)

    const actionRows = await this.conn.query<{ action: string; count: string }>(
      `SELECT action, COUNT(*) as count FROM audit_logs ${ownerFilter} GROUP BY action`,
      params
    )
    const by_action: Record<string, number> = { create: 0, update: 0, delete: 0, execute: 0 }
    actionRows.forEach(row => { by_action[row.action] = parseInt(row.count, 10) })

    const resourceRows = await this.conn.query<{ resource_type: string; count: string }>(
      `SELECT resource_type, COUNT(*) as count FROM audit_logs ${ownerFilter} GROUP BY resource_type`,
      params
    )
    const by_resource_type: Record<string, number> = {}
    resourceRows.forEach(row => { by_resource_type[row.resource_type] = parseInt(row.count, 10) })

    const statusRows = await this.conn.query<{ response_status: string; count: string }>(
      `SELECT response_status, COUNT(*) as count FROM audit_logs WHERE response_status IS NOT NULL ${userId ? 'AND user_id = $1' : ''} GROUP BY response_status`,
      params
    )
    const by_response_status: Record<string, number> = {}
    statusRows.forEach(row => { by_response_status[row.response_status] = parseInt(row.count, 10) })

    const avgDurationRows = await this.conn.query<{ avg_duration: string }>(
      `SELECT COALESCE(AVG(duration_ms), 0) as avg_duration FROM audit_logs WHERE duration_ms IS NOT NULL ${userId ? 'AND user_id = $1' : ''}`,
      params
    )
    const avg_duration = parseFloat(avgDurationRows[0]?.avg_duration ?? '0')

    return {
      total_logs,
      by_action: by_action as Record<'create' | 'update' | 'delete' | 'execute', number>,
      by_resource_type,
      by_response_status,
      avg_duration_ms: Math.round(avg_duration),
    }
  }

  // =====================================================================
  // Service Node Permissions
  // =====================================================================

  async getAllServiceNodePermissions(): Promise<ServiceNodePermission[]> {
    const rows = await this.conn.query<ServiceNodePermissionRow>(
      'SELECT * FROM service_node_permissions ORDER BY category, display_name'
    )
    return rows.map(row => ({
      id: row.id,
      service_name: row.service_name,
      method_name: row.method_name,
      display_name: row.display_name,
      category: row.category,
      min_role: row.min_role,
      is_enabled: typeof row.is_enabled === 'boolean' ? row.is_enabled : row.is_enabled === 1,
      created_at: row.created_at,
    }))
  }

  async getServiceNodePermission(
    serviceName: string,
    methodName: string
  ): Promise<ServiceNodePermission | null> {
    const rows = await this.conn.query<ServiceNodePermissionRow>(
      'SELECT * FROM service_node_permissions WHERE service_name = $1 AND method_name = $2',
      [serviceName, methodName]
    )
    if (!rows[0]) return null
    const row = rows[0]
    return {
      id: row.id,
      service_name: row.service_name,
      method_name: row.method_name,
      display_name: row.display_name,
      category: row.category,
      min_role: row.min_role,
      is_enabled: typeof row.is_enabled === 'boolean' ? row.is_enabled : row.is_enabled === 1,
      created_at: row.created_at,
    }
  }

  async updateServiceNodePermission(
    id: string,
    data: { min_role?: string; is_enabled?: boolean }
  ): Promise<void> {
    const updates: string[] = []
    const values: (string | number)[] = []
    let paramIndex = 1

    if (data.min_role !== undefined) {
      updates.push(`min_role = $${paramIndex}`)
      values.push(data.min_role)
      paramIndex++
    }
if (data.is_enabled !== undefined) {
      updates.push(`is_enabled = $${paramIndex}`)
      const boolValue = data.is_enabled ? 1 : 0
      values.push(this.conn.isPostgres() ? boolValue : boolValue)
      paramIndex++
    }

    if (updates.length === 0) return

    values.push(id)
    await this.conn.execute(
      `UPDATE service_node_permissions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }

  // =====================================================================
  // Workflow Permissions
  // =====================================================================

  async createWorkflowPermission(data: {
    workflow_id: string
    user_id: string
    granted_by?: string | null
  }): Promise<void> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO workflow_permissions (id, workflow_id, user_id, granted_by, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, data.workflow_id, data.user_id, data.granted_by || null, now]
    )
  }

  async deleteWorkflowPermission(workflowId: string, userId: string): Promise<void> {
    await this.conn.execute(
      `DELETE FROM workflow_permissions WHERE workflow_id = $1 AND user_id = $2`,
      [workflowId, userId]
    )
  }

  async hasWorkflowPermission(workflowId: string, userId: string): Promise<boolean> {
    const rows = await this.conn.query<{ id: string }>(
      `SELECT id FROM workflow_permissions WHERE workflow_id = $1 AND user_id = $2`,
      [workflowId, userId]
    )
    return rows.length > 0
  }

  async getWorkflowPermissions(workflowId: string): Promise<Array<{
    id: string
    workflow_id: string
    user_id: string
    granted_by: string | null
    created_at: string
    username: string
    email: string | null
  }>> {
    const rows = await this.conn.query<{
      id: string
      workflow_id: string
      user_id: string
      granted_by: string | null
      created_at: string
      username: string
      email: string | null
    }>(
      `SELECT wp.*, u.username, u.email
       FROM workflow_permissions wp
       JOIN users u ON wp.user_id = u.id
       WHERE wp.workflow_id = $1`,
      [workflowId]
    )
    return rows
  }

  async getAvailableWorkflows(userId: string): Promise<WorkflowTemplate[]> {
    const rows = await this.conn.query<WorkflowTemplateRow>(
      `SELECT DISTINCT wt.* 
       FROM workflow_templates wt
       LEFT JOIN workflow_permissions wp ON wt.id = wp.workflow_id
       WHERE wt.owner_id = $1
          OR wp.user_id = $1
          OR wt.is_public = true
       ORDER BY wt.created_at DESC`,
      [userId]
    )
    return rows.map(rowToWorkflowTemplate)
  }
}

let dbInstance: DatabaseService | null = null

export async function getDatabase(): Promise<DatabaseService> {
  if (!dbInstance) {
    const conn = await createConnection()
    dbInstance = new DatabaseService(conn)
    await dbInstance.init()
  }
  return dbInstance
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close()
    dbInstance = null
  }
}