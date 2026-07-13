import type { Container } from '../container.js'
import { getDatabase, type DatabaseService } from '../database/service-async.js'
import { getMiniMaxClient } from '../lib/minimax/index.js'
import { DatabasePoolStatsService } from '../services/database-pool-stats-service.js'
import { CapacityChecker } from '../services/capacity-checker.js'
import { ConcurrencyManager } from '../services/concurrency-manager.js'
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
import type { ITaskService } from '../services/domain/interfaces/task.interface.js'
import { DLQAutoRetryScheduler } from '../services/dlq-auto-retry-scheduler.js'
import { ExecutionStateManager } from '../services/execution-state-manager.js'
import { ExportService } from '../services/export-service.js'
import { createMisfireHandler } from '../services/misfire-handler.js'
import { NotificationService } from '../services/notification-service.js'
import { QueueProcessor } from '../services/queue-processor.js'
import { RetryManager } from '../services/retry-manager.js'
import { getServiceNodeRegistry } from '../services/service-node-registry.js'
import { ServiceNodePermissionService } from '../services/service-node-permission-service.js'
import { SettingsService } from '../services/settings-service.js'
import { SystemConfigService } from '../services/system-config-service.js'
import { TaskExecutor } from '../services/task-executor.js'
import { TemplateService } from '../services/template-service.js'
import { UserService } from '../services/user-service.js'
import { WebSocketService, cronEvents } from '../services/websocket-service.js'
import { WorkflowEngine } from '../services/workflow/index.js'
import { BackupService } from '../services/backup-service.js'
import { ExternalApiLogService } from '../services/external-api-log-service.js'
import type { IWebhookService } from '../services/domain/interfaces/index.js'
import {
  createCapacityRepository,
  createExternalApiLogRepository,
  createExportRepositories,
  createJobRepository,
  createLogRepositories,
  createMaterialRepositories,
  createMediaRepository,
  createServiceNodePermissionRepositories,
  createSystemConfigRepository,
  createTaskRepositories,
  createTemplateRepository,
  createWebhookRepository,
  createWorkflowRepository,
  getDatabaseConnection,
} from './repository-factories.js'
import { TOKENS } from './tokens.js'

export async function registerServiceDependencies(container: Container): Promise<void> {
  const db = await getDatabase()
  container.register(TOKENS.DATABASE, db)

  const minimaxClient = getMiniMaxClient()
  container.register(TOKENS.MINIMAX_CLIENT, minimaxClient)

  container.registerSingleton(TOKENS.DATABASE_POOL_STATS_SERVICE, (c) => {
    return new DatabasePoolStatsService(c.resolve<DatabaseService>(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.TASK_EXECUTOR, (c) => {
    return new TaskExecutor(c.resolve(TOKENS.MINIMAX_CLIENT))
  })

  container.registerSingleton(TOKENS.CAPACITY_CHECKER, (c) => {
    return new CapacityChecker(c.resolve(TOKENS.MINIMAX_CLIENT), c.resolve(TOKENS.CAPACITY_SERVICE))
  })

  container.registerSingleton(TOKENS.SERVICE_NODE_REGISTRY, (c) => {
    return getServiceNodeRegistry(c.resolve(TOKENS.SERVICE_NODE_PERMISSION_SERVICE))
  })

  container.registerSingleton(TOKENS.CONCURRENCY_MANAGER, () => {
    return new ConcurrencyManager()
  })

  container.registerSingleton(TOKENS.RETRY_MANAGER, () => {
    return new RetryManager()
  })

  container.registerSingleton(TOKENS.QUEUE_PROCESSOR, (c) => {
    return new QueueProcessor(
      c.resolve(TOKENS.TASK_SERVICE),
      c.resolve(TOKENS.TASK_EXECUTOR),
      c.resolve(TOKENS.CAPACITY_CHECKER),
      c.resolve(TOKENS.EVENT_BUS),
      c.resolve(TOKENS.RETRY_MANAGER)
    )
  })

  container.registerSingleton(TOKENS.WORKFLOW_ENGINE, (c) => {
    return new WorkflowEngine(c.resolve(TOKENS.DATABASE), c.resolve(TOKENS.SERVICE_NODE_REGISTRY), undefined, c.resolve(TOKENS.EVENT_BUS))
  })

  container.registerSingleton(TOKENS.NOTIFICATION_SERVICE, (c): NotificationService => {
    return new NotificationService(c.resolve<IWebhookService>(TOKENS.WEBHOOK_SERVICE))
  })

  container.registerSingleton(TOKENS.CRON_SCHEDULER, (c): CronScheduler => {
    const scheduler = new CronScheduler(
      c.resolve(TOKENS.WORKFLOW_ENGINE),
      c.resolve(TOKENS.TASK_EXECUTOR),
      c.resolve(TOKENS.NOTIFICATION_SERVICE),
      c.resolve(TOKENS.EVENT_BUS),
      c.resolve(TOKENS.CONCURRENCY_MANAGER)
    )
    const handler = createMisfireHandler((job) => scheduler.executeJobTick(job))
    scheduler.setMisfireHandler(handler)
    return scheduler
  })

  container.registerSingleton(TOKENS.MISFIRE_HANDLER, (c) => {
    const scheduler = c.resolve<CronScheduler>(TOKENS.CRON_SCHEDULER)
    return scheduler.getMisfireHandler()!
  })

  container.registerSingleton(TOKENS.WEBSOCKET_SERVICE, () => {
    return WebSocketService.getInstance()
  })

  container.registerSingleton(TOKENS.EXECUTION_STATE_MANAGER, (c) => {
    return new ExecutionStateManager(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.WORKFLOW_SERVICE, (c) => {
    return new WorkflowService(createWorkflowRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
  })

  container.registerSingleton(TOKENS.DLQ_AUTO_RETRY_SCHEDULER, (c) => {
    return new DLQAutoRetryScheduler(c.resolve<ITaskService>(TOKENS.TASK_SERVICE))
  })

  container.registerSingleton(TOKENS.JOB_SERVICE, (c) => {
    return new JobService(createJobRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
  })

  container.registerSingleton(TOKENS.TASK_SERVICE, (c) => {
    const repositories = createTaskRepositories(c.resolve<DatabaseService>(TOKENS.DATABASE))
    return new TaskService(repositories.taskRepository, repositories.deadLetterRepository)
  })

  container.registerSingleton(TOKENS.LOG_SERVICE, (c) => {
    const repositories = createLogRepositories(c.resolve<DatabaseService>(TOKENS.DATABASE))
    return new LogService(
      repositories.logRepository,
      repositories.userRepository,
      c.resolve(TOKENS.EXTERNAL_API_LOG_REPOSITORY)
    )
  })

  container.registerSingleton(TOKENS.MEDIA_SERVICE, (c) => {
    return new MediaService(createMediaRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
  })

  container.registerSingleton(TOKENS.WEBHOOK_SERVICE, (c) => {
    return new WebhookService(createWebhookRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
  })

  container.registerSingleton(TOKENS.CAPACITY_SERVICE, (c) => {
    return new CapacityService(createCapacityRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
  })

  container.registerSingleton(TOKENS.MATERIAL_SERVICE, (c) => {
    const repositories = createMaterialRepositories(c.resolve<DatabaseService>(TOKENS.DATABASE))
    return new MaterialService(
      repositories.materialRepository,
      repositories.materialItemRepository,
      repositories.promptRepository
    )
  })

  container.registerSingleton(TOKENS.EXPORT_SERVICE, (c) => {
    const repositories = createExportRepositories(c.resolve<DatabaseService>(TOKENS.DATABASE))
    return new ExportService(repositories.logRepository, repositories.mediaRepository)
  })

  container.registerSingleton(TOKENS.BACKUP_SERVICE, () => {
    return new BackupService()
  })

  container.registerSingleton(TOKENS.SETTINGS_SERVICE, (c) => {
    return new SettingsService(getDatabaseConnection(c.resolve<DatabaseService>(TOKENS.DATABASE)))
  })

  container.registerSingleton(TOKENS.EXTERNAL_API_LOG_REPOSITORY, (c) => {
    return createExternalApiLogRepository(c.resolve<DatabaseService>(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.MEDIA_REPOSITORY, (c) => {
    return createMediaRepository(c.resolve<DatabaseService>(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.USER_SERVICE, (c) => {
    return new UserService(getDatabaseConnection(c.resolve<DatabaseService>(TOKENS.DATABASE)))
  })

  container.registerSingleton(TOKENS.TEMPLATE_SERVICE, (c) => {
    return new TemplateService(createTemplateRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
  })

  container.registerSingleton(TOKENS.SYSTEM_CONFIG_SERVICE, (c) => {
    return new SystemConfigService(createSystemConfigRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
  })

  container.registerSingleton(TOKENS.EXTERNAL_API_LOG_SERVICE, (c) => {
    return new ExternalApiLogService(c.resolve(TOKENS.EXTERNAL_API_LOG_REPOSITORY))
  })

  container.registerSingleton(TOKENS.SERVICE_NODE_PERMISSION_SERVICE, (c) => {
    const repositories = createServiceNodePermissionRepositories(c.resolve<DatabaseService>(TOKENS.DATABASE))
    return new ServiceNodePermissionService(repositories.userRepository)
  })

  container.register(TOKENS.EVENT_BUS, cronEvents)
}
