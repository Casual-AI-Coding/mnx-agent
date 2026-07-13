import { getGlobalContainer } from '../container.js'
import type { DatabaseService } from '../database/service-async.js'
import type { ExternalApiLogRepository } from '../repositories/external-api-log.repository.js'
import type { MediaRepository } from '../repositories/media-repository.js'
import { AnnouncementService } from '../services/announcement-service.js'
import { DatabasePoolStatsService } from '../services/database-pool-stats-service.js'
import { CapacityChecker } from '../services/capacity-checker.js'
import { CronScheduler } from '../services/cron-scheduler.js'
import {
  CapacityService,
  JobService,
  LogService,
  MaterialService,
  MediaService,
  TaskService,
  WebhookService,
  WorkflowService,
} from '../services/domain/index.js'
import { ExecutionStateManager } from '../services/execution-state-manager.js'
import { ExportService } from '../services/export-service.js'
import type { IConcurrencyManager } from '../services/interfaces/concurrency-manager.interface.js'
import type { IDLQAutoRetryScheduler } from '../services/interfaces/dlq-auto-retry-scheduler.interface.js'
import type { IEventBus } from '../services/interfaces/event-bus.interface.js'
import type { IMisfireHandler } from '../services/interfaces/misfire-handler.interface.js'
import type { IRetryManager } from '../services/interfaces/retry-manager.interface.js'
import { NotificationService } from '../services/notification-service.js'
import { QueueProcessor } from '../services/queue-processor.js'
import type { ServiceNodeRegistry } from '../services/service-node-registry.js'
import { ServiceNodePermissionService } from '../services/service-node-permission-service.js'
import { SettingsService } from '../services/settings-service.js'
import { SystemConfigService } from '../services/system-config-service.js'
import { TaskExecutor } from '../services/task-executor.js'
import { TemplateService } from '../services/template-service.js'
import { UserService } from '../services/user-service.js'
import { WebSocketService } from '../services/websocket-service.js'
import { WorkflowEngine } from '../services/workflow/index.js'
import { BackupService } from '../services/backup-service.js'
import { ExternalApiLogService } from '../services/external-api-log-service.js'
import { InvitationCodeService } from '../services/invitation-code-service.js'
import { TOKENS } from './tokens.js'

export function getDatabaseService(): DatabaseService {
  return getGlobalContainer().resolve<DatabaseService>(TOKENS.DATABASE)
}

export function getDatabasePoolStatsService(): DatabasePoolStatsService {
  return getGlobalContainer().resolve<DatabasePoolStatsService>(TOKENS.DATABASE_POOL_STATS_SERVICE)
}

export function getAnnouncementService(): AnnouncementService {
  return getGlobalContainer().resolve<AnnouncementService>(TOKENS.ANNOUNCEMENT_SERVICE)
}

export function getInvitationCodeService(): InvitationCodeService {
  return getGlobalContainer().resolve<InvitationCodeService>(TOKENS.INVITATION_CODE_SERVICE)
}

export function getTaskExecutorService(): TaskExecutor {
  return getGlobalContainer().resolve<TaskExecutor>(TOKENS.TASK_EXECUTOR)
}

export function getCapacityCheckerService(): CapacityChecker {
  return getGlobalContainer().resolve<CapacityChecker>(TOKENS.CAPACITY_CHECKER)
}

export function getQueueProcessorService(): QueueProcessor {
  return getGlobalContainer().resolve<QueueProcessor>(TOKENS.QUEUE_PROCESSOR)
}

export function getWorkflowEngineService(): WorkflowEngine {
  return getGlobalContainer().resolve<WorkflowEngine>(TOKENS.WORKFLOW_ENGINE)
}

export function getCronSchedulerService(): CronScheduler {
  return getGlobalContainer().resolve<CronScheduler>(TOKENS.CRON_SCHEDULER)
}

export function getServiceNodeRegistryService(): ServiceNodeRegistry {
  return getGlobalContainer().resolve<ServiceNodeRegistry>(TOKENS.SERVICE_NODE_REGISTRY)
}

export function getWebSocketServiceInstance(): WebSocketService {
  return getGlobalContainer().resolve<WebSocketService>(TOKENS.WEBSOCKET_SERVICE)
}

export function getNotificationServiceInstance(): NotificationService {
  return getGlobalContainer().resolve<NotificationService>(TOKENS.NOTIFICATION_SERVICE)
}

export function getExecutionStateManagerInstance(): ExecutionStateManager {
  return getGlobalContainer().resolve<ExecutionStateManager>(TOKENS.EXECUTION_STATE_MANAGER)
}

export function getWorkflowService(): WorkflowService {
  return getGlobalContainer().resolve<WorkflowService>(TOKENS.WORKFLOW_SERVICE)
}

export function getEventBus(): IEventBus {
  return getGlobalContainer().resolve<IEventBus>(TOKENS.EVENT_BUS)
}

export function getConcurrencyManager(): IConcurrencyManager {
  return getGlobalContainer().resolve<IConcurrencyManager>(TOKENS.CONCURRENCY_MANAGER)
}

export function getMisfireHandler(): IMisfireHandler {
  return getGlobalContainer().resolve<IMisfireHandler>(TOKENS.MISFIRE_HANDLER)
}

export function getRetryManager(): IRetryManager {
  return getGlobalContainer().resolve<IRetryManager>(TOKENS.RETRY_MANAGER)
}

export function getDLQAutoRetryScheduler(): IDLQAutoRetryScheduler {
  return getGlobalContainer().resolve<IDLQAutoRetryScheduler>(TOKENS.DLQ_AUTO_RETRY_SCHEDULER)
}

export function getJobService(): JobService {
  return getGlobalContainer().resolve<JobService>(TOKENS.JOB_SERVICE)
}

export function getTaskService(): TaskService {
  return getGlobalContainer().resolve<TaskService>(TOKENS.TASK_SERVICE)
}

export function getLogService(): LogService {
  return getGlobalContainer().resolve<LogService>(TOKENS.LOG_SERVICE)
}

export function getMediaService(): MediaService {
  return getGlobalContainer().resolve<MediaService>(TOKENS.MEDIA_SERVICE)
}

export function getWebhookService(): WebhookService {
  return getGlobalContainer().resolve<WebhookService>(TOKENS.WEBHOOK_SERVICE)
}

export function getCapacityService(): CapacityService {
  return getGlobalContainer().resolve<CapacityService>(TOKENS.CAPACITY_SERVICE)
}

export function getMaterialService(): MaterialService {
  return getGlobalContainer().resolve<MaterialService>(TOKENS.MATERIAL_SERVICE)
}

export function getExportService(): ExportService {
  return getGlobalContainer().resolve<ExportService>(TOKENS.EXPORT_SERVICE)
}

export function getBackupService(): BackupService {
  return getGlobalContainer().resolve<BackupService>(TOKENS.BACKUP_SERVICE)
}

export function getSystemConfigService(): SystemConfigService {
  return getGlobalContainer().resolve<SystemConfigService>(TOKENS.SYSTEM_CONFIG_SERVICE)
}

export function getTemplateService(): TemplateService {
  return getGlobalContainer().resolve<TemplateService>(TOKENS.TEMPLATE_SERVICE)
}

export function getExternalApiLogService(): ExternalApiLogService {
  return getGlobalContainer().resolve<ExternalApiLogService>(TOKENS.EXTERNAL_API_LOG_SERVICE)
}

export function getServiceNodePermissionService(): ServiceNodePermissionService {
  return getGlobalContainer().resolve<ServiceNodePermissionService>(TOKENS.SERVICE_NODE_PERMISSION_SERVICE)
}

export function getSettingsService(): SettingsService {
  return getGlobalContainer().resolve<SettingsService>(TOKENS.SETTINGS_SERVICE)
}

export function getExternalApiLogRepository(): ExternalApiLogRepository {
  return getGlobalContainer().resolve<ExternalApiLogRepository>(TOKENS.EXTERNAL_API_LOG_REPOSITORY)
}

export function getMediaRepository(): MediaRepository {
  return getGlobalContainer().resolve<MediaRepository>(TOKENS.MEDIA_REPOSITORY)
}

export function getUserService(): UserService {
  return getGlobalContainer().resolve<UserService>(TOKENS.USER_SERVICE)
}
