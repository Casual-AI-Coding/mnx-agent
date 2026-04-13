import { DatabaseConnection, createConnection, closeConnection, QueryResultRow } from './connection.js'
import { TaskStatus, TriggerType, ExecutionStatus } from './types.js'
import type {
  CronJob,
  TaskQueueItem,
  ExecutionLog,
  ExecutionLogDetail,
  CapacityRecord,
  WorkflowTemplate,
  WorkflowVersion,
  CreateCronJob,
  CreateTaskQueueItem,
  CreateExecutionLog,
  CreateExecutionLogDetail,
  UpdateCronJob,
  UpdateTaskQueueItem,
  UpdateExecutionLog,
  UpdateCapacityRecord,
  UpdateWorkflowTemplate,
  CreateWorkflowVersion,
  UpdateWorkflowVersion,
  RunStats,
  MediaRecord,
  CreateMediaRecord,
  PromptTemplate,
  CreatePromptTemplate,
  UpdatePromptTemplate,
  AuditLog,
  CreateAuditLog,
  AuditLogQuery,
  AuditStats,
  ServiceNodePermission,
  DeadLetterQueueItem,
  CreateDeadLetterQueueItem,
  UpdateDeadLetterQueueItem,
  JobTag,
  JobDependency,
  WebhookConfig,
  WebhookDelivery,
  CreateWebhookConfig,
  UpdateWebhookConfig,
  CreateWebhookDelivery,
  WebhookEvent,
  SystemConfig,
  CreateSystemConfig,
  UpdateSystemConfig,
} from './types.js'
import {
  JobRepository,
  TaskRepository,
  LogRepository,
  MediaRepository,
  WebhookRepository,
  WorkflowRepository,
  CapacityRepository,
  UserRepository,
  DeadLetterRepository,
  PromptTemplateRepository,
  SystemConfigRepository,
} from '../repositories/index.js'

export class DatabaseService {
  private conn: DatabaseConnection

  private _jobRepo: JobRepository | null = null
  private _taskRepo: TaskRepository | null = null
  private _logRepo: LogRepository | null = null
  private _mediaRepo: MediaRepository | null = null
  private _webhookRepo: WebhookRepository | null = null
  private _workflowRepo: WorkflowRepository | null = null
  private _capacityRepo: CapacityRepository | null = null
  private _userRepo: UserRepository | null = null
  private _deadLetterRepo: DeadLetterRepository | null = null
  private _promptTemplateRepo: PromptTemplateRepository | null = null
  private _systemConfigRepo: SystemConfigRepository | null = null

  constructor(conn: DatabaseConnection) {
    this.conn = conn
  }

  private get jobRepo(): JobRepository {
    if (!this._jobRepo) this._jobRepo = new JobRepository(this.conn)
    return this._jobRepo
  }

  private get taskRepo(): TaskRepository {
    if (!this._taskRepo) this._taskRepo = new TaskRepository(this.conn)
    return this._taskRepo
  }

  private get logRepo(): LogRepository {
    if (!this._logRepo) this._logRepo = new LogRepository(this.conn)
    return this._logRepo
  }

  private get mediaRepo(): MediaRepository {
    if (!this._mediaRepo) this._mediaRepo = new MediaRepository(this.conn)
    return this._mediaRepo
  }

  private get webhookRepo(): WebhookRepository {
    if (!this._webhookRepo) this._webhookRepo = new WebhookRepository(this.conn)
    return this._webhookRepo
  }

  private get workflowRepo(): WorkflowRepository {
    if (!this._workflowRepo) this._workflowRepo = new WorkflowRepository(this.conn)
    return this._workflowRepo
  }

  private get capacityRepo(): CapacityRepository {
    if (!this._capacityRepo) this._capacityRepo = new CapacityRepository(this.conn)
    return this._capacityRepo
  }

  private get userRepo(): UserRepository {
    if (!this._userRepo) this._userRepo = new UserRepository(this.conn)
    return this._userRepo
  }

  private get deadLetterRepo(): DeadLetterRepository {
    if (!this._deadLetterRepo) this._deadLetterRepo = new DeadLetterRepository(this.conn)
    return this._deadLetterRepo
  }

  private get promptTemplateRepo(): PromptTemplateRepository {
    if (!this._promptTemplateRepo) this._promptTemplateRepo = new PromptTemplateRepository(this.conn)
    return this._promptTemplateRepo
  }

  private get systemConfigRepo(): SystemConfigRepository {
    if (!this._systemConfigRepo) this._systemConfigRepo = new SystemConfigRepository(this.conn)
    return this._systemConfigRepo
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

  async transaction<T>(fn: (db: DatabaseService) => Promise<T>): Promise<T> {
    return this.conn.transaction(async (txConn) => {
      const txDb = new DatabaseService(txConn)
      return fn(txDb)
    })
  }

  async getAllCronJobs(ownerId?: string): Promise<CronJob[]> {
    return this.jobRepo.getAll(ownerId)
  }

  async getCronJobById(id: string, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.getById(id, ownerId)
  }

  async createCronJob(job: CreateCronJob, ownerId?: string): Promise<CronJob> {
    return this.jobRepo.create(job, ownerId)
  }

  async updateCronJob(id: string, updates: UpdateCronJob, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.update(id, updates, ownerId)
  }

  async deleteCronJob(id: string, ownerId?: string): Promise<boolean> {
    return this.jobRepo.delete(id, ownerId)
  }

  async toggleCronJobActive(id: string, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.toggleActive(id, ownerId)
  }

  async updateCronJobRunStats(id: string, stats: RunStats, ownerId: string): Promise<CronJob | null> {
    return this.jobRepo.updateRunStats(id, stats, ownerId)
  }

  async updateCronJobLastRun(id: string, nextRun: string, ownerId?: string): Promise<CronJob | null> {
    return this.jobRepo.updateLastRun(id, nextRun, ownerId)
  }

  async getActiveCronJobs(ownerId?: string): Promise<CronJob[]> {
    return this.jobRepo.getActive(ownerId)
  }

  async getAllTasks(options?: { status?: TaskStatus; ownerId?: string; jobId?: string; limit?: number; offset?: number }): Promise<{ tasks: TaskQueueItem[]; total: number }> {
    return this.taskRepo.listTasks(options)
  }

  async getTaskById(id: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.getById(id, ownerId)
  }

  async getTaskPayload(id: string): Promise<{ payload: string; result: string | null } | null> {
    return this.taskRepo.getPayload(id)
  }

  async createTask(task: CreateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem> {
    return this.taskRepo.create(task, ownerId)
  }

  async updateTask(id: string, updates: UpdateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.update(id, updates, ownerId)
  }

  async deleteTask(id: string, ownerId?: string): Promise<boolean> {
    return this.taskRepo.delete(id, ownerId)
  }

  async getPendingTasksByJob(jobId: string | null, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.taskRepo.getPendingByJob(jobId, limit, ownerId)
  }

  async getPendingTaskCount(): Promise<number> {
    return this.taskRepo.getPendingCount()
  }

  async getPendingTasksByType(taskType: string, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.taskRepo.getPendingByType(taskType, limit, ownerId)
  }

  async getRunningTaskCount(): Promise<number> {
    return this.taskRepo.getRunningCount()
  }

  async getFailedTaskCount(): Promise<number> {
    return this.taskRepo.getFailedCount()
  }

  async getTaskCountsByStatus(ownerId?: string): Promise<{
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    total: number
  }> {
    return this.taskRepo.getCountsByStatus(ownerId)
  }

  async markTaskRunning(id: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.markRunning(id)
  }

  async markTaskCompleted(id: string, result?: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.markCompleted(id, result, ownerId)
  }

  async markTaskFailed(id: string, error: string, ownerId?: string): Promise<TaskQueueItem | null> {
    return this.taskRepo.markFailed(id, error, ownerId)
  }

  async getTasksByJobId(jobId: string, ownerId?: string): Promise<TaskQueueItem[]> {
    return this.taskRepo.getByJobId(jobId, ownerId)
  }

  async getAllExecutionLogs(jobId?: string, limit: number = 100, ownerId?: string): Promise<ExecutionLog[]> {
    return this.logRepo.getAll(jobId, limit, ownerId)
  }

  async getExecutionLogsPaginated(options: {
    limit: number
    offset: number
    startDate?: string
    endDate?: string
    ownerId?: string
  }): Promise<{ logs: ExecutionLog[]; total: number }> {
    return this.logRepo.getPaginated(options)
  }

  async getExecutionLogById(id: string, ownerId?: string): Promise<ExecutionLog | null> {
    return this.logRepo.getById(id, ownerId)
  }

  async createExecutionLog(log: CreateExecutionLog, ownerId?: string): Promise<ExecutionLog> {
    return this.logRepo.create(log, ownerId)
  }

  async updateExecutionLog(id: string, updates: UpdateExecutionLog, ownerId?: string): Promise<ExecutionLog | null> {
    return this.logRepo.update(id, updates, ownerId)
  }

  async completeExecutionLog(id: string, stats: RunStats, ownerId?: string): Promise<ExecutionLog | null> {
    return this.logRepo.complete(id, stats, ownerId)
  }

  async getRecentExecutionLogs(limit: number = 20, ownerId?: string): Promise<ExecutionLog[]> {
    return this.logRepo.getRecent(limit, ownerId)
  }

  async createExecutionLogDetail(data: CreateExecutionLogDetail): Promise<string> {
    return this.logRepo.createDetail(data)
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
    return this.logRepo.updateDetail(id, data)
  }

  async getExecutionLogDetailsByLogId(logId: string): Promise<ExecutionLogDetail[]> {
    return this.logRepo.getDetailsByLogId(logId)
  }

  async getAllCapacityRecords(): Promise<CapacityRecord[]> {
    return this.capacityRepo.getAll()
  }

  async getCapacityByService(serviceType: string): Promise<CapacityRecord | null> {
    return this.capacityRepo.getByService(serviceType)
  }

  async upsertCapacityRecord(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): Promise<CapacityRecord> {
    return this.capacityRepo.upsert(serviceType, data)
  }

  async getAllWorkflowTemplates(ownerId?: string): Promise<WorkflowTemplate[]> {
    return this.workflowRepo.getAllTemplates(ownerId)
  }

  async getWorkflowTemplatesPaginated(options: {
    ownerId?: string
    isTemplate?: boolean
    limit?: number
    offset?: number
  }): Promise<{ templates: WorkflowTemplate[]; total: number }> {
    return this.workflowRepo.getTemplatesPaginated(options)
  }

  async getWorkflowTemplateById(id: string, ownerId?: string): Promise<WorkflowTemplate | null> {
    return this.workflowRepo.getTemplateById(id, ownerId)
  }

  async createWorkflowTemplate(template: { name: string; description?: string | null; nodes_json: string; edges_json: string; is_public?: boolean }, ownerId?: string): Promise<WorkflowTemplate> {
    return this.workflowRepo.createTemplate(template, ownerId)
  }

  async updateWorkflowTemplate(id: string, updates: UpdateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate | null> {
    return this.workflowRepo.updateTemplate(id, updates, ownerId)
  }

  async deleteWorkflowTemplate(id: string, ownerId?: string): Promise<boolean> {
    return this.workflowRepo.deleteTemplate(id, ownerId)
  }

  async getMarkedWorkflowTemplates(ownerId?: string): Promise<WorkflowTemplate[]> {
    return this.workflowRepo.getPublicTemplates(ownerId)
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, updates?: { started_at?: string | null; completed_at?: string | null; error_message?: string | null; result?: string | null }, ownerId?: string): Promise<void> {
    return this.taskRepo.updateStatus(taskId, status, updates, ownerId)
  }

  async updateTasksStatusBatch(
    taskIds: string[],
    status: TaskStatus,
    ownerId?: string
  ): Promise<number> {
    return this.taskRepo.updateStatusBatch(taskIds, status, ownerId)
  }

  async getCapacityRecord(serviceType: string): Promise<CapacityRecord | null> {
    return this.capacityRepo.getByService(serviceType)
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
    return this.taskRepo.getQueueStats(jobId)
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
    const record = await this.capacityRepo.getByService(serviceType)
    if (!record) return null
    return { remaining: record.remaining_quota, total: record.total_quota }
  }

  async updateCapacity(serviceType: string, remaining: number): Promise<void> {
    await this.capacityRepo.updateCapacity(serviceType, remaining)
  }

  async decrementCapacity(serviceType: string, amount: number = 1): Promise<CapacityRecord | null> {
    return this.capacityRepo.decrementCapacity(serviceType, amount)
  }

  async getMediaRecords(options: {
    type?: string
    source?: string
    search?: string
    limit: number
    offset: number
    includeDeleted?: boolean
    ownerId?: string
    ownerIdNot?: string
    visibilityOwnerId?: string
    favorite?: boolean
    favoriteUserId?: string
    role?: 'user' | 'pro' | 'admin' | 'super'
    isPublic?: boolean
  }): Promise<{ records: MediaRecord[]; total: number }> {
    const result = await this.mediaRepo.list(options)
    return { records: result.items, total: result.total }
  }

  async getMediaRecordById(id: string, ownerId?: string, includePublic?: boolean): Promise<MediaRecord | null> {
    return this.mediaRepo.getById(id, ownerId, includePublic)
  }

  async createMediaRecord(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord> {
    return this.mediaRepo.create(data, ownerId)
  }

  async updateMediaRecord(id: string, data: { original_name?: string | null; metadata?: Record<string, unknown> | null }, ownerId?: string): Promise<MediaRecord | null> {
    return this.mediaRepo.update(id, data, ownerId)
  }

  async softDeleteMediaRecord(id: string, ownerId?: string): Promise<boolean> {
    return this.mediaRepo.softDelete(id, ownerId)
  }

  async hardDeleteMediaRecord(id: string, ownerId?: string): Promise<boolean> {
    return this.mediaRepo.hardDelete(id, ownerId)
  }

  async toggleFavorite(userId: string, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> {
    return this.mediaRepo.toggleFavorite(userId, mediaId)
  }

  async togglePublicMediaRecord(id: string, isPublic: boolean): Promise<MediaRecord | null> {
    return this.mediaRepo.togglePublic(id, isPublic)
  }

  async getExecutionStatsOverview(ownerId?: string): Promise<{
    totalExecutions: number
    successRate: number
    avgDuration: number
    errorCount: number
  }> {
    return this.logRepo.getStatsOverview(ownerId)
  }

  async getExecutionStatsTrend(period: 'day' | 'week' | 'month', ownerId?: string): Promise<{ date: string; total: number; success: number; failed: number }[]> {
    return this.logRepo.getStatsTrend(period, ownerId)
  }

  async getExecutionStatsDistribution(ownerId?: string): Promise<{ type: string; count: number }[]> {
    return this.logRepo.getStatsDistribution(ownerId)
  }

  async getExecutionStatsErrors(limit: number = 10, ownerId?: string): Promise<{ errorSummary: string; count: number }[]> {
    return this.logRepo.getStatsErrors(limit, ownerId)
  }

  async getPromptTemplates(options: {
    category?: string
    limit: number
    offset: number
    ownerId?: string
  }): Promise<{ templates: PromptTemplate[]; total: number }> {
    const result = await this.promptTemplateRepo.list(options)
    return { templates: result.items, total: result.total }
  }

  async getPromptTemplateById(id: string, ownerId?: string): Promise<PromptTemplate | null> {
    return this.promptTemplateRepo.getById(id, ownerId)
  }

  async createPromptTemplate(data: CreatePromptTemplate, ownerId?: string): Promise<PromptTemplate> {
    return this.promptTemplateRepo.create(data, ownerId)
  }

  async updatePromptTemplate(id: string, data: UpdatePromptTemplate, ownerId?: string): Promise<PromptTemplate | null> {
    return this.promptTemplateRepo.update(id, data, ownerId)
  }

  async deletePromptTemplate(id: string, ownerId?: string): Promise<boolean> {
    return this.promptTemplateRepo.delete(id, ownerId)
  }

  async softDeleteMediaRecords(ids: string[]): Promise<{ deleted: number; failed: number }> {
    return this.mediaRepo.softDeleteBatch(ids)
  }

  async getMediaRecordsByIds(ids: string[]): Promise<MediaRecord[]> {
    return this.mediaRepo.getByIds(ids)
  }

  async createAuditLog(data: CreateAuditLog): Promise<AuditLog> {
    return this.userRepo.createAuditLog(data)
  }

  async getAuditLogById(id: string): Promise<AuditLog | null> {
    return this.userRepo.getAuditLogById(id)
  }

  async getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }> {
    return this.userRepo.getAuditLogs(query)
  }

  async getAuditStats(userId?: string): Promise<AuditStats> {
    return this.userRepo.getAuditStats(userId)
  }

  async getUniqueRequestPaths(userId?: string): Promise<string[]> {
    return this.userRepo.getUniqueRequestPaths(userId)
  }

  async getUniqueAuditUsers(userId?: string): Promise<{ id: string; username: string }[]> {
    return this.userRepo.getUniqueAuditUsers(userId)
  }

  // =====================================================================
  // Service Node Permissions
  // =====================================================================

  async getAllServiceNodePermissions(): Promise<ServiceNodePermission[]> {
    return this.userRepo.getAllServiceNodePermissions()
  }

  async getServiceNodePermission(
    serviceName: string,
    methodName: string
  ): Promise<ServiceNodePermission | null> {
    return this.userRepo.getServiceNodePermission(serviceName, methodName)
  }

  async updateServiceNodePermission(
    id: string,
    data: { min_role?: string; is_enabled?: boolean }
  ): Promise<void> {
    return this.userRepo.updateServiceNodePermission(id, data)
  }

  async upsertServiceNodePermission(data: {
    service_name: string
    method_name: string
    display_name: string
    category: string
    min_role?: string
    is_enabled?: boolean
  }): Promise<void> {
    return this.userRepo.upsertServiceNodePermission(data)
  }

  async deleteServiceNodePermission(id: string): Promise<void> {
    return this.userRepo.deleteServiceNodePermission(id)
  }

  async batchUpsertServiceNodePermissions(
    nodes: Array<{
      service_name: string
      method_name: string
      display_name: string
      category: string
      min_role?: string
      is_enabled?: boolean
    }>
  ): Promise<void> {
    return this.userRepo.batchUpsertServiceNodePermissions(nodes)
  }

  // =====================================================================
  // Workflow Permissions
  // =====================================================================

  async createWorkflowPermission(data: {
    workflow_id: string
    user_id: string
    granted_by?: string | null
  }): Promise<void> {
    return this.workflowRepo.createPermission(data)
  }

  async deleteWorkflowPermission(workflowId: string, userId: string): Promise<void> {
    return this.workflowRepo.deletePermission(workflowId, userId)
  }

  async hasWorkflowPermission(workflowId: string, userId: string): Promise<boolean> {
    return this.workflowRepo.hasPermission(workflowId, userId)
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
    return this.workflowRepo.getPermissions(workflowId)
  }

  async getAvailableWorkflows(userId: string): Promise<WorkflowTemplate[]> {
    return this.workflowRepo.getAvailableWorkflows(userId)
  }

  // =====================================================================
  // Workflow Versions
  // =====================================================================

  async createWorkflowVersion(data: CreateWorkflowVersion): Promise<WorkflowVersion> {
    return this.workflowRepo.createVersion(data)
  }

  async getWorkflowVersionById(id: string): Promise<WorkflowVersion | undefined> {
    return this.workflowRepo.getVersionById(id)
  }

  async getWorkflowVersionsByTemplate(templateId: string): Promise<WorkflowVersion[]> {
    return this.workflowRepo.getVersionsByTemplate(templateId)
  }

  async getActiveWorkflowVersion(templateId: string): Promise<WorkflowVersion | undefined> {
    return this.workflowRepo.getActiveVersion(templateId)
  }

  async getLatestVersionNumber(templateId: string): Promise<number> {
    return this.workflowRepo.getLatestVersionNumber(templateId)
  }

  async activateWorkflowVersion(versionId: string, templateId: string): Promise<void> {
    return this.workflowRepo.activateVersion(versionId, templateId)
  }

  async deleteWorkflowVersion(id: string): Promise<void> {
    return this.workflowRepo.deleteVersion(id)
  }

  async saveTemplateVersion(
    templateId: string,
    nodesJson: string,
    edgesJson: string,
    changeSummary: string | null,
    userId: string | null
  ): Promise<WorkflowVersion> {
    return this.workflowRepo.saveTemplateVersion(templateId, nodesJson, edgesJson, changeSummary, userId)
  }

  // =====================================================================
  // Dead Letter Queue
  // =====================================================================

  async createDeadLetterQueueItem(data: CreateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem> {
    return this.deadLetterRepo.create(data, ownerId)
  }

  async getDeadLetterQueueItems(ownerId?: string, limit: number = 50): Promise<DeadLetterQueueItem[]> {
    return this.deadLetterRepo.listItems(ownerId, limit)
  }

  async getDeadLetterQueueItemById(id: string, ownerId?: string): Promise<DeadLetterQueueItem | null> {
    return this.deadLetterRepo.getById(id, ownerId)
  }

  async updateDeadLetterQueueItem(id: string, data: UpdateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem | null> {
    return this.deadLetterRepo.update(id, data, ownerId)
  }

  async retryDeadLetterQueueItem(id: string, ownerId?: string): Promise<string> {
    const item = await this.getDeadLetterQueueItemById(id, ownerId)
    if (!item) {
      throw new Error(`Dead letter queue item not found: ${id}`)
    }

    const payload = typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload)

    const newTask = await this.createTask({
      job_id: item.job_id ?? undefined,
      task_type: item.task_type,
      payload: payload,
      max_retries: item.max_retries,
    }, item.owner_id ?? undefined)

    await this.updateDeadLetterQueueItem(id, {
      resolved_at: new Date().toISOString(),
      resolution: 'retried',
    }, ownerId)

    return newTask.id
  }

  // =====================================================================
  // Job Tags
  // =====================================================================

  async addJobTag(jobId: string, tag: string): Promise<void> {
    return this.jobRepo.addTag(jobId, tag)
  }

  async removeJobTag(jobId: string, tag: string): Promise<void> {
    return this.jobRepo.removeTag(jobId, tag)
  }

  async getJobTags(jobId: string): Promise<string[]> {
    return this.jobRepo.getTags(jobId)
  }

  async getJobsByTag(tag: string, ownerId?: string): Promise<CronJob[]> {
    return this.jobRepo.getByTag(tag, ownerId)
  }

  async getAllTags(): Promise<{ tag: string; count: number }[]> {
    return this.jobRepo.getAllTags()
  }

  // =====================================================================
  // Job Dependencies
  // =====================================================================

  async addJobDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    return this.jobRepo.addDependency(jobId, dependsOnJobId)
  }

  async removeJobDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    return this.jobRepo.removeDependency(jobId, dependsOnJobId)
  }

  async getJobDependencies(jobId: string): Promise<string[]> {
    return this.jobRepo.getDependencies(jobId)
  }

  async getJobDependents(jobId: string): Promise<string[]> {
    return this.jobRepo.getDependents(jobId)
  }

  async hasCircularDependency(jobId: string, dependsOnJobId: string): Promise<boolean> {
    return this.jobRepo.hasCircularDependency(jobId, dependsOnJobId)
  }

  // =====================================================================
  // Webhook Configs
  // =====================================================================

  async createWebhookConfig(data: CreateWebhookConfig, ownerId?: string): Promise<WebhookConfig> {
    return this.webhookRepo.createConfig(data, ownerId)
  }

  async getWebhookConfigById(id: string, ownerId?: string): Promise<WebhookConfig | null> {
    return this.webhookRepo.getConfigById(id, ownerId)
  }

  async getWebhookConfigsByJobId(jobId: string): Promise<WebhookConfig[]> {
    return this.webhookRepo.getConfigsByJobId(jobId)
  }

  async getWebhookConfigsByOwner(ownerId: string): Promise<WebhookConfig[]> {
    return this.webhookRepo.getConfigsByOwner(ownerId)
  }

  async getAllWebhookConfigs(ownerId?: string): Promise<WebhookConfig[]> {
    return this.webhookRepo.getAllConfigs(ownerId)
  }

  async updateWebhookConfig(id: string, updates: UpdateWebhookConfig, ownerId?: string): Promise<WebhookConfig | null> {
    return this.webhookRepo.updateConfig(id, updates, ownerId)
  }

  async deleteWebhookConfig(id: string, ownerId?: string): Promise<boolean> {
    return this.webhookRepo.deleteConfig(id, ownerId)
  }

  // =====================================================================
  // Webhook Deliveries
  // =====================================================================

  async createWebhookDelivery(data: CreateWebhookDelivery, ownerId?: string): Promise<WebhookDelivery> {
    return this.webhookRepo.createDelivery(data, ownerId)
  }

  async getWebhookDeliveryById(id: string): Promise<WebhookDelivery | null> {
    return this.webhookRepo.getDeliveryById(id)
  }

  async getWebhookDeliveriesByWebhook(webhookId: string, limit: number = 50, ownerId?: string): Promise<WebhookDelivery[]> {
    return this.webhookRepo.getDeliveriesByWebhook(webhookId, limit, ownerId)
  }

  async getWebhookDeliveryByExecutionLog(executionLogId: string, ownerId?: string): Promise<WebhookDelivery[]> {
    return this.webhookRepo.getDeliveriesByExecutionLog(executionLogId, ownerId)
  }

  // =====================================================================
  // System Config
  // =====================================================================

  async getAllSystemConfigs(): Promise<SystemConfig[]> {
    return this.systemConfigRepo.list({})
      .then(r => r.items)
  }

  async getSystemConfigByKey(key: string): Promise<SystemConfig | null> {
    return this.systemConfigRepo.getByKey(key)
  }

  async createSystemConfig(data: CreateSystemConfig, updatedBy?: string): Promise<SystemConfig> {
    return this.systemConfigRepo.create(data, updatedBy)
  }

  async updateSystemConfig(key: string, updates: UpdateSystemConfig, updatedBy?: string): Promise<SystemConfig | null> {
    return this.systemConfigRepo.update(key, updates, updatedBy)
  }

  async deleteSystemConfig(key: string): Promise<boolean> {
    return this.systemConfigRepo.delete(key)
  }

  // =====================================================================
  // Generic SQL Helpers (for raw queries)
  // =====================================================================

  async run(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid?: string | number }> {
    return this.conn.execute(sql, params)
  }

  async get<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T | undefined> {
    const rows = await this.conn.query<T>(sql, params)
    return rows[0]
  }

  async all<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.conn.query<T>(sql, params)
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

export function resetDatabase(): void {
  dbInstance = null
}