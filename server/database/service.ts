import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import { runMigrations } from './migrations.js'
import type {
  CronJob,
  TaskQueueItem,
  ExecutionLog,
  CapacityRecord,
  WorkflowTemplate,
  CreateCronJob,
  CreateTaskQueueItem,
  CreateExecutionLog,
  UpdateCronJob,
  UpdateTaskQueueItem,
  UpdateExecutionLog,
  UpdateCapacityRecord,
  UpdateWorkflowTemplate,
  RunStats,
  CronJobRow,
  TaskQueueRow,
  ExecutionLogRow,
  CapacityRecordRow,
  WorkflowTemplateRow,
  TaskStatus,
  TriggerType,
  ExecutionStatus,
} from './types.js'

function toISODate(): string {
  return new Date().toISOString()
}

function rowToCronJob(row: CronJobRow): CronJob {
  return { ...row, is_active: row.is_active === 1 }
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
  return { ...row, is_template: row.is_template === 1 }
}

export class DatabaseService {
  private db: DatabaseType

  constructor(dbPath?: string) {
    const path = dbPath || process.env.DATABASE_PATH || './data/minimax.db'
    const dbDir = dirname(path)
    if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
  }

  init(): void {
    runMigrations(this.db)
  }

  close(): void {
    this.db.close()
  }

  getDatabase(): DatabaseType {
    return this.db
  }

  getAllCronJobs(): CronJob[] {
    const rows = this.db.prepare('SELECT * FROM cron_jobs ORDER BY created_at DESC').all() as CronJobRow[]
    return rows.map(rowToCronJob)
  }

  getCronJobById(id: string): CronJob | null {
    const row = this.db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id) as CronJobRow | undefined
    return row ? rowToCronJob(row) : null
  }

  createCronJob(job: CreateCronJob): CronJob {
    const id = uuidv4()
    const now = toISODate()
    this.db.prepare(`
      INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, job.name, job.description ?? null, job.cron_expression, job.is_active !== false ? 1 : 0, job.workflow_json, now, now)
    return this.getCronJobById(id)!
  }

  updateCronJob(id: string, updates: UpdateCronJob): CronJob | null {
    const existing = this.getCronJobById(id)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
    if (updates.cron_expression !== undefined) { fields.push('cron_expression = ?'); values.push(updates.cron_expression) }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0) }
    if (updates.workflow_json !== undefined) { fields.push('workflow_json = ?'); values.push(updates.workflow_json) }
    if (updates.last_run_at !== undefined) { fields.push('last_run_at = ?'); values.push(updates.last_run_at) }
    if (updates.next_run_at !== undefined) { fields.push('next_run_at = ?'); values.push(updates.next_run_at) }
    if (updates.total_runs !== undefined) { fields.push('total_runs = ?'); values.push(updates.total_runs) }
    if (updates.total_failures !== undefined) { fields.push('total_failures = ?'); values.push(updates.total_failures) }

    if (fields.length === 0) return existing
    fields.push('updated_at = ?')
    values.push(toISODate())
    values.push(id)
    this.db.prepare(`UPDATE cron_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.getCronJobById(id)
  }

  deleteCronJob(id: string): boolean {
    return this.db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(id).changes > 0
  }

  toggleCronJobActive(id: string): CronJob | null {
    const existing = this.getCronJobById(id)
    if (!existing) return null
    this.db.prepare('UPDATE cron_jobs SET is_active = ?, updated_at = ? WHERE id = ?').run(existing.is_active ? 0 : 1, toISODate(), id)
    return this.getCronJobById(id)
  }

  updateCronJobRunStats(id: string, stats: RunStats): CronJob | null {
    const existing = this.getCronJobById(id)
    if (!existing) return null
    const newTotalRuns = existing.total_runs + 1
    const newTotalFailures = stats.success ? existing.total_failures : existing.total_failures + 1
    this.db.prepare(`UPDATE cron_jobs SET total_runs = ?, total_failures = ?, last_run_at = ?, updated_at = ? WHERE id = ?`)
      .run(newTotalRuns, newTotalFailures, toISODate(), toISODate(), id)
    return this.getCronJobById(id)
  }

  updateCronJobLastRun(id: string, nextRun: string): CronJob | null {
    const now = toISODate()
    this.db.prepare(`UPDATE cron_jobs SET last_run_at = ?, next_run_at = ?, updated_at = ? WHERE id = ?`).run(now, nextRun, now, id)
    return this.getCronJobById(id)
  }

  getActiveCronJobs(): CronJob[] {
    const rows = this.db.prepare('SELECT * FROM cron_jobs WHERE is_active = 1 ORDER BY created_at DESC').all() as CronJobRow[]
    return rows.map(rowToCronJob)
  }

  getAllTasks(status?: TaskStatus): TaskQueueItem[] {
    const sql = status
      ? 'SELECT * FROM task_queue WHERE status = ? ORDER BY priority DESC, created_at ASC'
      : 'SELECT * FROM task_queue ORDER BY priority DESC, created_at ASC'
    const rows = status ? this.db.prepare(sql).all(status) as TaskQueueRow[] : this.db.prepare(sql).all() as TaskQueueRow[]
    return rows.map(rowToTaskQueueItem)
  }

  getTaskById(id: string): TaskQueueItem | null {
    const row = this.db.prepare('SELECT * FROM task_queue WHERE id = ?').get(id) as TaskQueueRow | undefined
    return row ? rowToTaskQueueItem(row) : null
  }

  getTaskPayload(id: string): Promise<{ payload: string; result: string | null } | null> {
    const row = this.db.prepare('SELECT payload, result FROM task_queue WHERE id = ?').get(id) as { payload: string; result: string | null } | undefined
    return Promise.resolve(row ?? null)
  }

  createTask(task: CreateTaskQueueItem): TaskQueueItem {
    const id = uuidv4()
    const now = toISODate()
    this.db.prepare(`INSERT INTO task_queue (id, job_id, task_type, payload, priority, status, max_retries, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, task.job_id ?? null, task.task_type, task.payload, task.priority ?? 0, task.status ?? 'pending', task.max_retries ?? 3, now)
    return this.getTaskById(id)!
  }

  updateTask(id: string, updates: UpdateTaskQueueItem): TaskQueueItem | null {
    const existing = this.getTaskById(id)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
    if (updates.retry_count !== undefined) { fields.push('retry_count = ?'); values.push(updates.retry_count) }
    if (updates.error_message !== undefined) { fields.push('error_message = ?'); values.push(updates.error_message) }
    if (updates.result !== undefined) { fields.push('result = ?'); values.push(updates.result) }
    if (updates.started_at !== undefined) { fields.push('started_at = ?'); values.push(updates.started_at) }
    if (updates.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(updates.completed_at) }

    if (fields.length === 0) return existing
    values.push(id)
    this.db.prepare(`UPDATE task_queue SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.getTaskById(id)
  }

  deleteTask(id: string): boolean {
    return this.db.prepare('DELETE FROM task_queue WHERE id = ?').run(id).changes > 0
  }

  getPendingTasksByJob(jobId: string | null, limit: number = 10): TaskQueueItem[] {
    const sql = jobId
      ? 'SELECT * FROM task_queue WHERE job_id = ? AND status = ? ORDER BY priority DESC, created_at ASC LIMIT ?'
      : 'SELECT * FROM task_queue WHERE status = ? ORDER BY priority DESC, created_at ASC LIMIT ?'
    const rows = jobId
      ? this.db.prepare(sql).all(jobId, 'pending', limit) as TaskQueueRow[]
      : this.db.prepare(sql).all('pending', limit) as TaskQueueRow[]
    return rows.map(rowToTaskQueueItem)
  }

  markTaskRunning(id: string): TaskQueueItem | null {
    this.db.prepare(`UPDATE task_queue SET status = ?, started_at = ? WHERE id = ?`).run('running', toISODate(), id)
    return this.getTaskById(id)
  }

  markTaskCompleted(id: string, result?: string): TaskQueueItem | null {
    this.db.prepare(`UPDATE task_queue SET status = ?, completed_at = ?, result = ? WHERE id = ?`).run('completed', toISODate(), result ?? null, id)
    return this.getTaskById(id)
  }

  markTaskFailed(id: string, error: string): TaskQueueItem | null {
    const existing = this.getTaskById(id)
    if (!existing) return null
    const newRetryCount = existing.retry_count + 1
    const newStatus = newRetryCount >= existing.max_retries ? 'failed' : 'pending'
    this.db.prepare(`UPDATE task_queue SET status = ?, retry_count = ?, error_message = ?, completed_at = ? WHERE id = ?`)
      .run(newStatus, newRetryCount, error, newStatus === 'failed' ? toISODate() : null, id)
    return this.getTaskById(id)
  }

  getTasksByJobId(jobId: string): TaskQueueItem[] {
    const rows = this.db.prepare('SELECT * FROM task_queue WHERE job_id = ? ORDER BY created_at ASC').all(jobId) as TaskQueueRow[]
    return rows.map(rowToTaskQueueItem)
  }

  getAllExecutionLogs(jobId?: string, limit: number = 100): ExecutionLog[] {
    const sql = jobId
      ? 'SELECT * FROM execution_logs WHERE job_id = ? ORDER BY started_at DESC LIMIT ?'
      : 'SELECT * FROM execution_logs ORDER BY started_at DESC LIMIT ?'
    const rows = jobId ? this.db.prepare(sql).all(jobId, limit) as ExecutionLogRow[] : this.db.prepare(sql).all(limit) as ExecutionLogRow[]
    return rows.map(rowToExecutionLog)
  }

  getExecutionLogById(id: string): ExecutionLog | null {
    const row = this.db.prepare('SELECT * FROM execution_logs WHERE id = ?').get(id) as ExecutionLogRow | undefined
    return row ? rowToExecutionLog(row) : null
  }

  createExecutionLog(log: CreateExecutionLog): ExecutionLog {
    const id = uuidv4()
    const now = toISODate()
    this.db.prepare(`INSERT INTO execution_logs (id, job_id, trigger_type, status, started_at, tasks_executed, tasks_succeeded, tasks_failed, error_summary, log_detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, log.job_id ?? null, log.trigger_type, log.status, now, log.tasks_executed ?? 0, log.tasks_succeeded ?? 0, log.tasks_failed ?? 0, log.error_summary ?? null, log.log_detail ?? null)
    return this.getExecutionLogById(id)!
  }

  updateExecutionLog(id: string, updates: UpdateExecutionLog): ExecutionLog | null {
    const existing = this.getExecutionLogById(id)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
    if (updates.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(updates.completed_at) }
    if (updates.duration_ms !== undefined) { fields.push('duration_ms = ?'); values.push(updates.duration_ms) }
    if (updates.tasks_executed !== undefined) { fields.push('tasks_executed = ?'); values.push(updates.tasks_executed) }
    if (updates.tasks_succeeded !== undefined) { fields.push('tasks_succeeded = ?'); values.push(updates.tasks_succeeded) }
    if (updates.tasks_failed !== undefined) { fields.push('tasks_failed = ?'); values.push(updates.tasks_failed) }
    if (updates.error_summary !== undefined) { fields.push('error_summary = ?'); values.push(updates.error_summary) }
    if (updates.log_detail !== undefined) { fields.push('log_detail = ?'); values.push(updates.log_detail) }

    if (fields.length === 0) return existing
    values.push(id)
    this.db.prepare(`UPDATE execution_logs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.getExecutionLogById(id)
  }

  completeExecutionLog(id: string, stats: RunStats): ExecutionLog | null {
    const status = stats.success ? 'completed' : 'failed'
    this.db.prepare(`UPDATE execution_logs SET status = ?, completed_at = ?, duration_ms = ?, tasks_executed = ?, tasks_succeeded = ?, tasks_failed = ?, error_summary = ? WHERE id = ?`)
      .run(status, toISODate(), stats.durationMs, stats.tasksExecuted, stats.tasksSucceeded, stats.tasksFailed, stats.errorSummary ?? null, id)
    return this.getExecutionLogById(id)
  }

  getRecentExecutionLogs(limit: number = 20): ExecutionLog[] {
    return this.getAllExecutionLogs(undefined, limit)
  }

  getAllCapacityRecords(): CapacityRecord[] {
    const rows = this.db.prepare('SELECT * FROM capacity_tracking ORDER BY service_type').all() as CapacityRecordRow[]
    return rows.map(rowToCapacityRecord)
  }

  getCapacityByService(serviceType: string): CapacityRecord | null {
    const row = this.db.prepare('SELECT * FROM capacity_tracking WHERE service_type = ?').get(serviceType) as CapacityRecordRow | undefined
    return row ? rowToCapacityRecord(row) : null
  }

  upsertCapacityRecord(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): CapacityRecord {
    const existing = this.getCapacityByService(serviceType)
    const now = toISODate()

    if (existing) {
      this.db.prepare(`UPDATE capacity_tracking SET remaining_quota = ?, total_quota = ?, reset_at = ?, last_checked_at = ? WHERE service_type = ?`)
        .run(data.remaining_quota, data.total_quota, data.reset_at ?? null, now, serviceType)
      return this.getCapacityByService(serviceType)!
    }

    const id = uuidv4()
    this.db.prepare(`INSERT INTO capacity_tracking (id, service_type, remaining_quota, total_quota, reset_at, last_checked_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, serviceType, data.remaining_quota, data.total_quota, data.reset_at ?? null, now)
    return this.getCapacityByService(serviceType)!
  }

  updateTaskStatus(taskId: string, status: TaskStatus, updates?: { started_at?: string | null; completed_at?: string | null; error_message?: string | null; result?: string | null }): Promise<void> {
    const existing = this.getTaskById(taskId)
    if (!existing) return Promise.resolve()
    const fields: string[] = ['status = ?']
    const values: (string | number | null)[] = [status]
    if (updates?.started_at !== undefined) { fields.push('started_at = ?'); values.push(updates.started_at) }
    if (updates?.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(updates.completed_at) }
    if (updates?.error_message !== undefined) { fields.push('error_message = ?'); values.push(updates.error_message) }
    if (updates?.result !== undefined) { fields.push('result = ?'); values.push(updates.result) }
    values.push(taskId)
    this.db.prepare(`UPDATE task_queue SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return Promise.resolve()
  }

  getCapacityRecord(serviceType: string): Promise<CapacityRecord | null> {
    return Promise.resolve(this.getCapacityByService(serviceType))
  }

  getPendingTasks(jobId: string, limit: number): Promise<TaskQueueItem[]> {
    return Promise.resolve(this.getPendingTasksByJob(jobId, limit))
  }

  createTaskQueueItem(data: { job_id?: string | null; task_type: string; payload: string; priority?: number; status?: string; max_retries?: number }): Promise<string> {
    const item = this.createTask({
      job_id: data.job_id ?? null,
      task_type: data.task_type,
      payload: data.payload,
      priority: data.priority ?? 0,
      status: (data.status as TaskStatus) ?? 'pending',
      max_retries: data.max_retries ?? 3,
    })
    return Promise.resolve(item.id)
  }

  getCapacity(serviceType: string): Promise<{ remaining: number; total: number } | null> {
    const record = this.getCapacityByService(serviceType)
    if (!record) return Promise.resolve(null)
    return Promise.resolve({ remaining: record.remaining_quota, total: record.total_quota })
  }

  updateCapacity(serviceType: string, remaining: number): Promise<void> {
    const record = this.getCapacityByService(serviceType)
    if (!record) return Promise.resolve()
    this.db.prepare(`UPDATE capacity_tracking SET remaining_quota = ?, last_checked_at = ? WHERE service_type = ?`).run(remaining, toISODate(), serviceType)
    return Promise.resolve()
  }

  decrementCapacity(serviceType: string, amount: number = 1): CapacityRecord | null {
    const existing = this.getCapacityByService(serviceType)
    if (!existing) return null
    const newRemaining = Math.max(0, existing.remaining_quota - amount)
    this.db.prepare(`UPDATE capacity_tracking SET remaining_quota = ?, last_checked_at = ? WHERE service_type = ?`).run(newRemaining, toISODate(), serviceType)
    return this.getCapacityByService(serviceType)
  }

  getAllWorkflowTemplates(): WorkflowTemplate[] {
    const rows = this.db.prepare('SELECT * FROM workflow_templates ORDER BY created_at DESC').all() as WorkflowTemplateRow[]
    return rows.map(rowToWorkflowTemplate)
  }

  getWorkflowTemplateById(id: string): WorkflowTemplate | null {
    const row = this.db.prepare('SELECT * FROM workflow_templates WHERE id = ?').get(id) as WorkflowTemplateRow | undefined
    return row ? rowToWorkflowTemplate(row) : null
  }

  createWorkflowTemplate(template: { name: string; description?: string | null; nodes_json: string; edges_json: string; is_template?: boolean }): WorkflowTemplate {
    const id = uuidv4()
    const now = toISODate()
    this.db.prepare(`INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, created_at, is_template) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, template.name, template.description ?? null, template.nodes_json, template.edges_json, now, template.is_template !== false ? 1 : 0)
    return this.getWorkflowTemplateById(id)!
  }

  updateWorkflowTemplate(id: string, updates: UpdateWorkflowTemplate): WorkflowTemplate | null {
    const existing = this.getWorkflowTemplateById(id)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
    if (updates.nodes_json !== undefined) { fields.push('nodes_json = ?'); values.push(updates.nodes_json) }
    if (updates.edges_json !== undefined) { fields.push('edges_json = ?'); values.push(updates.edges_json) }
    if (updates.is_template !== undefined) { fields.push('is_template = ?'); values.push(updates.is_template ? 1 : 0) }

    if (fields.length === 0) return existing
    values.push(id)
    this.db.prepare(`UPDATE workflow_templates SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.getWorkflowTemplateById(id)
  }

  deleteWorkflowTemplate(id: string): boolean {
    return this.db.prepare('DELETE FROM workflow_templates WHERE id = ?').run(id).changes > 0
  }

  getMarkedWorkflowTemplates(): WorkflowTemplate[] {
    const rows = this.db.prepare('SELECT * FROM workflow_templates WHERE is_template = 1 ORDER BY created_at DESC').all() as WorkflowTemplateRow[]
    return rows.map(rowToWorkflowTemplate)
  }
}

let dbInstance: DatabaseService | null = null

export function getDatabase(): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService()
    dbInstance.init()
  }
  return dbInstance
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}