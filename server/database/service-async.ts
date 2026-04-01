import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection, createConnection, getConnection, closeConnection, QueryResultRow } from './connection.js'
import { TaskStatus, TriggerType, ExecutionStatus } from './types.js'
import type {
  CronJob,
  TaskQueueItem,
  ExecutionLog,
  CapacityRecord,
  WorkflowTemplate,
  JobTag,
  JobDependency,
  WebhookConfig,
  WebhookDelivery,
  DeadLetterItem,
  CreateCronJob,
  CreateTaskQueueItem,
  CreateExecutionLog,
  CreateWebhookConfig,
  CreateWebhookDelivery,
  CreateDeadLetterItem,
  UpdateCronJob,
  UpdateTaskQueueItem,
  UpdateExecutionLog,
  UpdateCapacityRecord,
  UpdateWorkflowTemplate,
  UpdateWebhookConfig,
  UpdateDeadLetterItem,
  RunStats,
  CronJobRow,
  TaskQueueRow,
  ExecutionLogRow,
  CapacityRecordRow,
  WorkflowTemplateRow,
  JobTagRow,
  JobDependencyRow,
  WebhookConfigRow,
  WebhookDeliveryRow,
  DeadLetterItemRow,
  MediaRecord,
  MediaRecordRow,
  CreateMediaRecord,
  UpdateMediaRecord,
  PromptTemplate,
  PromptTemplateRow,
  CreatePromptTemplate,
  UpdatePromptTemplate,
  AuditLog,
  AuditLogRow,
  CreateAuditLog,
  AuditLogQuery,
  AuditStats,
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

function rowToCapacityRecord(row: CapacityRecordRow): CapacityRecord {
  return row
}

function rowToWorkflowTemplate(row: WorkflowTemplateRow): WorkflowTemplate {
  return { ...row, is_template: typeof row.is_template === 'boolean' ? row.is_template : row.is_template === 1 }
}

function rowToJobTag(row: JobTagRow): JobTag {
  return row
}

function rowToJobDependency(row: JobDependencyRow): JobDependency {
  return row
}

function rowToWebhookConfig(row: WebhookConfigRow): WebhookConfig {
  const events = typeof row.events === 'string' ? JSON.parse(row.events) : row.events
  const headers = row.headers ? (typeof row.headers === 'string' ? JSON.parse(row.headers) : row.headers) : null
  return {
    ...row,
    events: events as import('./types.js').WebhookEvent[],
    headers,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : row.is_active === 1,
  }
}

function rowToWebhookDelivery(row: WebhookDeliveryRow): WebhookDelivery {
  return row
}

function rowToDeadLetterItem(row: DeadLetterItemRow): DeadLetterItem {
  return {
    ...row,
    resolution: row.resolution as 'retried' | 'discarded' | 'manual' | null,
  }
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

  async getAllCronJobs(): Promise<CronJob[]> {
    const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs ORDER BY created_at DESC')
    return rows.map(rowToCronJob)
  }

  async getCronJobById(id: string): Promise<CronJob | null> {
    const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE id = $1', [id])
    return rows[0] ? rowToCronJob(rows[0]) : null
  }

  async createCronJob(job: CreateCronJob): Promise<CronJob> {
    const id = uuidv4()
    const now = toISODate()
    const isActive = job.is_active !== false
    const timeoutMs = job.timeout_ms ?? 300000
    
    if (this.conn.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_json, created_at, updated_at, timeout_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, job.name, job.description ?? null, job.cron_expression, isActive, job.workflow_json, now, now, timeoutMs]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_json, created_at, updated_at, timeout_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, job.name, job.description ?? null, job.cron_expression, isActive ? 1 : 0, job.workflow_json, now, now, timeoutMs]
      )
    }
    return (await this.getCronJobById(id))!
  }

  async updateCronJob(id: string, updates: UpdateCronJob): Promise<CronJob | null> {
    const existing = await this.getCronJobById(id)
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
    addField('workflow_json', updates.workflow_json)
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

  async deleteCronJob(id: string): Promise<boolean> {
    const result = await this.conn.execute('DELETE FROM cron_jobs WHERE id = $1', [id])
    return result.changes > 0
  }

  async toggleCronJobActive(id: string): Promise<CronJob | null> {
    const existing = await this.getCronJobById(id)
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

  async updateCronJobRunStats(id: string, stats: RunStats): Promise<CronJob | null> {
    const existing = await this.getCronJobById(id)
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

  async updateCronJobLastRun(id: string, nextRun: string): Promise<CronJob | null> {
    const now = toISODate()
    await this.conn.execute(
      'UPDATE cron_jobs SET last_run_at = $1, next_run_at = $2, updated_at = $3 WHERE id = $4',
      [now, nextRun, now, id]
    )
    return this.getCronJobById(id)
  }

  async getActiveCronJobs(): Promise<CronJob[]> {
    if (this.conn.isPostgres()) {
      const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE is_active = true ORDER BY created_at DESC')
      return rows.map(rowToCronJob)
    } else {
      const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs WHERE is_active = 1 ORDER BY created_at DESC')
      return rows.map(rowToCronJob)
    }
  }

  async getAllTasks(status?: TaskStatus): Promise<TaskQueueItem[]> {
    let rows: TaskQueueRow[]
    if (status) {
      rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue WHERE status = $1 ORDER BY priority DESC, created_at ASC',
        [status]
      )
    } else {
      rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue ORDER BY priority DESC, created_at ASC'
      )
    }
    return rows.map(rowToTaskQueueItem)
  }

  async getTaskById(id: string): Promise<TaskQueueItem | null> {
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

  async createTask(task: CreateTaskQueueItem): Promise<TaskQueueItem> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO task_queue (id, job_id, task_type, payload, priority, status, max_retries, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, task.job_id ?? null, task.task_type, task.payload, task.priority ?? 0, task.status ?? TaskStatus.PENDING, task.max_retries ?? 3, now]
    )
    return (await this.getTaskById(id))!
  }

  async updateTask(id: string, updates: UpdateTaskQueueItem): Promise<TaskQueueItem | null> {
    const existing = await this.getTaskById(id)
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

  async deleteTask(id: string): Promise<boolean> {
    const result = await this.conn.execute('DELETE FROM task_queue WHERE id = $1', [id])
    return result.changes > 0
  }

  async getPendingTasksByJob(jobId: string | null, limit: number = 10): Promise<TaskQueueItem[]> {
    let rows: TaskQueueRow[]
    if (jobId) {
      rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue WHERE job_id = $1 AND status = $2 ORDER BY priority DESC, created_at ASC LIMIT $3',
        [jobId, 'pending', limit]
      )
    } else {
      rows = await this.conn.query<TaskQueueRow>(
        'SELECT * FROM task_queue WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT $2',
        ['pending', limit]
      )
    }
    return rows.map(rowToTaskQueueItem)
  }

  async getPendingTaskCount(): Promise<number> {
    const rows = await this.conn.query<{ count: string }>('SELECT COUNT(*) as count FROM task_queue WHERE status = $1', ['pending'])
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async getRunningTaskCount(): Promise<number> {
    const rows = await this.conn.query<{ count: string }>('SELECT COUNT(*) as count FROM task_queue WHERE status = $1', ['running'])
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async getFailedTaskCount(): Promise<number> {
    const rows = await this.conn.query<{ count: string }>('SELECT COUNT(*) as count FROM task_queue WHERE status = $1', ['failed'])
    return parseInt(rows[0]?.count ?? '0', 10)
  }

  async markTaskRunning(id: string): Promise<TaskQueueItem | null> {
    await this.conn.execute(
      `UPDATE task_queue SET status = 'running', started_at = $1 WHERE id = $2`,
      [toISODate(), id]
    )
    return this.getTaskById(id)
  }

  async markTaskCompleted(id: string, result?: string): Promise<TaskQueueItem | null> {
    await this.conn.execute(
      `UPDATE task_queue SET status = 'completed', completed_at = $1, result = $2 WHERE id = $3`,
      [toISODate(), result ?? null, id]
    )
    return this.getTaskById(id)
  }

  async markTaskFailed(id: string, error: string): Promise<TaskQueueItem | null> {
    const existing = await this.getTaskById(id)
    if (!existing) return null
    
    const newRetryCount = existing.retry_count + 1
    const newStatus = newRetryCount >= existing.max_retries ? 'failed' : 'pending'
    
    await this.conn.execute(
      `UPDATE task_queue SET status = $1, retry_count = $2, error_message = $3, completed_at = $4 WHERE id = $5`,
      [newStatus, newRetryCount, error, newStatus === 'failed' ? toISODate() : null, id]
    )
    return this.getTaskById(id)
  }

  async getTasksByJobId(jobId: string): Promise<TaskQueueItem[]> {
    const rows = await this.conn.query<TaskQueueRow>(
      'SELECT * FROM task_queue WHERE job_id = $1 ORDER BY created_at ASC',
      [jobId]
    )
    return rows.map(rowToTaskQueueItem)
  }

  async getAllExecutionLogs(jobId?: string, limit: number = 100): Promise<ExecutionLog[]> {
    let rows: ExecutionLogRow[]
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
    return rows.map(rowToExecutionLog)
  }

  async getExecutionLogsPaginated(options: {
    limit: number
    offset: number
    startDate?: string
    endDate?: string
  }): Promise<{ logs: ExecutionLog[]; total: number }> {
    const { limit, offset, startDate, endDate } = options

    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

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

  async getExecutionLogById(id: string): Promise<ExecutionLog | null> {
    const rows = await this.conn.query<ExecutionLogRow>('SELECT * FROM execution_logs WHERE id = $1', [id])
    return rows[0] ? rowToExecutionLog(rows[0]) : null
  }

  async createExecutionLog(log: CreateExecutionLog): Promise<ExecutionLog> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO execution_logs (id, job_id, trigger_type, status, started_at, tasks_executed, tasks_succeeded, tasks_failed, error_summary, log_detail) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, log.job_id ?? null, log.trigger_type, log.status, now, log.tasks_executed ?? 0, log.tasks_succeeded ?? 0, log.tasks_failed ?? 0, log.error_summary ?? null, log.log_detail ?? null]
    )
    return (await this.getExecutionLogById(id))!
  }

  async updateExecutionLog(id: string, updates: UpdateExecutionLog): Promise<ExecutionLog | null> {
    const existing = await this.getExecutionLogById(id)
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
    if (updates.log_detail !== undefined) { fields.push(`log_detail = $${paramIndex}`); values.push(updates.log_detail); paramIndex++ }

    if (fields.length === 0) return existing
    values.push(id)

    await this.conn.execute(
      `UPDATE execution_logs SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    return this.getExecutionLogById(id)
  }

  async completeExecutionLog(id: string, stats: RunStats): Promise<ExecutionLog | null> {
    const status = stats.success ? 'completed' : 'failed'
    await this.conn.execute(
      `UPDATE execution_logs SET status = $1, completed_at = $2, duration_ms = $3, tasks_executed = $4, tasks_succeeded = $5, tasks_failed = $6, error_summary = $7 WHERE id = $8`,
      [status, toISODate(), stats.durationMs, stats.tasksExecuted, stats.tasksSucceeded, stats.tasksFailed, stats.errorSummary ?? null, id]
    )
    return this.getExecutionLogById(id)
  }

  async getRecentExecutionLogs(limit: number = 20): Promise<ExecutionLog[]> {
    return this.getAllExecutionLogs(undefined, limit)
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

  async getAllWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    const rows = await this.conn.query<WorkflowTemplateRow>('SELECT * FROM workflow_templates ORDER BY created_at DESC')
    return rows.map(rowToWorkflowTemplate)
  }

  async getWorkflowTemplateById(id: string): Promise<WorkflowTemplate | null> {
    const rows = await this.conn.query<WorkflowTemplateRow>('SELECT * FROM workflow_templates WHERE id = $1', [id])
    return rows[0] ? rowToWorkflowTemplate(rows[0]) : null
  }

  async createWorkflowTemplate(template: { name: string; description?: string | null; nodes_json: string; edges_json: string; is_template?: boolean }): Promise<WorkflowTemplate> {
    const id = uuidv4()
    const now = toISODate()
    const isTemplate = template.is_template !== false
    
    if (this.conn.isPostgres()) {
      await this.conn.execute(
        'INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, created_at, is_template) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, template.name, template.description ?? null, template.nodes_json, template.edges_json, now, isTemplate]
      )
    } else {
      await this.conn.execute(
        'INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, created_at, is_template) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, template.name, template.description ?? null, template.nodes_json, template.edges_json, now, isTemplate ? 1 : 0]
      )
    }
    return (await this.getWorkflowTemplateById(id))!
  }

  async updateWorkflowTemplate(id: string, updates: UpdateWorkflowTemplate): Promise<WorkflowTemplate | null> {
    const existing = await this.getWorkflowTemplateById(id)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramIndex = 1

    if (updates.name !== undefined) { fields.push(`name = $${paramIndex}`); values.push(updates.name); paramIndex++ }
    if (updates.description !== undefined) { fields.push(`description = $${paramIndex}`); values.push(updates.description); paramIndex++ }
    if (updates.nodes_json !== undefined) { fields.push(`nodes_json = $${paramIndex}`); values.push(updates.nodes_json); paramIndex++ }
    if (updates.edges_json !== undefined) { fields.push(`edges_json = $${paramIndex}`); values.push(updates.edges_json); paramIndex++ }
    if (updates.is_template !== undefined) {
      fields.push(`is_template = $${paramIndex}`)
      values.push(this.conn.isPostgres() ? updates.is_template : (updates.is_template ? 1 : 0))
      paramIndex++
    }

    if (fields.length === 0) return existing
    values.push(id)

    await this.conn.execute(
      `UPDATE workflow_templates SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    return this.getWorkflowTemplateById(id)
  }

  async deleteWorkflowTemplate(id: string): Promise<boolean> {
    const result = await this.conn.execute('DELETE FROM workflow_templates WHERE id = $1', [id])
    return result.changes > 0
  }

  async getMarkedWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    if (this.conn.isPostgres()) {
      const rows = await this.conn.query<WorkflowTemplateRow>(
        'SELECT * FROM workflow_templates WHERE is_template = true ORDER BY created_at DESC'
      )
      return rows.map(rowToWorkflowTemplate)
    } else {
      const rows = await this.conn.query<WorkflowTemplateRow>(
        'SELECT * FROM workflow_templates WHERE is_template = 1 ORDER BY created_at DESC'
      )
      return rows.map(rowToWorkflowTemplate)
    }
  }

  async getJobTags(jobId: string): Promise<string[]> {
    const rows = await this.conn.query<{ tag: string }>(
      'SELECT tag FROM job_tags WHERE job_id = $1 ORDER BY tag',
      [jobId]
    )
    return rows.map(r => r.tag)
  }

  async addJobTag(jobId: string, tag: string): Promise<JobTag> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      'INSERT INTO job_tags (id, job_id, tag, created_at) VALUES ($1, $2, $3, $4)',
      [id, jobId, tag, now]
    )
    return { id, job_id: jobId, tag, created_at: now }
  }

  async removeJobTag(jobId: string, tag: string): Promise<boolean> {
    const result = await this.conn.execute(
      'DELETE FROM job_tags WHERE job_id = $1 AND tag = $2',
      [jobId, tag]
    )
    return result.changes > 0
  }

  async getJobsByTag(tag: string): Promise<CronJob[]> {
    const rows = await this.conn.query<CronJobRow>(
      `SELECT j.* FROM cron_jobs j
       INNER JOIN job_tags t ON j.id = t.job_id
       WHERE t.tag = $1
       ORDER BY j.created_at DESC`,
      [tag]
    )
    return rows.map(rowToCronJob)
  }

  async getAllTags(): Promise<string[]> {
    const rows = await this.conn.query<{ tag: string }>('SELECT DISTINCT tag FROM job_tags ORDER BY tag')
    return rows.map(r => r.tag)
  }

  async getJobDependencies(jobId: string): Promise<string[]> {
    const rows = await this.conn.query<{ depends_on_job_id: string }>(
      'SELECT depends_on_job_id FROM job_dependencies WHERE job_id = $1',
      [jobId]
    )
    return rows.map(r => r.depends_on_job_id)
  }

  async getJobDependents(jobId: string): Promise<string[]> {
    const rows = await this.conn.query<{ job_id: string }>(
      'SELECT job_id FROM job_dependencies WHERE depends_on_job_id = $1',
      [jobId]
    )
    return rows.map(r => r.job_id)
  }

  async addJobDependency(jobId: string, dependsOnJobId: string): Promise<JobDependency> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      'INSERT INTO job_dependencies (id, job_id, depends_on_job_id, created_at) VALUES ($1, $2, $3, $4)',
      [id, jobId, dependsOnJobId, now]
    )
    return { id, job_id: jobId, depends_on_job_id: dependsOnJobId, created_at: now }
  }

  async removeJobDependency(jobId: string, dependsOnJobId: string): Promise<boolean> {
    const result = await this.conn.execute(
      'DELETE FROM job_dependencies WHERE job_id = $1 AND depends_on_job_id = $2',
      [jobId, dependsOnJobId]
    )
    return result.changes > 0
  }

  async getWebhookConfigs(jobId?: string): Promise<WebhookConfig[]> {
    let rows: WebhookConfigRow[]
    if (jobId) {
      if (this.conn.isPostgres()) {
        rows = await this.conn.query<WebhookConfigRow>(
          'SELECT * FROM webhook_configs WHERE job_id = $1 AND is_active = true',
          [jobId]
        )
      } else {
        rows = await this.conn.query<WebhookConfigRow>(
          'SELECT * FROM webhook_configs WHERE job_id = $1 AND is_active = 1',
          [jobId]
        )
      }
    } else {
      if (this.conn.isPostgres()) {
        rows = await this.conn.query<WebhookConfigRow>(
          'SELECT * FROM webhook_configs WHERE is_active = true'
        )
      } else {
        rows = await this.conn.query<WebhookConfigRow>(
          'SELECT * FROM webhook_configs WHERE is_active = 1'
        )
      }
    }
    return rows.map(rowToWebhookConfig)
  }

  async getWebhookConfigById(id: string): Promise<WebhookConfig | null> {
    const rows = await this.conn.query<WebhookConfigRow>('SELECT * FROM webhook_configs WHERE id = $1', [id])
    return rows[0] ? rowToWebhookConfig(rows[0]) : null
  }

  async createWebhookConfig(config: CreateWebhookConfig): Promise<WebhookConfig> {
    const id = uuidv4()
    const now = toISODate()
    const isActive = config.is_active !== false
    const events = JSON.stringify(config.events)
    const headers = config.headers ? JSON.stringify(config.headers) : null
    
    if (this.conn.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO webhook_configs (id, job_id, name, url, events, headers, secret, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, config.job_id ?? null, config.name, config.url, events, headers, config.secret ?? null, isActive, now, now]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO webhook_configs (id, job_id, name, url, events, headers, secret, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, config.job_id ?? null, config.name, config.url, events, headers, config.secret ?? null, isActive ? 1 : 0, now, now]
      )
    }
    return (await this.getWebhookConfigById(id))!
  }

  async updateWebhookConfig(id: string, updates: UpdateWebhookConfig): Promise<WebhookConfig | null> {
    const existing = await this.getWebhookConfigById(id)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramIndex = 1

    if (updates.name !== undefined) { fields.push(`name = $${paramIndex}`); values.push(updates.name); paramIndex++ }
    if (updates.url !== undefined) { fields.push(`url = $${paramIndex}`); values.push(updates.url); paramIndex++ }
    if (updates.events !== undefined) { fields.push(`events = $${paramIndex}`); values.push(JSON.stringify(updates.events)); paramIndex++ }
    if (updates.headers !== undefined) { fields.push(`headers = $${paramIndex}`); values.push(updates.headers ? JSON.stringify(updates.headers) : null); paramIndex++ }
    if (updates.secret !== undefined) { fields.push(`secret = $${paramIndex}`); values.push(updates.secret); paramIndex++ }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex}`)
      values.push(this.conn.isPostgres() ? updates.is_active : (updates.is_active ? 1 : 0))
      paramIndex++
    }

    if (fields.length === 0) return existing
    
    fields.push(`updated_at = $${paramIndex}`)
    values.push(toISODate())
    paramIndex++
    values.push(id)

    await this.conn.execute(
      `UPDATE webhook_configs SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    return this.getWebhookConfigById(id)
  }

  async deleteWebhookConfig(id: string): Promise<boolean> {
    const result = await this.conn.execute('DELETE FROM webhook_configs WHERE id = $1', [id])
    return result.changes > 0
  }

  async createWebhookDelivery(delivery: CreateWebhookDelivery): Promise<WebhookDelivery> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO webhook_deliveries (id, webhook_id, execution_log_id, event, payload, response_status, response_body, error_message, delivered_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, delivery.webhook_id, delivery.execution_log_id ?? null, delivery.event, delivery.payload, delivery.response_status ?? null, delivery.response_body ?? null, delivery.error_message ?? null, now]
    )
    return { ...delivery, id, delivered_at: now }
  }

  async getWebhookDeliveries(webhookId: string, limit: number = 100): Promise<WebhookDelivery[]> {
    const rows = await this.conn.query<WebhookDeliveryRow>(
      'SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY delivered_at DESC LIMIT $2',
      [webhookId, limit]
    )
    return rows.map(rowToWebhookDelivery)
  }

  async createDeadLetterItem(item: CreateDeadLetterItem): Promise<DeadLetterItem> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO dead_letter_queue (id, original_task_id, job_id, task_type, payload, error_message, failed_at, retry_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, item.original_task_id ?? null, item.job_id ?? null, item.task_type, item.payload, item.error_message ?? null, now, item.retry_count ?? 0]
    )
    return (await this.getDeadLetterItemById(id))!
  }

  async getDeadLetterItemById(id: string): Promise<DeadLetterItem | null> {
    const rows = await this.conn.query<DeadLetterItemRow>('SELECT * FROM dead_letter_queue WHERE id = $1', [id])
    return rows[0] ? rowToDeadLetterItem(rows[0]) : null
  }

  async getDeadLetterQueue(limit: number = 100): Promise<DeadLetterItem[]> {
    const rows = await this.conn.query<DeadLetterItemRow>(
      'SELECT * FROM dead_letter_queue WHERE resolved_at IS NULL ORDER BY failed_at DESC LIMIT $1',
      [limit]
    )
    return rows.map(rowToDeadLetterItem)
  }

  async updateDeadLetterItem(id: string, updates: UpdateDeadLetterItem): Promise<DeadLetterItem | null> {
    const existing = await this.getDeadLetterItemById(id)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | null)[] = []
    let paramIndex = 1

    if (updates.resolved_at !== undefined) { fields.push(`resolved_at = $${paramIndex}`); values.push(updates.resolved_at); paramIndex++ }
    if (updates.resolution !== undefined) { fields.push(`resolution = $${paramIndex}`); values.push(updates.resolution); paramIndex++ }

    if (fields.length === 0) return existing
    values.push(id)

    await this.conn.execute(
      `UPDATE dead_letter_queue SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    return this.getDeadLetterItemById(id)
  }

  async deleteDeadLetterItem(id: string): Promise<boolean> {
    const result = await this.conn.execute('DELETE FROM dead_letter_queue WHERE id = $1', [id])
    return result.changes > 0
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, updates?: { started_at?: string | null; completed_at?: string | null; error_message?: string | null; result?: string | null }): Promise<void> {
    const existing = await this.getTaskById(taskId)
    if (!existing) return
    
    const fields: string[] = ['status = $1']
    const values: (string | number | null)[] = [status]
    let paramIndex = 2
    
    if (updates?.started_at !== undefined) { fields.push(`started_at = $${paramIndex}`); values.push(updates.started_at); paramIndex++ }
    if (updates?.completed_at !== undefined) { fields.push(`completed_at = $${paramIndex}`); values.push(updates.completed_at); paramIndex++ }
    if (updates?.error_message !== undefined) { fields.push(`error_message = $${paramIndex}`); values.push(updates.error_message); paramIndex++ }
    if (updates?.result !== undefined) { fields.push(`result = $${paramIndex}`); values.push(updates.result); paramIndex++ }
    values.push(taskId)

    await this.conn.execute(
      `UPDATE task_queue SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }

  async getCapacityRecord(serviceType: string): Promise<CapacityRecord | null> {
    return this.getCapacityByService(serviceType)
  }

  async getPendingTasks(jobId: string, limit: number): Promise<TaskQueueItem[]> {
    return this.getPendingTasksByJob(jobId, limit)
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
  }): Promise<{ records: MediaRecord[]; total: number }> {
    const { type, source, limit, offset, includeDeleted = false } = options
    
    let whereClause = ''
    const params: (string | number)[] = []
    let paramIndex = 1
    
    if (!includeDeleted) {
      if (this.conn.isPostgres()) {
        whereClause = 'WHERE is_deleted = false'
      } else {
        whereClause = 'WHERE is_deleted = 0'
      }
    }
    
    if (type) {
      whereClause += whereClause ? ` AND type = $${paramIndex}` : `WHERE type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }
    
    if (source) {
      whereClause += whereClause ? ` AND source = $${paramIndex}` : `WHERE source = $${paramIndex}`
      params.push(source)
      paramIndex++
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

  async getMediaRecordById(id: string): Promise<MediaRecord | null> {
    const rows = await this.conn.query<MediaRecordRow>('SELECT * FROM media_records WHERE id = $1', [id])
    return rows[0] ? rowToMediaRecord(rows[0]) : null
  }

  async createMediaRecord(data: CreateMediaRecord): Promise<MediaRecord> {
    const id = uuidv4()
    const now = toISODate()
    const metadata = data.metadata ? JSON.stringify(data.metadata) : null
    
    await this.conn.execute(
      `INSERT INTO media_records (id, filename, original_name, filepath, type, mime_type, size_bytes, source, task_id, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, data.filename, data.original_name ?? null, data.filepath, data.type, data.mime_type ?? null, data.size_bytes, data.source ?? null, data.task_id ?? null, metadata, now, now]
    )
    
    return (await this.getMediaRecordById(id))!
  }

  async updateMediaRecord(id: string, data: UpdateMediaRecord): Promise<MediaRecord | null> {
    const existing = await this.getMediaRecordById(id)
    if (!existing) return null
    
    const now = toISODate()
    const metadata = data.metadata !== undefined 
      ? (data.metadata ? JSON.stringify(data.metadata) : null)
      : existing.metadata
    
    await this.conn.execute(
      'UPDATE media_records SET original_name = $1, metadata = $2, updated_at = $3 WHERE id = $4',
      [data.original_name ?? existing.original_name, metadata, now, id]
    )
    
    return this.getMediaRecordById(id)
  }

  async softDeleteMediaRecord(id: string): Promise<boolean> {
    const existing = await this.getMediaRecordById(id)
    if (!existing) return false
    
    const now = toISODate()
    
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
    return true
  }

  async hardDeleteMediaRecord(id: string): Promise<boolean> {
    const result = await this.conn.execute('DELETE FROM media_records WHERE id = $1', [id])
    return result.changes > 0
  }

  async getExecutionStatsOverview(): Promise<{
    totalExecutions: number
    successRate: number
    avgDuration: number
    errorCount: number
  }> {
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
    `)

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

  async getExecutionStatsTrend(period: 'day' | 'week' | 'month'): Promise<{ date: string; total: number; success: number; failed: number }[]> {
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

    if (this.conn.isPostgres()) {
      const rows = await this.conn.query<{ date: string; total: string; success: string; failed: string }>(`
        SELECT 
          TO_CHAR(started_at, '${dateFormat}') as date,
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as success,
          COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed
        FROM execution_logs
        GROUP BY TO_CHAR(started_at, '${dateFormat}')
        ORDER BY date DESC
        LIMIT 90
      `)
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
        GROUP BY strftime('${dateFormat}', started_at)
        ORDER BY date DESC
        LIMIT 90
      `)
      return rows.map(r => ({
        date: r.date,
        total: parseInt(r.total, 10),
        success: parseInt(r.success, 10),
        failed: parseInt(r.failed, 10),
      }))
    }
  }

  async getExecutionStatsDistribution(): Promise<{ type: string; count: number }[]> {
    const rows = await this.conn.query<{ type: string; count: string }>(`
      SELECT 
        COALESCE(eld.node_type, 'unknown') as type,
        COUNT(DISTINCT el.id) as count
      FROM execution_logs el
      LEFT JOIN execution_log_details eld ON el.id = eld.log_id
      GROUP BY COALESCE(eld.node_type, 'unknown')
      ORDER BY count DESC
    `)

    const result = rows.map(r => ({ type: r.type, count: parseInt(r.count, 10) }))
    return result.length > 0 ? result.filter(r => r.type !== 'unknown') : []
  }

  async getExecutionStatsErrors(limit: number = 10): Promise<{ errorSummary: string; count: number }[]> {
    const rows = await this.conn.query<{ errorsummary: string; count: string }>(`
      SELECT 
        COALESCE(NULLIF(TRIM(error_summary), ''), 'Unknown error') as errorSummary,
        COUNT(*) as count
      FROM execution_logs
      WHERE error_summary IS NOT NULL AND error_summary != ''
      GROUP BY error_summary
      ORDER BY count DESC
      LIMIT $1
    `, [limit])

    return rows.map(r => ({ errorSummary: r.errorsummary, count: parseInt(r.count, 10) }))
  }

  async getPromptTemplates(options: {
    category?: string
    limit: number
    offset: number
  }): Promise<{ templates: PromptTemplate[]; total: number }> {
    const { category, limit, offset } = options

    let whereClause = ''
    const params: (string | number)[] = []
    let paramIndex = 1

    if (category) {
      whereClause = `WHERE category = $${paramIndex}`
      params.push(category)
      paramIndex++
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

  async getPromptTemplateById(id: string): Promise<PromptTemplate | null> {
    const rows = await this.conn.query<PromptTemplateRow>('SELECT * FROM prompt_templates WHERE id = $1', [id])
    return rows[0] ? rowToPromptTemplate(rows[0]) : null
  }

  async createPromptTemplate(data: CreatePromptTemplate): Promise<PromptTemplate> {
    const id = uuidv4()
    const now = toISODate()
    const variables = data.variables ? JSON.stringify(data.variables) : null
    const isBuiltin = data.is_builtin === true

    if (this.conn.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO prompt_templates (id, name, description, content, category, variables, is_builtin, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, data.name, data.description ?? null, data.content, data.category ?? null, variables, isBuiltin, now, now]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO prompt_templates (id, name, description, content, category, variables, is_builtin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.name, data.description ?? null, data.content, data.category ?? null, variables, isBuiltin ? 1 : 0, now, now]
      )
    }

    return (await this.getPromptTemplateById(id))!
  }

  async updatePromptTemplate(id: string, data: UpdatePromptTemplate): Promise<PromptTemplate | null> {
    const existing = await this.getPromptTemplateById(id)
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

    await this.conn.execute(
      `UPDATE prompt_templates SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return this.getPromptTemplateById(id)
  }

  async deletePromptTemplate(id: string): Promise<boolean> {
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
      `INSERT INTO audit_logs (id, action, resource_type, resource_id, user_id, ip_address, user_agent, request_method, request_path, request_body, response_status, duration_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, data.action, data.resource_type, data.resource_id ?? null, data.user_id ?? null, data.ip_address ?? null, data.user_agent ?? null, data.request_method ?? null, data.request_path ?? null, data.request_body ?? null, data.response_status ?? null, data.duration_ms ?? null, now]
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

  async getAuditStats(): Promise<AuditStats> {
    const totalRows = await this.conn.query<{ count: string }>('SELECT COUNT(*) as count FROM audit_logs')
    const total_logs = parseInt(totalRows[0]?.count ?? '0', 10)

    const actionRows = await this.conn.query<{ action: string; count: string }>(
      'SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action'
    )
    const by_action: Record<string, number> = { create: 0, update: 0, delete: 0, execute: 0 }
    actionRows.forEach(row => { by_action[row.action] = parseInt(row.count, 10) })

    const resourceRows = await this.conn.query<{ resource_type: string; count: string }>(
      'SELECT resource_type, COUNT(*) as count FROM audit_logs GROUP BY resource_type'
    )
    const by_resource_type: Record<string, number> = {}
    resourceRows.forEach(row => { by_resource_type[row.resource_type] = parseInt(row.count, 10) })

    const statusRows = await this.conn.query<{ response_status: string; count: string }>(
      'SELECT response_status, COUNT(*) as count FROM audit_logs WHERE response_status IS NOT NULL GROUP BY response_status'
    )
    const by_response_status: Record<string, number> = {}
    statusRows.forEach(row => { by_response_status[row.response_status] = parseInt(row.count, 10) })

    const avgDurationRows = await this.conn.query<{ avg_duration: string }>(
      "SELECT COALESCE(AVG(duration_ms), 0) as avg_duration FROM audit_logs WHERE duration_ms IS NOT NULL"
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