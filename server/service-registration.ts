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

  container.registerSingleton(TOKENS.QUEUE_PROCESSOR, (c) => {
    return new QueueProcessor(
      c.resolve(TOKENS.DATABASE),
      c.resolve(TOKENS.TASK_EXECUTOR),
      c.resolve(TOKENS.CAPACITY_CHECKER)
    )
  })

  container.registerSingleton(TOKENS.WORKFLOW_ENGINE, (c) => {
    return new WorkflowEngine(c.resolve(TOKENS.DATABASE), c.resolve(TOKENS.SERVICE_NODE_REGISTRY))
  })

  container.registerSingleton(TOKENS.NOTIFICATION_SERVICE, (c): NotificationService => {
    return new NotificationService(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.CRON_SCHEDULER, (c): CronScheduler => {
    return new CronScheduler(
      c.resolve(TOKENS.DATABASE),
      c.resolve(TOKENS.WORKFLOW_ENGINE),
      c.resolve(TOKENS.TASK_EXECUTOR),
      c.resolve(TOKENS.NOTIFICATION_SERVICE)
    )
  })

  container.registerSingleton(TOKENS.WEBSOCKET_SERVICE, () => {
    return WebSocketService.getInstance()
  })

  container.registerSingleton(TOKENS.EXECUTION_STATE_MANAGER, (c) => {
    return new ExecutionStateManager(c.resolve(TOKENS.DATABASE))
  })
}

/**
 * @deprecated Use `getGlobalContainer().resolve<DatabaseService>(TOKENS.DATABASE)` instead.
 * This function will be removed in a future version.
 */
export function getDatabaseService(): DatabaseService {
  return getGlobalContainer().resolve<DatabaseService>(TOKENS.DATABASE)
}

/**
 * @deprecated Use `getGlobalContainer().resolve<TaskExecutor>(TOKENS.TASK_EXECUTOR)` instead.
 * This function will be removed in a future version.
 */
export function getTaskExecutorService(): TaskExecutor {
  return getGlobalContainer().resolve<TaskExecutor>(TOKENS.TASK_EXECUTOR)
}

/**
 * @deprecated Use `getGlobalContainer().resolve<CapacityChecker>(TOKENS.CAPACITY_CHECKER)` instead.
 * This function will be removed in a future version.
 */
export function getCapacityCheckerService(): CapacityChecker {
  return getGlobalContainer().resolve<CapacityChecker>(TOKENS.CAPACITY_CHECKER)
}

/**
 * @deprecated Use `getGlobalContainer().resolve<QueueProcessor>(TOKENS.QUEUE_PROCESSOR)` instead.
 * This function will be removed in a future version.
 */
export function getQueueProcessorService(): QueueProcessor {
  return getGlobalContainer().resolve<QueueProcessor>(TOKENS.QUEUE_PROCESSOR)
}

/**
 * @deprecated Use `getGlobalContainer().resolve<WorkflowEngine>(TOKENS.WORKFLOW_ENGINE)` instead.
 * This function will be removed in a future version.
 */
export function getWorkflowEngineService(): WorkflowEngine {
  return getGlobalContainer().resolve<WorkflowEngine>(TOKENS.WORKFLOW_ENGINE)
}

/**
 * @deprecated Use `getGlobalContainer().resolve<CronScheduler>(TOKENS.CRON_SCHEDULER)` instead.
 * This function will be removed in a future version.
 */
export function getCronSchedulerService(): CronScheduler {
  return getGlobalContainer().resolve<CronScheduler>(TOKENS.CRON_SCHEDULER)
}

/**
 * @deprecated Use `getGlobalContainer().resolve<ServiceNodeRegistry>(TOKENS.SERVICE_NODE_REGISTRY)` instead.
 * This function will be removed in a future version.
 */
export function getServiceNodeRegistryService(): ServiceNodeRegistry {
  return getGlobalContainer().resolve<ServiceNodeRegistry>(TOKENS.SERVICE_NODE_REGISTRY)
}

/**
 * @deprecated Use `getGlobalContainer().resolve<WebSocketService>(TOKENS.WEBSOCKET_SERVICE)` instead.
 * This function will be removed in a future version.
 */
export function getWebSocketServiceInstance(): WebSocketService {
  return getGlobalContainer().resolve<WebSocketService>(TOKENS.WEBSOCKET_SERVICE)
}

/**
 * @deprecated Use `getGlobalContainer().resolve<NotificationService>(TOKENS.NOTIFICATION_SERVICE)` instead.
 * This function will be removed in a future version.
 */
export function getNotificationServiceInstance(): NotificationService {
  return getGlobalContainer().resolve<NotificationService>(TOKENS.NOTIFICATION_SERVICE)
}

/**
 * @deprecated Use `getGlobalContainer().resolve<ExecutionStateManager>(TOKENS.EXECUTION_STATE_MANAGER)` instead.
 * This function will be removed in a future version.
 */
export function getExecutionStateManagerInstance(): ExecutionStateManager {
  return getGlobalContainer().resolve<ExecutionStateManager>(TOKENS.EXECUTION_STATE_MANAGER)
}