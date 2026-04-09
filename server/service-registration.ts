import { getGlobalContainer } from './container.js'
import { getDatabase, type DatabaseService } from './database/service-async.js'
import { getMiniMaxClient, type MiniMaxClient } from './lib/minimax.js'
import { TaskExecutor } from './services/task-executor.js'
import { CapacityChecker } from './services/capacity-checker.js'
import { QueueProcessor } from './services/queue-processor.js'
import { WorkflowEngine } from './services/workflow/index.js'
import { CronScheduler } from './services/cron-scheduler.js'
import { getServiceNodeRegistry, type ServiceNodeRegistry } from './services/service-node-registry.js'
import { WebSocketService } from './services/websocket-service.js'
import { NotificationService } from './services/notification-service.js'
import { ExecutionStateManager } from './services/execution-state-manager.js'
import { WorkflowService, JobService, TaskService, LogService, MediaService, WebhookService, CapacityService } from './services/domain/index.js'
import { cronEvents, CronEventEmitter } from './services/websocket-service.js'
import type { IEventBus } from './services/interfaces/event-bus.interface.js'
import { ConcurrencyManager } from './services/concurrency-manager.js'
import { createMisfireHandler } from './services/misfire-handler.js'
import { RetryManager } from './services/retry-manager.js'
import { DLQAutoRetryScheduler } from './services/dlq-auto-retry-scheduler.js'
import type { IConcurrencyManager } from './services/interfaces/concurrency-manager.interface.js'
import type { IMisfireHandler } from './services/interfaces/misfire-handler.interface.js'
import type { IRetryManager } from './services/interfaces/retry-manager.interface.js'
import type { IDLQAutoRetryScheduler } from './services/interfaces/dlq-auto-retry-scheduler.interface.js'

export const TOKENS = {
  DATABASE: 'database',
  MINIMAX_CLIENT: 'minimaxClient',
  TASK_EXECUTOR: 'taskExecutor',
  CAPACITY_CHECKER: 'capacityChecker',
  QUEUE_PROCESSOR: 'queueProcessor',
  WORKFLOW_ENGINE: 'workflowEngine',
  CRON_SCHEDULER: 'cronScheduler',
  SERVICE_NODE_REGISTRY: 'serviceNodeRegistry',
  WEBSOCKET_SERVICE: 'websocketService',
  NOTIFICATION_SERVICE: 'notificationService',
  EXECUTION_STATE_MANAGER: 'executionStateManager',
  WORKFLOW_SERVICE: 'workflowService',
  EVENT_BUS: 'eventBus',
  CONCURRENCY_MANAGER: 'concurrencyManager',
  MISFIRE_HANDLER: 'misfireHandler',
  RETRY_MANAGER: 'retryManager',
  DLQ_AUTO_RETRY_SCHEDULER: 'dlqAutoRetryScheduler',
  JOB_SERVICE: 'jobService',
  TASK_SERVICE: 'taskService',
  LOG_SERVICE: 'logService',
  MEDIA_SERVICE: 'mediaService',
  WEBHOOK_SERVICE: 'webhookService',
  CAPACITY_SERVICE: 'capacityService',
} as const

export async function registerServices(): Promise<void> {
  const container = getGlobalContainer()

  const db = await getDatabase()
  container.register(TOKENS.DATABASE, db)

  const minimaxClient = getMiniMaxClient()
  container.register(TOKENS.MINIMAX_CLIENT, minimaxClient)

  container.registerSingleton(TOKENS.TASK_EXECUTOR, (c) => {
    return new TaskExecutor(c.resolve(TOKENS.MINIMAX_CLIENT), c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.CAPACITY_CHECKER, (c) => {
    return new CapacityChecker(c.resolve(TOKENS.MINIMAX_CLIENT), c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.SERVICE_NODE_REGISTRY, (c) => {
    return getServiceNodeRegistry(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.CONCURRENCY_MANAGER, () => {
    return new ConcurrencyManager()
  })

  container.registerSingleton(TOKENS.RETRY_MANAGER, () => {
    return new RetryManager()
  })

  container.registerSingleton(TOKENS.QUEUE_PROCESSOR, (c) => {
    return new QueueProcessor(
      c.resolve(TOKENS.DATABASE),
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
    return new NotificationService(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.CRON_SCHEDULER, (c): CronScheduler => {
    const scheduler = new CronScheduler(
      c.resolve(TOKENS.DATABASE),
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
    return new WorkflowService(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.DLQ_AUTO_RETRY_SCHEDULER, (c) => {
    return new DLQAutoRetryScheduler(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.JOB_SERVICE, (c) => {
    return new JobService(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.TASK_SERVICE, (c) => {
    return new TaskService(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.LOG_SERVICE, (c) => {
    return new LogService(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.MEDIA_SERVICE, (c) => {
    return new MediaService(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.WEBHOOK_SERVICE, (c) => {
    return new WebhookService(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.CAPACITY_SERVICE, (c) => {
    return new CapacityService(c.resolve(TOKENS.DATABASE))
  })

  // Register the global event bus singleton (CronEventEmitter implements IEventBus)
  container.register(TOKENS.EVENT_BUS, cronEvents)
}

export function getDatabaseService(): DatabaseService {
  return getGlobalContainer().resolve<DatabaseService>(TOKENS.DATABASE)
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