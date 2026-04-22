// server/services/misfire-handler.ts

import type { IMisfireHandler, ExecuteJobCallback } from './interfaces/misfire-handler.interface.js'
import type { CronJob } from '../database/types'
import { MisfirePolicy } from '../database/types'

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

  setExecuteJobCallback(callback: ExecuteJobCallback): void {
    this.executeJobCallback = callback
  }

  async handleMisfire(job: CronJob): Promise<void> {
    if (job.misfire_policy === MisfirePolicy.IGNORE) {
      console.info(`[MisfireHandler] Job "${job.name}" (${job.id}) misfire ignored per policy`)
      return
    }

    if (!this.executeJobCallback) {
      console.error(`[MisfireHandler] No executeJobCallback set, cannot handle misfire for job "${job.name}" (${job.id})`)
      return
    }

    console.info(`[MisfireHandler] Misfire detected for job "${job.name}" (${job.id}), executing catch-up...`)

    try {
      await this.executeJobCallback(job)
      console.info(`[MisfireHandler] Catch-up execution completed for job "${job.name}" (${job.id})`)
    } catch (error) {
      console.error(`[MisfireHandler] Catch-up execution failed for job "${job.name}" (${job.id}):`, error)
    }

    if (job.misfire_policy === MisfirePolicy.FIRE_ALL) {
      console.warn(`[MisfireHandler] Job "${job.name}" (${job.id}) has 'fire_all' policy but only single catch-up executed to prevent startup storm`)
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

    console.info(`[MisfireHandler] Detected ${misfiredJobs.length} misfired jobs, handling asynchronously...`)

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
