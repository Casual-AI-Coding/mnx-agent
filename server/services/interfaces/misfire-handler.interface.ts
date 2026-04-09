// server/services/interfaces/misfire-handler.interface.ts

import type { CronJob } from '../../database/types'

/**
 * Callback type for executing a job during misfire catch-up.
 */
export type ExecuteJobCallback = (job: CronJob) => Promise<void>

export interface IMisfireHandler {
  /**
   * Set the callback for executing jobs during misfire catch-up.
   * Called by CronScheduler after both services are instantiated.
   */
  setExecuteJobCallback(callback: ExecuteJobCallback): void
  
  /**
   * Handle a single misfired job according to its misfire policy.
   */
  handleMisfire(job: CronJob): Promise<void>
  
  /**
   * Check all active jobs for misfires and handle them asynchronously.
   */
  checkAndHandleMisfires(jobs: CronJob[]): Promise<void>
}