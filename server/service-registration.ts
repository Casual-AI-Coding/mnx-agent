import { getGlobalContainer } from './container.js'
import { getDatabase } from './database/service-async.js'
import { getMiniMaxClient } from './lib/minimax.js'
import { TaskExecutor } from './services/task-executor.js'
import { CapacityChecker } from './services/capacity-checker.js'
import { QueueProcessor } from './services/queue-processor.js'
import { WorkflowEngine } from './services/workflow/index.js'
import { CronScheduler } from './services/cron-scheduler.js'
import { getServiceNodeRegistry } from './services/service-node-registry.js'
import { getWebSocketService } from './services/websocket-service.js'
import { getNotificationService } from './services/notification-service.js'
import { getExecutionStateManager } from './services/execution-state-manager.js'

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

  container.registerSingleton(TOKENS.NOTIFICATION_SERVICE, (c) => {
    return getNotificationService(c.resolve(TOKENS.DATABASE))
  })

  container.registerSingleton(TOKENS.CRON_SCHEDULER, (c) => {
    return new CronScheduler(
      c.resolve(TOKENS.DATABASE),
      c.resolve(TOKENS.WORKFLOW_ENGINE),
      c.resolve(TOKENS.TASK_EXECUTOR)
    )
  })

  container.registerSingleton(TOKENS.WEBSOCKET_SERVICE, () => {
    return getWebSocketService()
  })

  container.registerSingleton(TOKENS.EXECUTION_STATE_MANAGER, (c) => {
    return getExecutionStateManager(c.resolve(TOKENS.DATABASE))
  })
}

export function getDatabaseService() {
  return getGlobalContainer().resolve(TOKENS.DATABASE)
}

export function getTaskExecutorService() {
  return getGlobalContainer().resolve(TOKENS.TASK_EXECUTOR)
}

export function getCapacityCheckerService() {
  return getGlobalContainer().resolve(TOKENS.CAPACITY_CHECKER)
}

export function getQueueProcessorService() {
  return getGlobalContainer().resolve(TOKENS.QUEUE_PROCESSOR)
}

export function getWorkflowEngineService() {
  return getGlobalContainer().resolve(TOKENS.WORKFLOW_ENGINE)
}

export function getCronSchedulerService() {
  return getGlobalContainer().resolve(TOKENS.CRON_SCHEDULER)
}

export function getServiceNodeRegistryService() {
  return getGlobalContainer().resolve(TOKENS.SERVICE_NODE_REGISTRY)
}

export function getWebSocketServiceInstance() {
  return getGlobalContainer().resolve(TOKENS.WEBSOCKET_SERVICE)
}

export function getNotificationServiceInstance() {
  return getGlobalContainer().resolve(TOKENS.NOTIFICATION_SERVICE)
}

export function getExecutionStateManagerInstance() {
  return getGlobalContainer().resolve(TOKENS.EXECUTION_STATE_MANAGER)
}