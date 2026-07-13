import type { Container } from './container.js'
import type { DatabaseService } from './database/service-async.js'
import type { MiniMaxClient } from './lib/minimax/index.js'
import { TOKENS } from './service-registration/tokens.js'
import type { DatabasePoolStatsService } from './services/database-pool-stats-service.js'
import type { ExternalApiLogRepository } from './repositories/external-api-log.repository.js'
import type { ExternalApiLogService } from './services/external-api-log-service.js'
import type { MediaRepository } from './repositories/media-repository.js'
import type { UserService } from './services/user-service.js'
import type { CapacityChecker } from './services/capacity-checker.js'
import type { CronScheduler } from './services/cron-scheduler.js'
import type {
  CapacityService,
  JobService,
  LogService,
  MaterialService,
  MediaService,
  TaskService,
  WebhookService,
  WorkflowService,
} from './services/domain/index.js'
import type { ExecutionStateManager } from './services/execution-state-manager.js'
import type { ExportService } from './services/export-service.js'
import type { BackupService } from './services/backup-service.js'
import type { TemplateService } from './services/template-service.js'
import type { SystemConfigService } from './services/system-config-service.js'
import type { IConcurrencyManager } from './services/interfaces/concurrency-manager.interface.js'
import type { IDLQAutoRetryScheduler } from './services/interfaces/dlq-auto-retry-scheduler.interface.js'
import type { IEventBus } from './services/interfaces/event-bus.interface.js'
import type { IMisfireHandler } from './services/interfaces/misfire-handler.interface.js'
import type { IRetryManager } from './services/interfaces/retry-manager.interface.js'
import type { NotificationService } from './services/notification-service.js'
import type { QueueProcessor } from './services/queue-processor.js'
import type { ServiceNodeRegistry } from './services/service-node-registry.js'
import type { SettingsService } from './services/settings-service.js'
import type { ServiceNodePermissionService } from "./services/service-node-permission-service.js"
import type { TaskExecutor } from './services/task-executor.js'
import type { WebSocketService } from './services/websocket-service.js'
import type { WorkflowEngine } from './services/workflow/index.js'

export interface ContainerTokenMap {
  readonly [TOKENS.DATABASE]: DatabaseService
  readonly [TOKENS.MINIMAX_CLIENT]: MiniMaxClient
  readonly [TOKENS.DATABASE_POOL_STATS_SERVICE]: DatabasePoolStatsService
  readonly [TOKENS.TASK_EXECUTOR]: TaskExecutor
  readonly [TOKENS.CAPACITY_CHECKER]: CapacityChecker
  readonly [TOKENS.QUEUE_PROCESSOR]: QueueProcessor
  readonly [TOKENS.WORKFLOW_ENGINE]: WorkflowEngine
  readonly [TOKENS.CRON_SCHEDULER]: CronScheduler
  readonly [TOKENS.SERVICE_NODE_REGISTRY]: ServiceNodeRegistry
  readonly [TOKENS.WEBSOCKET_SERVICE]: WebSocketService
  readonly [TOKENS.NOTIFICATION_SERVICE]: NotificationService
  readonly [TOKENS.EXECUTION_STATE_MANAGER]: ExecutionStateManager
  readonly [TOKENS.WORKFLOW_SERVICE]: WorkflowService
  readonly [TOKENS.EVENT_BUS]: IEventBus
  readonly [TOKENS.CONCURRENCY_MANAGER]: IConcurrencyManager
  readonly [TOKENS.MISFIRE_HANDLER]: IMisfireHandler
  readonly [TOKENS.RETRY_MANAGER]: IRetryManager
  readonly [TOKENS.DLQ_AUTO_RETRY_SCHEDULER]: IDLQAutoRetryScheduler
  readonly [TOKENS.JOB_SERVICE]: JobService
  readonly [TOKENS.TASK_SERVICE]: TaskService
  readonly [TOKENS.LOG_SERVICE]: LogService
  readonly [TOKENS.MEDIA_SERVICE]: MediaService
  readonly [TOKENS.WEBHOOK_SERVICE]: WebhookService
  readonly [TOKENS.CAPACITY_SERVICE]: CapacityService
  readonly [TOKENS.MATERIAL_SERVICE]: MaterialService
  readonly [TOKENS.EXPORT_SERVICE]: ExportService
  readonly [TOKENS.BACKUP_SERVICE]: BackupService
  readonly [TOKENS.TEMPLATE_SERVICE]: TemplateService
  readonly [TOKENS.SYSTEM_CONFIG_SERVICE]: SystemConfigService
  readonly [TOKENS.EXTERNAL_API_LOG_SERVICE]: ExternalApiLogService
  readonly [TOKENS.SERVICE_NODE_PERMISSION_SERVICE]: ServiceNodePermissionService
  readonly [TOKENS.SETTINGS_SERVICE]: SettingsService
  readonly [TOKENS.EXTERNAL_API_LOG_REPOSITORY]: ExternalApiLogRepository
  readonly [TOKENS.MEDIA_REPOSITORY]: MediaRepository
  readonly [TOKENS.USER_SERVICE]: UserService
}

export type ContainerToken = keyof ContainerTokenMap

export function resolve<TToken extends ContainerToken>(container: Container, token: TToken): ContainerTokenMap[TToken] {
  return container.resolve<ContainerTokenMap[TToken]>(token)
}
