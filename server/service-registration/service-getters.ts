import { getGlobalContainer } from '../container.js'
import { resolve } from '../container.types.js'
import { TOKENS } from './tokens.js'

/**
 * 类型化的服务定位器（保留函数签名以避免大规模调用点改动）。
 *
 * 设计权衡（见 ADR-0006）：
 * - 函数签名保持不变，调用点零改动
 * - 内部使用 `resolve<TToken>(container, token)` 走 ContainerTokenMap 类型守卫
 * - 编译期即可检测 token 与服务类型的错配
 * - 与其删除 Service Locator（100+ 调用点改动，收益低），不如让它类型安全
 */

export function getDatabaseService() {
  return resolve(getGlobalContainer(), TOKENS.DATABASE)
}

export function getDatabasePoolStatsService() {
  return resolve(getGlobalContainer(), TOKENS.DATABASE_POOL_STATS_SERVICE)
}

export function getAnnouncementService() {
  return resolve(getGlobalContainer(), TOKENS.ANNOUNCEMENT_SERVICE)
}

export function getInvitationCodeService() {
  return resolve(getGlobalContainer(), TOKENS.INVITATION_CODE_SERVICE)
}

export function getTaskExecutorService() {
  return resolve(getGlobalContainer(), TOKENS.TASK_EXECUTOR)
}

export function getCapacityCheckerService() {
  return resolve(getGlobalContainer(), TOKENS.CAPACITY_CHECKER)
}

export function getQueueProcessorService() {
  return resolve(getGlobalContainer(), TOKENS.QUEUE_PROCESSOR)
}

export function getWorkflowEngineService() {
  return resolve(getGlobalContainer(), TOKENS.WORKFLOW_ENGINE)
}

export function getCronSchedulerService() {
  return resolve(getGlobalContainer(), TOKENS.CRON_SCHEDULER)
}

export function getServiceNodeRegistryService() {
  return resolve(getGlobalContainer(), TOKENS.SERVICE_NODE_REGISTRY)
}

export function getWebSocketServiceInstance() {
  return resolve(getGlobalContainer(), TOKENS.WEBSOCKET_SERVICE)
}

export function getNotificationServiceInstance() {
  return resolve(getGlobalContainer(), TOKENS.NOTIFICATION_SERVICE)
}

export function getExecutionStateManagerInstance() {
  return resolve(getGlobalContainer(), TOKENS.EXECUTION_STATE_MANAGER)
}

export function getWorkflowService() {
  return resolve(getGlobalContainer(), TOKENS.WORKFLOW_SERVICE)
}

export function getEventBus() {
  return resolve(getGlobalContainer(), TOKENS.EVENT_BUS)
}

export function getConcurrencyManager() {
  return resolve(getGlobalContainer(), TOKENS.CONCURRENCY_MANAGER)
}

export function getMisfireHandler() {
  return resolve(getGlobalContainer(), TOKENS.MISFIRE_HANDLER)
}

export function getRetryManager() {
  return resolve(getGlobalContainer(), TOKENS.RETRY_MANAGER)
}

export function getDLQAutoRetryScheduler() {
  return resolve(getGlobalContainer(), TOKENS.DLQ_AUTO_RETRY_SCHEDULER)
}

export function getJobService() {
  return resolve(getGlobalContainer(), TOKENS.JOB_SERVICE)
}

export function getTaskService() {
  return resolve(getGlobalContainer(), TOKENS.TASK_SERVICE)
}

export function getLogService() {
  return resolve(getGlobalContainer(), TOKENS.LOG_SERVICE)
}

export function getDashboardService() {
  return resolve(getGlobalContainer(), TOKENS.DASHBOARD_SERVICE)
}

export function getMediaService() {
  return resolve(getGlobalContainer(), TOKENS.MEDIA_SERVICE)
}

export function getWebhookService() {
  return resolve(getGlobalContainer(), TOKENS.WEBHOOK_SERVICE)
}

export function getCapacityService() {
  return resolve(getGlobalContainer(), TOKENS.CAPACITY_SERVICE)
}

export function getMaterialService() {
  return resolve(getGlobalContainer(), TOKENS.MATERIAL_SERVICE)
}

export function getExportService() {
  return resolve(getGlobalContainer(), TOKENS.EXPORT_SERVICE)
}

export function getBackupService() {
  return resolve(getGlobalContainer(), TOKENS.BACKUP_SERVICE)
}

export function getSystemConfigService() {
  return resolve(getGlobalContainer(), TOKENS.SYSTEM_CONFIG_SERVICE)
}

export function getTemplateService() {
  return resolve(getGlobalContainer(), TOKENS.TEMPLATE_SERVICE)
}

export function getExternalApiLogService() {
  return resolve(getGlobalContainer(), TOKENS.EXTERNAL_API_LOG_SERVICE)
}

export function getServiceNodePermissionService() {
  return resolve(getGlobalContainer(), TOKENS.SERVICE_NODE_PERMISSION_SERVICE)
}

export function getSettingsService() {
  return resolve(getGlobalContainer(), TOKENS.SETTINGS_SERVICE)
}

export function getExternalApiLogRepository() {
  return resolve(getGlobalContainer(), TOKENS.EXTERNAL_API_LOG_REPOSITORY)
}

export function getMediaRepository() {
  return resolve(getGlobalContainer(), TOKENS.MEDIA_REPOSITORY)
}

export function getUserService() {
  return resolve(getGlobalContainer(), TOKENS.USER_SERVICE)
}

export function getAdminUserService() {
  return resolve(getGlobalContainer(), TOKENS.ADMIN_USER_SERVICE)
}
