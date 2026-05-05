// server/services/misfire-handler.ts

import type { IMisfireHandler, ExecuteJobCallback } from './interfaces/misfire-handler.interface.js'
import type { CronJob } from '../database/types'
import { MisfirePolicy } from '../database/types'
import { getLogger } from '../lib/logger.js'

/**
 * Creates a fully initialized MisfireHandler with the callback set immediately.
 * This prevents temporal coupling issues where the callback might be called before being set.
 */
export function createMisfireHandler(callback: ExecuteJobCallback): MisfireHandler {
  const handler = new MisfireHandler()
  handler.setExecuteJobCallback(callback)
  return handler
}

export class MisfireHandler implements IMisfireHandler {
  private executeJobCallback: ExecuteJobCallback | null = null
  private log = getLogger().child({ component: 'MisfireHandler' })

  setExecuteJobCallback(callback: ExecuteJobCallback): void {
    this.executeJobCallback = callback
  }

  async handleMisfire(job: CronJob): Promise<void> {
    if (job.misfire_policy === MisfirePolicy.IGNORE) {
      this.log.info('Job "%s" (%s) misfire ignored per policy', job.name, job.id)
      return
    }

    if (!this.executeJobCallback) {
      this.log.error('No executeJobCallback set, cannot handle misfire for job "%s" (%s)', job.name, job.id)
      return
    }

    this.log.info('Misfire detected for job "%s" (%s), executing catch-up...', job.name, job.id)

    try {
      await this.executeJobCallback(job)
      this.log.info('Catch-up execution completed for job "%s" (%s)', job.name, job.id)
    } catch (error) {
      this.log.error(error, 'Catch-up execution failed for job "%s" (%s)', job.name, job.id)
    }

    if (job.misfire_policy === MisfirePolicy.FIRE_ALL) {
      this.log.warn('Job "%s" (%s) has fire_all policy but only single catch-up executed to prevent startup storm', job.name, job.id)
    }
  }

  async checkAndHandleMisfires(jobs: CronJob[]): Promise<void> {
    const now = new Date()
    const misfiredJobs: CronJob[] = []

    for (const job of jobs) {
      if (job.is_active && job.next_run_at) {
        const nextRun = new Date(job.next_run_at)
        if (nextRun < now) {
          misfiredJobs.push(job)
        }
      }
    }

    if (misfiredJobs.length === 0) {
      return
    }

    this.log.info('Detected %d misfired jobs, handling asynchronously...', misfiredJobs.length)

    const delayBetweenJobs = 500

    await Promise.all(
      misfiredJobs.map((job, index) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            void this.handleMisfire(job).then(resolve).catch(() => resolve())
          }, index * delayBetweenJobs)
        })
      })
    )
  }
}
