import cron, { ScheduledTask } from 'node-cron'
import type { DatabaseService } from '../database'
import { WorkflowResult } from './workflow-engine'
import { 
  CronJob, 
  CreateExecutionLog, 
  ExecutionStatus,
  TriggerType 
} from '../database/types'

export type { DatabaseService }

export interface WorkflowEngine {
  executeWorkflow(workflowJson: string): Promise<WorkflowResult>
}

export interface CronSchedulerOptions {
  timezone?: string
}

export class CronScheduler {
  private jobs: Map<string, ScheduledTask> = new Map()
  private db: DatabaseService
  private workflowEngine: WorkflowEngine
  private timezone: string

  constructor(db: DatabaseService, workflowEngine: WorkflowEngine, options?: CronSchedulerOptions) {
    this.db = db
    this.workflowEngine = workflowEngine
    this.timezone = options?.timezone ?? process.env.CRON_TIMEZONE ?? 'Asia/Shanghai'
  }

  async init(): Promise<void> {
    console.log('[CronScheduler] Initializing...')
    
    const activeJobs = await this.db.getActiveCronJobs()
    console.log(`[CronScheduler] Found ${activeJobs.length} active jobs`)
    
    for (const job of activeJobs) {
      try {
        this.scheduleJob(job)
        console.log(`[CronScheduler] Scheduled job "${job.name}" (${job.id}) with expression: ${job.cron_expression}`)
      } catch (error) {
        console.error(`[CronScheduler] Failed to schedule job "${job.name}" (${job.id}):`, error)
      }
    }
    
    console.log('[CronScheduler] Initialization complete')
  }

  scheduleJob(job: CronJob): void {
    if (!cron.validate(job.cron_expression)) {
      throw new Error(`Invalid cron expression for job ${job.id}: ${job.cron_expression}`)
    }

    if (this.jobs.has(job.id)) {
      this.unscheduleJob(job.id)
    }

    const task = cron.schedule(
      job.cron_expression,
      async () => {
        await this.executeJobTick(job)
      },
      { timezone: this.timezone }
    )

    this.jobs.set(job.id, task)
    console.log(`[CronScheduler] Job "${job.name}" (${job.id}) scheduled successfully`)
  }

  private async executeJobTick(job: CronJob): Promise<void> {
    const startTime = Date.now()
    const startedAt = new Date().toISOString()
    
    const log = await this.db.createExecutionLog({
      job_id: job.id,
      trigger_type: TriggerType.CRON,
      status: ExecutionStatus.RUNNING,
      tasks_executed: 0,
      tasks_succeeded: 0,
      tasks_failed: 0,
    })

    console.log(`[CronScheduler] Executing job "${job.name}" (${job.id}) at ${startedAt}`)

    try {
      const result = await this.workflowEngine.executeWorkflow(job.workflow_json)
      
      const endTime = Date.now()
      const durationMs = endTime - startTime
      const completedAt = new Date().toISOString()
      
      const tasksExecuted = result.nodeResults.size
      let tasksSucceeded = 0
      let tasksFailed = 0
      for (const nodeResult of result.nodeResults.values()) {
        if (nodeResult.success) tasksSucceeded++
        else tasksFailed++
      }
      
      await this.db.updateExecutionLog(log.id, {
        status: result.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
        completed_at: completedAt,
        duration_ms: durationMs,
        tasks_executed: tasksExecuted,
        tasks_succeeded: tasksSucceeded,
        tasks_failed: tasksFailed,
        error_summary: result.error ?? null,
      })

      const newTotalRuns = job.total_runs + 1
      const newTotalFailures = result.success ? job.total_failures : job.total_failures + 1
      
      await this.db.updateCronJob(job.id, {
        last_run_at: completedAt,
        total_runs: newTotalRuns,
        total_failures: newTotalFailures,
      })

      console.log(`[CronScheduler] Job "${job.name}" (${job.id}) completed in ${durationMs}ms - success: ${result.success}`)
    } catch (error) {
      const endTime = Date.now()
      const durationMs = endTime - startTime
      const completedAt = new Date().toISOString()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      console.error(`[CronScheduler] Job "${job.name}" (${job.id}) failed with error:`, errorMessage)

      try {
        await this.db.updateExecutionLog(log.id, {
          status: ExecutionStatus.FAILED,
          completed_at: completedAt,
          duration_ms: durationMs,
          error_summary: errorMessage,
        })

        await this.db.updateCronJob(job.id, {
          last_run_at: completedAt,
          total_runs: job.total_runs + 1,
          total_failures: job.total_failures + 1,
        })
      } catch (dbError) {
        console.error(`[CronScheduler] Failed to update database after job failure:`, dbError)
      }
    }
  }

  unscheduleJob(jobId: string): boolean {
    const task = this.jobs.get(jobId)
    
    if (!task) {
      console.warn(`[CronScheduler] Job ${jobId} not found in scheduler`)
      return false
    }

    try {
      task.stop()
      this.jobs.delete(jobId)
      console.log(`[CronScheduler] Job ${jobId} unscheduled successfully`)
      return true
    } catch (error) {
      console.error(`[CronScheduler] Error unscheduling job ${jobId}:`, error)
      return false
    }
  }

  async rescheduleJob(jobId: string): Promise<boolean> {
    this.unscheduleJob(jobId)

    const job = await this.db.getCronJobById(jobId)
    
    if (!job) {
      console.warn(`[CronScheduler] Job ${jobId} not found in database`)
      return false
    }

    if (!job.is_active) {
      console.log(`[CronScheduler] Job ${jobId} is inactive, not scheduling`)
      return false
    }

    try {
      this.scheduleJob(job)
      return true
    } catch (error) {
      console.error(`[CronScheduler] Failed to reschedule job ${jobId}:`, error)
      return false
    }
  }

  getAllScheduledJobs(): string[] {
    return Array.from(this.jobs.keys())
  }

  isJobScheduled(jobId: string): boolean {
    return this.jobs.has(jobId)
  }

  stopAll(): void {
    console.log(`[CronScheduler] Stopping all scheduled jobs (${this.jobs.size} jobs)`)
    
    for (const [jobId, task] of Array.from(this.jobs.entries())) {
      try {
        task.stop()
        console.log(`[CronScheduler] Stopped job ${jobId}`)
      } catch (error) {
        console.error(`[CronScheduler] Error stopping job ${jobId}:`, error)
      }
    }
    
    this.jobs.clear()
    console.log('[CronScheduler] All jobs stopped')
  }

  getJobCount(): number {
    return this.jobs.size
  }

  getTimezone(): string {
    return this.timezone
  }
}

let schedulerInstance: CronScheduler | null = null

export function getCronScheduler(db: DatabaseService, workflowEngine: WorkflowEngine, options?: CronSchedulerOptions): CronScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new CronScheduler(db, workflowEngine, options)
  }
  return schedulerInstance
}

export function resetCronScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stopAll()
    schedulerInstance = null
  }
}