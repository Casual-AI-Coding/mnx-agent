import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import { runMigrations } from './migrations.js'
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
} from './types.js'

function toISODate(): string {
  return new Date().toISOString()
}

function rowToCronJob(row: CronJobRow): CronJob {
  return { 
    ...row, 
    is_active: row.is_active === 1,
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
  return { ...row, is_template: row.is_template === 1 }
}

function rowToJobTag(row: JobTagRow): JobTag {
  return row
}

function rowToJobDependency(row: JobDependencyRow): JobDependency {
  return row
}

function rowToWebhookConfig(row: WebhookConfigRow): WebhookConfig {
  return {
    ...row,
    events: JSON.parse(row.events) as import('./types.js').WebhookEvent[],
    headers: row.headers ? JSON.parse(row.headers) : null,
    is_active: row.is_active === 1,
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
  return {
    ...row,
    type: row.type as MediaRecord['type'],
    source: row.source as MediaRecord['source'],
    is_deleted: row.is_deleted === 1,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }
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

  isConnected(): boolean {
    try {
      this.db.prepare('SELECT 1').get()
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // Cron Jobs
  // ============================================

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
      INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_json, created_at, updated_at, timeout_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, job.name, job.description ?? null, job.cron_expression, job.is_active !== false ? 1 : 0, job.workflow_json, now, now, job.timeout_ms ?? 300000)
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
    if (updates.timeout_ms !== undefined) { fields.push('timeout_ms = ?'); values.push(updates.timeout_ms) }

    if (fields.length === 0) return existing
    fields.push('updated_at = ?')
    values.push(toISODate())
    values.push(id)
    const returningFields = ['id', 'name', 'description', 'cron_expression', 'is_active', 'workflow_json', 'created_at', 'updated_at', 'last_run_at', 'next_run_at', 'total_runs', 'total_failures', 'timeout_ms']
    const row = this.db.prepare(`UPDATE cron_jobs SET ${fields.join(', ')} WHERE id = ? RETURNING ${returningFields.join(', ')}`).get(...values) as CronJobRow | undefined
    return row ? rowToCronJob(row) : null
  }

  deleteCronJob(id: string): boolean {
    return this.db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(id).changes > 0
  }

  toggleCronJobActive(id: string): CronJob | null {
    const existing = this.getCronJobById(id)
    if (!existing) return null
    const newIsActive = existing.is_active ? 0 : 1
    const row = this.db.prepare('UPDATE cron_jobs SET is_active = ?, updated_at = ? WHERE id = ? RETURNING *').get(newIsActive, toISODate(), id) as CronJobRow | undefined
    return row ? rowToCronJob(row) : null
  }

  updateCronJobRunStats(id: string, stats: RunStats): CronJob | null {
    const existing = this.getCronJobById(id)
    if (!existing) return null
    const newTotalRuns = existing.total_runs + 1
    const newTotalFailures = stats.success ? existing.total_failures : existing.total_failures + 1
    const row = this.db.prepare(`UPDATE cron_jobs SET total_runs = ?, total_failures = ?, last_run_at = ?, updated_at = ? WHERE id = ? RETURNING *`)
      .get(newTotalRuns, newTotalFailures, toISODate(), toISODate(), id) as CronJobRow | undefined
    return row ? rowToCronJob(row) : null
  }

  updateCronJobLastRun(id: string, nextRun: string): CronJob | null {
    const now = toISODate()
    const row = this.db.prepare(`UPDATE cron_jobs SET last_run_at = ?, next_run_at = ?, updated_at = ? WHERE id = ? RETURNING *`).get(now, nextRun, now, id) as CronJobRow | undefined
    return row ? rowToCronJob(row) : null
  }

  getActiveCronJobs(): CronJob[] {
    const rows = this.db.prepare('SELECT * FROM cron_jobs WHERE is_active = 1 ORDER BY created_at DESC').all() as CronJobRow[]
    return rows.map(rowToCronJob)
  }

  // ============================================
  // Task Queue
  // ============================================

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
    const row = this.db.prepare(`
      INSERT INTO task_queue (id, job_id, task_type, payload, priority, status, max_retries, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
      RETURNING *
    `).get(id, task.job_id ?? null, task.task_type, task.payload, task.priority ?? 0, task.status ?? TaskStatus.PENDING, task.max_retries ?? 3, now) as TaskQueueRow
    return rowToTaskQueueItem(row)
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
    const returningFields = ['id', 'job_id', 'task_type', 'payload', 'priority', 'status', 'retry_count', 'max_retries', 'error_message', 'result', 'created_at', 'started_at', 'completed_at']
    const row = this.db.prepare(`UPDATE task_queue SET ${fields.join(', ')} WHERE id = ? RETURNING ${returningFields.join(', ')}`).get(...values) as TaskQueueRow | undefined
    return row ? rowToTaskQueueItem(row) : null
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

  getPendingTaskCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('pending') as { count: number }
    return row?.count ?? 0
  }

  getRunningTaskCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('running') as { count: number }
    return row?.count ?? 0
  }

  getFailedTaskCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('failed') as { count: number }
    return row?.count ?? 0
  }

  markTaskRunning(id: string): TaskQueueItem | null {
    const row = this.db.prepare(`UPDATE task_queue SET status = 'running', started_at = ? WHERE id = ? RETURNING *`).get(toISODate(), id) as TaskQueueRow | undefined
    return row ? rowToTaskQueueItem(row) : null
  }

  markTaskCompleted(id: string, result?: string): TaskQueueItem | null {
    const row = this.db.prepare(`UPDATE task_queue SET status = 'completed', completed_at = ?, result = ? WHERE id = ? RETURNING *`).get(toISODate(), result ?? null, id) as TaskQueueRow | undefined
    return row ? rowToTaskQueueItem(row) : null
  }

  markTaskFailed(id: string, error: string): TaskQueueItem | null {
    const existing = this.getTaskById(id)
    if (!existing) return null
    const newRetryCount = existing.retry_count + 1
    const newStatus = newRetryCount >= existing.max_retries ? 'failed' : 'pending'
    const row = this.db.prepare(`UPDATE task_queue SET status = ?, retry_count = ?, error_message = ?, completed_at = ? WHERE id = ? RETURNING *`)
      .get(newStatus, newRetryCount, error, newStatus === 'failed' ? toISODate() : null, id) as TaskQueueRow | undefined
    return row ? rowToTaskQueueItem(row) : null
  }

  getTasksByJobId(jobId: string): TaskQueueItem[] {
    const rows = this.db.prepare('SELECT * FROM task_queue WHERE job_id = ? ORDER BY created_at ASC').all(jobId) as TaskQueueRow[]
    return rows.map(rowToTaskQueueItem)
  }

  // ============================================
  // Execution Logs
  // ============================================

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
    const row = this.db.prepare(`
      INSERT INTO execution_logs (id, job_id, trigger_type, status, started_at, tasks_executed, tasks_succeeded, tasks_failed, error_summary, log_detail) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
      RETURNING *
    `).get(id, log.job_id ?? null, log.trigger_type, log.status, now, log.tasks_executed ?? 0, log.tasks_succeeded ?? 0, log.tasks_failed ?? 0, log.error_summary ?? null, log.log_detail ?? null) as ExecutionLogRow
    return rowToExecutionLog(row)
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
    const row = this.db.prepare(`UPDATE execution_logs SET ${fields.join(', ')} WHERE id = ? RETURNING *`).get(...values) as ExecutionLogRow | undefined
    return row ? rowToExecutionLog(row) : null
  }

  completeExecutionLog(id: string, stats: RunStats): ExecutionLog | null {
    const status = stats.success ? 'completed' : 'failed'
    const row = this.db.prepare(`UPDATE execution_logs SET status = ?, completed_at = ?, duration_ms = ?, tasks_executed = ?, tasks_succeeded = ?, tasks_failed = ?, error_summary = ? WHERE id = ? RETURNING *`)
      .get(status, toISODate(), stats.durationMs, stats.tasksExecuted, stats.tasksSucceeded, stats.tasksFailed, stats.errorSummary ?? null, id) as ExecutionLogRow | undefined
    return row ? rowToExecutionLog(row) : null
  }

  getRecentExecutionLogs(limit: number = 20): ExecutionLog[] {
    return this.getAllExecutionLogs(undefined, limit)
  }

  // ============================================
  // Capacity Tracking
  // ============================================

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

  // ============================================
  // Workflow Templates
  // ============================================

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

  // ============================================
  // Job Tags
  // ============================================

  getJobTags(jobId: string): string[] {
    const rows = this.db.prepare('SELECT tag FROM job_tags WHERE job_id = ? ORDER BY tag').all(jobId) as { tag: string }[]
    return rows.map(r => r.tag)
  }

  addJobTag(jobId: string, tag: string): JobTag {
    const id = uuidv4()
    const now = toISODate()
    this.db.prepare('INSERT INTO job_tags (id, job_id, tag, created_at) VALUES (?, ?, ?, ?)').run(id, jobId, tag, now)
    return { id, job_id: jobId, tag, created_at: now }
  }

  removeJobTag(jobId: string, tag: string): boolean {
    return this.db.prepare('DELETE FROM job_tags WHERE job_id = ? AND tag = ?').run(jobId, tag).changes > 0
  }

  getJobsByTag(tag: string): CronJob[] {
    const rows = this.db.prepare(`
      SELECT j.* FROM cron_jobs j
      INNER JOIN job_tags t ON j.id = t.job_id
      WHERE t.tag = ?
      ORDER BY j.created_at DESC
    `).all(tag) as CronJobRow[]
    return rows.map(rowToCronJob)
  }

  getAllTags(): string[] {
    const rows = this.db.prepare('SELECT DISTINCT tag FROM job_tags ORDER BY tag').all() as { tag: string }[]
    return rows.map(r => r.tag)
  }

  // ============================================
  // Job Dependencies
  // ============================================

  getJobDependencies(jobId: string): string[] {
    const rows = this.db.prepare('SELECT depends_on_job_id FROM job_dependencies WHERE job_id = ?').all(jobId) as { depends_on_job_id: string }[]
    return rows.map(r => r.depends_on_job_id)
  }

  getJobDependents(jobId: string): string[] {
    const rows = this.db.prepare('SELECT job_id FROM job_dependencies WHERE depends_on_job_id = ?').all(jobId) as { job_id: string }[]
    return rows.map(r => r.job_id)
  }

  addJobDependency(jobId: string, dependsOnJobId: string): JobDependency {
    const id = uuidv4()
    const now = toISODate()
    this.db.prepare('INSERT INTO job_dependencies (id, job_id, depends_on_job_id, created_at) VALUES (?, ?, ?, ?)').run(id, jobId, dependsOnJobId, now)
    return { id, job_id: jobId, depends_on_job_id: dependsOnJobId, created_at: now }
  }

  removeJobDependency(jobId: string, dependsOnJobId: string): boolean {
    return this.db.prepare('DELETE FROM job_dependencies WHERE job_id = ? AND depends_on_job_id = ?').run(jobId, dependsOnJobId).changes > 0
  }

  // ============================================
  // Webhook Configs
  // ============================================

  getWebhookConfigs(jobId?: string): WebhookConfig[] {
    const sql = jobId
      ? 'SELECT * FROM webhook_configs WHERE job_id = ? AND is_active = 1'
      : 'SELECT * FROM webhook_configs WHERE is_active = 1'
    const rows = jobId 
      ? this.db.prepare(sql).all(jobId) as WebhookConfigRow[]
      : this.db.prepare(sql).all() as WebhookConfigRow[]
    return rows.map(rowToWebhookConfig)
  }

  getWebhookConfigById(id: string): WebhookConfig | null {
    const row = this.db.prepare('SELECT * FROM webhook_configs WHERE id = ?').get(id) as WebhookConfigRow | undefined
    return row ? rowToWebhookConfig(row) : null
  }

  createWebhookConfig(config: CreateWebhookConfig): WebhookConfig {
    const id = uuidv4()
    const now = toISODate()
    const row = this.db.prepare(`
      INSERT INTO webhook_configs (id, job_id, name, url, events, headers, secret, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(
      id,
      config.job_id ?? null,
      config.name,
      config.url,
      JSON.stringify(config.events),
      config.headers ? JSON.stringify(config.headers) : null,
      config.secret ?? null,
      config.is_active !== false ? 1 : 0,
      now,
      now
    ) as WebhookConfigRow
    return rowToWebhookConfig(row)
  }

  updateWebhookConfig(id: string, updates: UpdateWebhookConfig): WebhookConfig | null {
    const existing = this.getWebhookConfigById(id)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.url !== undefined) { fields.push('url = ?'); values.push(updates.url) }
    if (updates.events !== undefined) { fields.push('events = ?'); values.push(JSON.stringify(updates.events)) }
    if (updates.headers !== undefined) { fields.push('headers = ?'); values.push(updates.headers ? JSON.stringify(updates.headers) : null) }
    if (updates.secret !== undefined) { fields.push('secret = ?'); values.push(updates.secret) }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0) }

    if (fields.length === 0) return existing
    fields.push('updated_at = ?')
    values.push(toISODate())
    values.push(id)
    const row = this.db.prepare(`UPDATE webhook_configs SET ${fields.join(', ')} WHERE id = ? RETURNING *`).get(...values) as WebhookConfigRow | undefined
    return row ? rowToWebhookConfig(row) : null
  }

  deleteWebhookConfig(id: string): boolean {
    return this.db.prepare('DELETE FROM webhook_configs WHERE id = ?').run(id).changes > 0
  }

  // ============================================
  // Webhook Deliveries
  // ============================================

  createWebhookDelivery(delivery: CreateWebhookDelivery): WebhookDelivery {
    const id = uuidv4()
    const now = toISODate()
    this.db.prepare(`
      INSERT INTO webhook_deliveries (id, webhook_id, execution_log_id, event, payload, response_status, response_body, error_message, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      delivery.webhook_id,
      delivery.execution_log_id ?? null,
      delivery.event,
      delivery.payload,
      delivery.response_status ?? null,
      delivery.response_body ?? null,
      delivery.error_message ?? null,
      now
    )
    return { ...delivery, id, delivered_at: now }
  }

  getWebhookDeliveries(webhookId: string, limit: number = 100): WebhookDelivery[] {
    const rows = this.db.prepare('SELECT * FROM webhook_deliveries WHERE webhook_id = ? ORDER BY delivered_at DESC LIMIT ?')
      .all(webhookId, limit) as WebhookDeliveryRow[]
    return rows.map(rowToWebhookDelivery)
  }

  // ============================================
  // Dead Letter Queue
  // ============================================

  createDeadLetterItem(item: CreateDeadLetterItem): DeadLetterItem {
    const id = uuidv4()
    const now = toISODate()
    this.db.prepare(`
      INSERT INTO dead_letter_queue (id, original_task_id, job_id, task_type, payload, error_message, failed_at, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      item.original_task_id ?? null,
      item.job_id ?? null,
      item.task_type,
      item.payload,
      item.error_message ?? null,
      now,
      item.retry_count ?? 0
    )
    return this.getDeadLetterItemById(id)!
  }

  getDeadLetterItemById(id: string): DeadLetterItem | null {
    const row = this.db.prepare('SELECT * FROM dead_letter_queue WHERE id = ?').get(id) as DeadLetterItemRow | undefined
    return row ? rowToDeadLetterItem(row) : null
  }

  getDeadLetterQueue(limit: number = 100): DeadLetterItem[] {
    const rows = this.db.prepare('SELECT * FROM dead_letter_queue WHERE resolved_at IS NULL ORDER BY failed_at DESC LIMIT ?')
      .all(limit) as DeadLetterItemRow[]
    return rows.map(rowToDeadLetterItem)
  }

  updateDeadLetterItem(id: string, updates: UpdateDeadLetterItem): DeadLetterItem | null {
    const existing = this.getDeadLetterItemById(id)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | null)[] = []

    if (updates.resolved_at !== undefined) { fields.push('resolved_at = ?'); values.push(updates.resolved_at) }
    if (updates.resolution !== undefined) { fields.push('resolution = ?'); values.push(updates.resolution) }

    if (fields.length === 0) return existing
    values.push(id)
    this.db.prepare(`UPDATE dead_letter_queue SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.getDeadLetterItemById(id)
  }

  deleteDeadLetterItem(id: string): boolean {
    return this.db.prepare('DELETE FROM dead_letter_queue WHERE id = ?').run(id).changes > 0
  }

  // ============================================
  // Legacy compatibility methods
  // ============================================

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

  // ============================================================================
  // Media Records
  // ============================================================================

  getMediaRecords(options: {
    type?: string
    source?: string
    limit: number
    offset: number
    includeDeleted?: boolean
  }): { records: MediaRecord[]; total: number } {
    const { type, source, limit, offset, includeDeleted = false } = options
    
    let whereClause = ''
    const params: (string | number)[] = []
    
    if (!includeDeleted) {
      whereClause = 'WHERE is_deleted = 0'
    }
    
    if (type) {
      whereClause += whereClause ? ' AND type = ?' : 'WHERE type = ?'
      params.push(type)
    }
    
    if (source) {
      whereClause += whereClause ? ' AND source = ?' : 'WHERE source = ?'
      params.push(source)
    }
    
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM media_records ${whereClause}`)
    const countResult = countStmt.get(...params) as { count: number }
    const total = countResult.count
    
    const query = `SELECT * FROM media_records ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params, limit, offset) as MediaRecordRow[]
    
    return {
      records: rows.map(rowToMediaRecord),
      total,
    }
  }

  getMediaRecordById(id: string): MediaRecord | null {
    const stmt = this.db.prepare('SELECT * FROM media_records WHERE id = ?')
    const row = stmt.get(id) as MediaRecordRow | undefined
    if (!row) return null
    return rowToMediaRecord(row)
  }

  createMediaRecord(data: CreateMediaRecord): MediaRecord {
    const id = uuidv4()
    const now = toISODate()
    const metadata = data.metadata ? JSON.stringify(data.metadata) : null
    
    const stmt = this.db.prepare(`
      INSERT INTO media_records (id, filename, original_name, filepath, type, mime_type, size_bytes, source, task_id, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id,
      data.filename,
      data.original_name ?? null,
      data.filepath,
      data.type,
      data.mime_type ?? null,
      data.size_bytes,
      data.source ?? null,
      data.task_id ?? null,
      metadata,
      now,
      now
    )
    
    return this.getMediaRecordById(id)!
  }

  updateMediaRecord(id: string, data: UpdateMediaRecord): MediaRecord | null {
    const existing = this.getMediaRecordById(id)
    if (!existing) return null
    
    const now = toISODate()
    const metadata = data.metadata !== undefined 
      ? (data.metadata ? JSON.stringify(data.metadata) : null)
      : existing.metadata
    
    const stmt = this.db.prepare(`
      UPDATE media_records SET original_name = ?, metadata = ?, updated_at = ? WHERE id = ?
    `)
    
    stmt.run(
      data.original_name ?? existing.original_name,
      metadata,
      now,
      id
    )
    
    return this.getMediaRecordById(id)
  }

  softDeleteMediaRecord(id: string): boolean {
    const existing = this.getMediaRecordById(id)
    if (!existing) return false
    
    const now = toISODate()
    const stmt = this.db.prepare(`
      UPDATE media_records SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?
    `)
    
    stmt.run(now, now, id)
    return true
  }

  hardDeleteMediaRecord(id: string): boolean {
    const result = this.db.prepare('DELETE FROM media_records WHERE id = ?').run(id)
    return result.changes > 0
  }
}

let dbInstance: DatabaseService | null = null
const inMemoryInstances: Map<string, DatabaseService> = new Map()

export function getDatabase(dbPath?: string): DatabaseService {
  if (dbPath) {
    if (dbPath === ':memory:') {
      if (inMemoryInstances.has(dbPath)) {
        return inMemoryInstances.get(dbPath)!
      }
      const db = new DatabaseService(dbPath)
      db.init()
      inMemoryInstances.set(dbPath, db)
      if (!dbInstance) {
        dbInstance = db
      }
      return db
    }
    const db = new DatabaseService(dbPath)
    db.init()
    return db
  }
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
  inMemoryInstances.forEach(db => db.close())
  inMemoryInstances.clear()
}
