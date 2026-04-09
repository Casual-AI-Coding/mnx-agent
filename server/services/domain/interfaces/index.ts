/**
 * Domain Service Interfaces
 *
 * Re-exports all domain service interfaces for backward compatibility.
 */

export type { IJobService } from './job.interface.js'
export type { ITaskService, TaskQueryFilter, TaskQueryResult } from './task.interface.js'
export type { IMediaService, MediaFilter, MediaQueryResult } from './media.interface.js'
export type { ILogService, LogFilter, LogStats } from './log.interface.js'
export type { IWebhookService } from './webhook.interface.js'
export type { IWorkflowService } from './workflow.interface.js'
export type { ICapacityService } from './capacity.interface.js'
