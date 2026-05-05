import { DatabaseConnection, createConnection, closeConnection, QueryResultRow } from './connection.js'
import { TaskStatus } from './types.js'
import type {
  AuditLog,
  AuditLogQuery,
  AuditStats,
  CapacityRecord,
  CreateAuditLog,
  CreateCronJob,
  CreateDeadLetterQueueItem,
  CreateExecutionLog,
  CreateExecutionLogDetail,
  CreateMaterial,
  CreateMaterialItem,
  CreateMediaRecord,
  CreatePromptRecord,
  CreatePromptTemplate,
  CreateSystemConfig,
  CreateTaskQueueItem,
  CreateWebhookConfig,
  CreateWebhookDelivery,
  CreateWorkflowVersion,
  CronJob,
  DeadLetterQueueItem,
  ExecutionLog,
  ExecutionLogDetail,
  ExternalApiLog,
  ExternalApiLogQuery,
  ExternalApiLogStats,
  Material,
  MaterialDetailResult,
  MaterialItem,
  MaterialQueryOptions,
  MediaRecord,
  PromptRecord,
  PromptTemplate,
  RunStats,
  ServiceNodePermission,
  SystemConfig,
  TaskQueueItem,
  UpdateCapacityRecord,
  UpdateCronJob,
  UpdateDeadLetterQueueItem,
  UpdateExecutionLog,
  UpdateMaterial,
  UpdateMaterialItem,
  UpdatePromptRecord,
  UpdatePromptTemplate,
  UpdateSystemConfig,
  UpdateTaskQueueItem,
  UpdateWebhookConfig,
  UpdateWorkflowTemplate,
  WebhookConfig,
  WebhookDelivery,
  WorkflowTemplate,
  WorkflowVersion,
} from './types.js'
import {
  CapacityRepository,
  DeadLetterRepository,
  ExternalApiLogRepository,
  JobRepository,
  LogRepository,
  MaterialItemRepository,
  MaterialRepository,
  MediaRepository,
  PromptRepository,
  PromptTemplateRepository,
  SystemConfigRepository,
  TaskRepository,
  UserRepository,
  WebhookRepository,
  WorkflowRepository,
} from '../repositories/index.js'
import {
  DlqService,
  JobService,
  LogService,
  MaterialService,
  MediaService,
  SystemService,
  TaskService,
  WorkflowService,
} from './services/index.js'

export class DatabaseService {
  private readonly conn: DatabaseConnection

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
  private _externalApiLogRepo: ExternalApiLogRepository | null = null
  private _materialRepo: MaterialRepository | null = null
  private _materialItemRepo: MaterialItemRepository | null = null
  private _promptRepo: PromptRepository | null = null

  private _jobService: JobService | null = null
  private _taskService: TaskService | null = null
  private _logService: LogService | null = null
  private _workflowService: WorkflowService | null = null
  private _mediaService: MediaService | null = null
  private _dlqService: DlqService | null = null
  private _materialService: MaterialService | null = null
  private _systemService: SystemService | null = null

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

  private get externalApiLogRepo(): ExternalApiLogRepository {
    if (!this._externalApiLogRepo) this._externalApiLogRepo = new ExternalApiLogRepository(this.conn)
    return this._externalApiLogRepo
  }

  private get materialRepo(): MaterialRepository {
    if (!this._materialRepo) this._materialRepo = new MaterialRepository(this.conn)
    return this._materialRepo
  }

  private get materialItemRepo(): MaterialItemRepository {
    if (!this._materialItemRepo) this._materialItemRepo = new MaterialItemRepository(this.conn)
    return this._materialItemRepo
  }

  private get promptRepo(): PromptRepository {
    if (!this._promptRepo) this._promptRepo = new PromptRepository(this.conn)
    return this._promptRepo
  }

  get jobService(): JobService {
    if (!this._jobService) this._jobService = new JobService(this.jobRepo)
    return this._jobService
  }

  get taskService(): TaskService {
    if (!this._taskService) this._taskService = new TaskService(this.taskRepo)
    return this._taskService
  }

  get logService(): LogService {
    if (!this._logService) {
      this._logService = new LogService(this.logRepo, this.userRepo, this.externalApiLogRepo)
    }
    return this._logService
  }

  get workflowService(): WorkflowService {
    if (!this._workflowService) this._workflowService = new WorkflowService(this.workflowRepo)
    return this._workflowService
  }

  get mediaService(): MediaService {
    if (!this._mediaService) this._mediaService = new MediaService(this.mediaRepo)
    return this._mediaService
  }

  get dlqService(): DlqService {
    if (!this._dlqService) {
      this._dlqService = new DlqService(this.deadLetterRepo, this.taskService.createTask.bind(this.taskService))
    }
    return this._dlqService
  }

  get materialService(): MaterialService {
    if (!this._materialService) {
      this._materialService = new MaterialService(this.materialRepo, this.materialItemRepo, this.promptRepo)
    }
    return this._materialService
  }

  get systemService(): SystemService {
    if (!this._systemService) {
      this._systemService = new SystemService(
        this.systemConfigRepo,
        this.capacityRepo,
        this.webhookRepo,
        this.promptTemplateRepo,
        this.userRepo,
      )
    }
    return this._systemService
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

  async getAllCronJobs(ownerId?: string): Promise<CronJob[]> { return this.jobService.getAllCronJobs(ownerId) }
  async getCronJobById(id: string, ownerId?: string): Promise<CronJob | null> { return this.jobService.getCronJobById(id, ownerId) }
  async createCronJob(job: CreateCronJob, ownerId?: string): Promise<CronJob> { return this.jobService.createCronJob(job, ownerId) }
  async updateCronJob(id: string, updates: UpdateCronJob, ownerId?: string): Promise<CronJob | null> { return this.jobService.updateCronJob(id, updates, ownerId) }
  async deleteCronJob(id: string, ownerId?: string): Promise<boolean> { return this.jobService.deleteCronJob(id, ownerId) }
  async toggleCronJobActive(id: string, ownerId?: string): Promise<CronJob | null> { return this.jobService.toggleCronJobActive(id, ownerId) }
  async updateCronJobRunStats(id: string, stats: RunStats, ownerId?: string): Promise<CronJob | null> { return this.jobService.updateCronJobRunStats(id, stats, ownerId) }
  async updateCronJobLastRun(id: string, nextRun: string, ownerId?: string): Promise<CronJob | null> { return this.jobService.updateCronJobLastRun(id, nextRun, ownerId) }
  async getActiveCronJobs(ownerId?: string): Promise<CronJob[]> { return this.jobService.getActiveCronJobs(ownerId) }
  async addJobTag(jobId: string, tag: string): Promise<void> { return this.jobService.addJobTag(jobId, tag) }
  async removeJobTag(jobId: string, tag: string): Promise<void> { return this.jobService.removeJobTag(jobId, tag) }
  async getJobTags(jobId: string): Promise<string[]> { return this.jobService.getJobTags(jobId) }
  async getJobsByTag(tag: string, ownerId?: string): Promise<CronJob[]> { return this.jobService.getJobsByTag(tag, ownerId) }
  async getAllTags(): Promise<{ tag: string; count: number }[]> { return this.jobService.getAllTags() }
  async addJobDependency(jobId: string, dependsOnJobId: string): Promise<void> { return this.jobService.addJobDependency(jobId, dependsOnJobId) }
  async removeJobDependency(jobId: string, dependsOnJobId: string): Promise<void> { return this.jobService.removeJobDependency(jobId, dependsOnJobId) }
  async getJobDependencies(jobId: string): Promise<string[]> { return this.jobService.getJobDependencies(jobId) }
  async getJobDependents(jobId: string): Promise<string[]> { return this.jobService.getJobDependents(jobId) }
  async hasCircularDependency(jobId: string, dependsOnJobId: string): Promise<boolean> { return this.jobService.hasCircularDependency(jobId, dependsOnJobId) }

  async getAllTasks(options?: { status?: TaskStatus; ownerId?: string; jobId?: string; limit?: number; offset?: number }): Promise<{ tasks: TaskQueueItem[]; total: number }> { return this.taskService.getAllTasks(options) }
  async getTaskById(id: string, ownerId?: string): Promise<TaskQueueItem | null> { return this.taskService.getTaskById(id, ownerId) }
  async getTaskPayload(id: string): Promise<{ payload: string; result: string | null } | null> { return this.taskService.getTaskPayload(id) }
  async createTask(task: CreateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem> { return this.taskService.createTask(task, ownerId) }
  async updateTask(id: string, updates: UpdateTaskQueueItem, ownerId?: string): Promise<TaskQueueItem | null> { return this.taskService.updateTask(id, updates, ownerId) }
  async deleteTask(id: string, ownerId?: string): Promise<boolean> { return this.taskService.deleteTask(id, ownerId) }
  async getPendingTasksByJob(jobId: string | null, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> { return this.taskService.getPendingTasksByJob(jobId, limit, ownerId) }
  async getPendingTaskCount(): Promise<number> { return this.taskService.getPendingTaskCount() }
  async getPendingTasksByType(taskType: string, limit: number = 10, ownerId?: string): Promise<TaskQueueItem[]> { return this.taskService.getPendingTasksByType(taskType, limit, ownerId) }
  async getRunningTaskCount(): Promise<number> { return this.taskService.getRunningTaskCount() }
  async getFailedTaskCount(): Promise<number> { return this.taskService.getFailedTaskCount() }
  async getTaskCountsByStatus(ownerId?: string): Promise<{ pending: number; running: number; completed: number; failed: number; cancelled: number; total: number }> { return this.taskService.getTaskCountsByStatus(ownerId) }
  async markTaskRunning(id: string): Promise<TaskQueueItem | null> { return this.taskService.markTaskRunning(id) }
  async markTaskCompleted(id: string, result?: string, ownerId?: string): Promise<TaskQueueItem | null> { return this.taskService.markTaskCompleted(id, result, ownerId) }
  async markTaskFailed(id: string, error: string, ownerId?: string): Promise<TaskQueueItem | null> { return this.taskService.markTaskFailed(id, error, ownerId) }
  async getTasksByJobId(jobId: string, ownerId?: string): Promise<TaskQueueItem[]> { return this.taskService.getTasksByJobId(jobId, ownerId) }
  async updateTaskStatus(taskId: string, status: TaskStatus, updates?: { started_at?: string | null; completed_at?: string | null; error_message?: string | null; result?: string | null }, ownerId?: string): Promise<void> { return this.taskService.updateTaskStatus(taskId, status, updates, ownerId) }
  async updateTasksStatusBatch(taskIds: string[], status: TaskStatus, ownerId?: string): Promise<number> { return this.taskService.updateTasksStatusBatch(taskIds, status, ownerId) }
  async getPendingTasks(jobId: string, limit: number): Promise<TaskQueueItem[]> { return this.taskService.getPendingTasks(jobId, limit) }
  async getQueueStats(jobId?: string): Promise<{ pending: number; running: number; completed: number; failed: number; cancelled: number; total: number }> { return this.taskService.getQueueStats(jobId) }
  async createTaskQueueItem(data: { job_id?: string | null; task_type: string; payload: string; priority?: number; status?: string; max_retries?: number }): Promise<string> { return this.taskService.createTaskQueueItem(data) }

  async getAllExecutionLogs(jobId?: string, limit: number = 100, ownerId?: string): Promise<ExecutionLog[]> { return this.logService.getAllExecutionLogs(jobId, limit, ownerId) }
  async getExecutionLogsPaginated(options: { limit: number; offset: number; startDate?: string; endDate?: string; ownerId?: string }): Promise<{ logs: ExecutionLog[]; total: number }> { return this.logService.getExecutionLogsPaginated(options) }
  async getExecutionLogById(id: string, ownerId?: string): Promise<ExecutionLog | null> { return this.logService.getExecutionLogById(id, ownerId) }
  async createExecutionLog(log: CreateExecutionLog, ownerId?: string): Promise<ExecutionLog> { return this.logService.createExecutionLog(log, ownerId) }
  async updateExecutionLog(id: string, updates: UpdateExecutionLog, ownerId?: string): Promise<ExecutionLog | null> { return this.logService.updateExecutionLog(id, updates, ownerId) }
  async completeExecutionLog(id: string, stats: RunStats, ownerId?: string): Promise<ExecutionLog | null> { return this.logService.completeExecutionLog(id, stats, ownerId) }
  async getRecentExecutionLogs(limit: number = 20, ownerId?: string): Promise<ExecutionLog[]> { return this.logService.getRecentExecutionLogs(limit, ownerId) }
  async createExecutionLogDetail(data: CreateExecutionLogDetail): Promise<string> { return this.logService.createExecutionLogDetail(data) }
  async updateExecutionLogDetail(id: string, data: { output_result?: string; error_message?: string; completed_at?: string; duration_ms?: number }): Promise<void> { return this.logService.updateExecutionLogDetail(id, data) }
  async getExecutionLogDetailsByLogId(logId: string): Promise<ExecutionLogDetail[]> { return this.logService.getExecutionLogDetailsByLogId(logId) }
  async getExecutionStatsOverview(ownerId?: string): Promise<{ totalExecutions: number; successRate: number; avgDuration: number; errorCount: number }> { return this.logService.getExecutionStatsOverview(ownerId) }
  async getExecutionStatsTrend(period: 'day' | 'week' | 'month', ownerId?: string): Promise<{ date: string; total: number; success: number; failed: number }[]> { return this.logService.getExecutionStatsTrend(period, ownerId) }
  async getExecutionStatsDistribution(ownerId?: string): Promise<{ type: string; count: number }[]> { return this.logService.getExecutionStatsDistribution(ownerId) }
  async getExecutionStatsErrors(limit: number = 10, ownerId?: string): Promise<{ errorSummary: string; count: number }[]> { return this.logService.getExecutionStatsErrors(limit, ownerId) }
  async createAuditLog(data: CreateAuditLog): Promise<AuditLog> { return this.logService.createAuditLog(data) }
  async getAuditLogById(id: string): Promise<AuditLog | null> { return this.logService.getAuditLogById(id) }
  async getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }> { return this.logService.getAuditLogs(query) }
  async getAuditStats(userId?: string): Promise<AuditStats> { return this.logService.getAuditStats(userId) }
  async getUniqueRequestPaths(userId?: string): Promise<string[]> { return this.logService.getUniqueRequestPaths(userId) }
  async getUniqueAuditUsers(userId?: string): Promise<{ id: string; username: string }[]> { return this.logService.getUniqueAuditUsers(userId) }
  async getExternalApiLogById(id: number): Promise<ExternalApiLog | null> { return this.logService.getExternalApiLogById(id) }
  async getExternalApiLogs(query: ExternalApiLogQuery): Promise<{ logs: ExternalApiLog[]; total: number }> { return this.logService.getExternalApiLogs(query) }
  async getExternalApiLogStats(userId?: string): Promise<ExternalApiLogStats> { return this.logService.getExternalApiLogStats(userId) }
  async getUniqueExternalApiOperations(userId?: string): Promise<string[]> { return this.logService.getUniqueExternalApiOperations(userId) }
  async getUniqueExternalApiProviders(): Promise<string[]> { return this.logService.getUniqueExternalApiProviders() }

  async getAllWorkflowTemplates(ownerId?: string): Promise<WorkflowTemplate[]> { return this.workflowService.getAllWorkflowTemplates(ownerId) }
  async getWorkflowTemplatesPaginated(options: { ownerId?: string; isTemplate?: boolean; limit?: number; offset?: number }): Promise<{ templates: WorkflowTemplate[]; total: number }> { return this.workflowService.getWorkflowTemplatesPaginated(options) }
  async getWorkflowTemplateById(id: string, ownerId?: string): Promise<WorkflowTemplate | null> { return this.workflowService.getWorkflowTemplateById(id, ownerId) }
  async createWorkflowTemplate(template: { name: string; description?: string | null; nodes_json: string; edges_json: string; is_public?: boolean }, ownerId?: string): Promise<WorkflowTemplate> { return this.workflowService.createWorkflowTemplate(template, ownerId) }
  async updateWorkflowTemplate(id: string, updates: UpdateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate | null> { return this.workflowService.updateWorkflowTemplate(id, updates, ownerId) }
  async deleteWorkflowTemplate(id: string, ownerId?: string): Promise<boolean> { return this.workflowService.deleteWorkflowTemplate(id, ownerId) }
  async getMarkedWorkflowTemplates(ownerId?: string): Promise<WorkflowTemplate[]> { return this.workflowService.getMarkedWorkflowTemplates(ownerId) }
  async createWorkflowPermission(data: { workflow_id: string; user_id: string; granted_by?: string | null }): Promise<void> { return this.workflowService.createWorkflowPermission(data) }
  async deleteWorkflowPermission(workflowId: string, userId: string): Promise<void> { return this.workflowService.deleteWorkflowPermission(workflowId, userId) }
  async hasWorkflowPermission(workflowId: string, userId: string): Promise<boolean> { return this.workflowService.hasWorkflowPermission(workflowId, userId) }
  async getWorkflowPermissions(workflowId: string): Promise<Array<{ id: string; workflow_id: string; user_id: string; granted_by: string | null; created_at: string; username: string; email: string | null }>> { return this.workflowService.getWorkflowPermissions(workflowId) }
  async getAvailableWorkflows(userId: string): Promise<WorkflowTemplate[]> { return this.workflowService.getAvailableWorkflows(userId) }
  async createWorkflowVersion(data: CreateWorkflowVersion): Promise<WorkflowVersion> { return this.workflowService.createWorkflowVersion(data) }
  async getWorkflowVersionById(id: string): Promise<WorkflowVersion | undefined> { return this.workflowService.getWorkflowVersionById(id) }
  async getWorkflowVersionsByTemplate(templateId: string): Promise<WorkflowVersion[]> { return this.workflowService.getWorkflowVersionsByTemplate(templateId) }
  async getActiveWorkflowVersion(templateId: string): Promise<WorkflowVersion | undefined> { return this.workflowService.getActiveWorkflowVersion(templateId) }
  async getLatestVersionNumber(templateId: string): Promise<number> { return this.workflowService.getLatestVersionNumber(templateId) }
  async activateWorkflowVersion(versionId: string, templateId: string): Promise<void> { return this.workflowService.activateWorkflowVersion(versionId, templateId) }
  async deleteWorkflowVersion(id: string): Promise<void> { return this.workflowService.deleteWorkflowVersion(id) }
  async saveTemplateVersion(templateId: string, nodesJson: string, edgesJson: string, changeSummary: string | null, userId: string | null): Promise<WorkflowVersion> { return this.workflowService.saveTemplateVersion(templateId, nodesJson, edgesJson, changeSummary, userId) }

  async getMediaRecords(options: { type?: string; source?: string; search?: string; limit: number; offset: number; includeDeleted?: boolean; visibilityOwnerId?: string; favoriteFilter?: ('favorite' | 'non-favorite')[]; publicFilter?: ('private' | 'public' | 'others-public')[]; favoriteUserId?: string; role?: 'user' | 'pro' | 'admin' | 'super' }): Promise<{ records: MediaRecord[]; total: number }> { return this.mediaService.getMediaRecords(options) }
  async getMediaRecordById(id: string, ownerId?: string, includePublic?: boolean): Promise<MediaRecord | null> { return this.mediaService.getMediaRecordById(id, ownerId, includePublic) }
  async createMediaRecord(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord> { return this.mediaService.createMediaRecord(data, ownerId) }
  async updateMediaRecord(id: string, data: { original_name?: string | null; metadata?: Record<string, unknown> | null }, ownerId?: string): Promise<MediaRecord | null> { return this.mediaService.updateMediaRecord(id, data, ownerId) }
  async softDeleteMediaRecord(id: string, ownerId?: string): Promise<boolean> { return this.mediaService.softDeleteMediaRecord(id, ownerId) }
  async hardDeleteMediaRecord(id: string, ownerId?: string): Promise<boolean> { return this.mediaService.hardDeleteMediaRecord(id, ownerId) }
  async toggleFavorite(userId: string, mediaId: string): Promise<{ isFavorite: boolean; action: 'added' | 'removed' }> { return this.mediaService.toggleFavorite(userId, mediaId) }
  async togglePublicMediaRecord(id: string, isPublic: boolean): Promise<MediaRecord | null> { return this.mediaService.togglePublicMediaRecord(id, isPublic) }
  async softDeleteMediaRecords(ids: string[]): Promise<{ deleted: number; failed: number }> { return this.mediaService.softDeleteMediaRecords(ids) }
  async getMediaRecordsByIds(ids: string[]): Promise<MediaRecord[]> { return this.mediaService.getMediaRecordsByIds(ids) }

  async createDeadLetterQueueItem(data: CreateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem> { return this.dlqService.createDeadLetterQueueItem(data, ownerId) }
  async getDeadLetterQueueItems(ownerId?: string, limit: number = 50): Promise<DeadLetterQueueItem[]> { return this.dlqService.getDeadLetterQueueItems(ownerId, limit) }
  async getDeadLetterQueueItemById(id: string, ownerId?: string): Promise<DeadLetterQueueItem | null> { return this.dlqService.getDeadLetterQueueItemById(id, ownerId) }
  async updateDeadLetterQueueItem(id: string, data: UpdateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem | null> { return this.dlqService.updateDeadLetterQueueItem(id, data, ownerId) }
  async retryDeadLetterQueueItem(id: string, ownerId?: string): Promise<string> { return this.dlqService.retryDeadLetterQueueItem(id, ownerId) }

  async getMaterialById(id: string, ownerId?: string): Promise<Material | null> { return this.materialService.getMaterialById(id, ownerId) }
  async getMaterials(options: MaterialQueryOptions): Promise<{ records: Material[]; total: number }> { return this.materialService.getMaterials(options) }
  async createMaterial(data: CreateMaterial, ownerId?: string): Promise<Material> { return this.materialService.createMaterial(data, ownerId) }
  async updateMaterial(id: string, data: UpdateMaterial, ownerId?: string): Promise<Material | null> { return this.materialService.updateMaterial(id, data, ownerId) }
  async softDeleteMaterial(id: string, ownerId?: string): Promise<boolean> { return this.materialService.softDeleteMaterial(id, ownerId) }
  async getMaterialDetail(id: string, ownerId?: string): Promise<MaterialDetailResult | null> { return this.materialService.getMaterialDetail(id, ownerId) }
  async createMaterialItem(data: CreateMaterialItem, ownerId?: string): Promise<MaterialItem> { return this.materialService.createMaterialItem(data, ownerId) }
  async updateMaterialItem(id: string, data: UpdateMaterialItem, ownerId?: string): Promise<MaterialItem | null> { return this.materialService.updateMaterialItem(id, data, ownerId) }
  async softDeleteMaterialItem(id: string, ownerId?: string): Promise<boolean> { return this.materialService.softDeleteMaterialItem(id, ownerId) }
  async reorderMaterialItems(materialId: string, items: Array<{ id: string; sort_order: number }>, ownerId?: string): Promise<void> { return this.materialService.reorderMaterialItems(materialId, items, ownerId) }
  async createPrompt(data: CreatePromptRecord, ownerId?: string): Promise<PromptRecord> { return this.materialService.createPrompt(data, ownerId) }
  async updatePrompt(id: string, data: UpdatePromptRecord, ownerId?: string): Promise<PromptRecord | null> { return this.materialService.updatePrompt(id, data, ownerId) }
  async softDeletePrompt(id: string, ownerId?: string): Promise<boolean> { return this.materialService.softDeletePrompt(id, ownerId) }
  async setDefaultPrompt(id: string, ownerId?: string): Promise<PromptRecord | null> { return this.materialService.setDefaultPrompt(id, ownerId) }
  async reorderPrompts(request: { target_type: PromptRecord['target_type']; target_id: string; slot_type: PromptRecord['slot_type']; items: Array<{ id: string; sort_order: number }> }, ownerId?: string): Promise<void> { return this.materialService.reorderPrompts(request, ownerId) }

  async getAllCapacityRecords(): Promise<CapacityRecord[]> { return this.systemService.getAllCapacityRecords() }
  async getCapacityByService(serviceType: string): Promise<CapacityRecord | null> { return this.systemService.getCapacityByService(serviceType) }
  async upsertCapacityRecord(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): Promise<CapacityRecord> { return this.systemService.upsertCapacityRecord(serviceType, data) }
  async getCapacityRecord(serviceType: string): Promise<CapacityRecord | null> { return this.systemService.getCapacityRecord(serviceType) }
  async getCapacity(serviceType: string): Promise<{ remaining: number; total: number } | null> { return this.systemService.getCapacity(serviceType) }
  async updateCapacity(serviceType: string, remaining: number): Promise<void> { return this.systemService.updateCapacity(serviceType, remaining) }
  async decrementCapacity(serviceType: string, amount: number = 1): Promise<CapacityRecord | null> { return this.systemService.decrementCapacity(serviceType, amount) }
  async getPromptTemplates(options: { category?: string; limit: number; offset: number; ownerId?: string }): Promise<{ templates: PromptTemplate[]; total: number }> { return this.systemService.getPromptTemplates(options) }
  async getPromptTemplateById(id: string, ownerId?: string): Promise<PromptTemplate | null> { return this.systemService.getPromptTemplateById(id, ownerId) }
  async createPromptTemplate(data: CreatePromptTemplate, ownerId?: string): Promise<PromptTemplate> { return this.systemService.createPromptTemplate(data, ownerId) }
  async updatePromptTemplate(id: string, data: UpdatePromptTemplate, ownerId?: string): Promise<PromptTemplate | null> { return this.systemService.updatePromptTemplate(id, data, ownerId) }
  async deletePromptTemplate(id: string, ownerId?: string): Promise<boolean> { return this.systemService.deletePromptTemplate(id, ownerId) }
  async createWebhookConfig(data: CreateWebhookConfig, ownerId?: string): Promise<WebhookConfig> { return this.systemService.createWebhookConfig(data, ownerId) }
  async getWebhookConfigById(id: string, ownerId?: string): Promise<WebhookConfig | null> { return this.systemService.getWebhookConfigById(id, ownerId) }
  async getWebhookConfigsByJobId(jobId: string): Promise<WebhookConfig[]> { return this.systemService.getWebhookConfigsByJobId(jobId) }
  async getWebhookConfigsByOwner(ownerId: string): Promise<WebhookConfig[]> { return this.systemService.getWebhookConfigsByOwner(ownerId) }
  async getAllWebhookConfigs(ownerId?: string): Promise<WebhookConfig[]> { return this.systemService.getAllWebhookConfigs(ownerId) }
  async updateWebhookConfig(id: string, updates: UpdateWebhookConfig, ownerId?: string): Promise<WebhookConfig | null> { return this.systemService.updateWebhookConfig(id, updates, ownerId) }
  async deleteWebhookConfig(id: string, ownerId?: string): Promise<boolean> { return this.systemService.deleteWebhookConfig(id, ownerId) }
  async createWebhookDelivery(data: CreateWebhookDelivery, ownerId?: string): Promise<WebhookDelivery> { return this.systemService.createWebhookDelivery(data, ownerId) }
  async getWebhookDeliveryById(id: string): Promise<WebhookDelivery | null> { return this.systemService.getWebhookDeliveryById(id) }
  async getWebhookDeliveriesByWebhook(webhookId: string, limit: number = 50, ownerId?: string): Promise<WebhookDelivery[]> { return this.systemService.getWebhookDeliveriesByWebhook(webhookId, limit, ownerId) }
  async getWebhookDeliveryByExecutionLog(executionLogId: string, ownerId?: string): Promise<WebhookDelivery[]> { return this.systemService.getWebhookDeliveryByExecutionLog(executionLogId, ownerId) }
  async getAllSystemConfigs(): Promise<SystemConfig[]> { return this.systemService.getAllSystemConfigs() }
  async getSystemConfigByKey(key: string): Promise<SystemConfig | null> { return this.systemService.getSystemConfigByKey(key) }
  async createSystemConfig(data: CreateSystemConfig, updatedBy?: string): Promise<SystemConfig> { return this.systemService.createSystemConfig(data, updatedBy) }
  async updateSystemConfig(key: string, updates: UpdateSystemConfig, updatedBy?: string): Promise<SystemConfig | null> { return this.systemService.updateSystemConfig(key, updates, updatedBy) }
  async deleteSystemConfig(key: string): Promise<boolean> { return this.systemService.deleteSystemConfig(key) }
  async getAllServiceNodePermissions(): Promise<ServiceNodePermission[]> { return this.systemService.getAllServiceNodePermissions() }
  async getServiceNodePermission(serviceName: string, methodName: string): Promise<ServiceNodePermission | null> { return this.systemService.getServiceNodePermission(serviceName, methodName) }
  async updateServiceNodePermission(id: string, data: { min_role?: string; is_enabled?: boolean }): Promise<void> { return this.systemService.updateServiceNodePermission(id, data) }
  async upsertServiceNodePermission(data: { service_name: string; method_name: string; display_name: string; category: string; min_role?: string; is_enabled?: boolean }): Promise<void> { return this.systemService.upsertServiceNodePermission(data) }
  async deleteServiceNodePermission(id: string): Promise<void> { return this.systemService.deleteServiceNodePermission(id) }
  async batchUpsertServiceNodePermissions(nodes: Array<{ service_name: string; method_name: string; display_name: string; category: string; min_role?: string; is_enabled?: boolean }>): Promise<void> { return this.systemService.batchUpsertServiceNodePermissions(nodes) }

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
