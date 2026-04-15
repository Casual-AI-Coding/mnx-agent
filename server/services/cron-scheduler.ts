import cron, { ScheduledTask } from 'node-cron'
import { CronExpressionParser } from 'cron-parser'
import type { DatabaseService } from '../database/service-async.js'
import type { WorkflowResult } from './workflow/types.js'
import type { ITaskExecutor } from '../types/task.js'
import type { NotificationService } from './notification-service.js'
import type { IEventBus } from './interfaces/event-bus.interface.js'
import type { IConcurrencyManager } from './interfaces/concurrency-manager.interface.js'
import type { IMisfireHandler } from './interfaces/misfire-handler.interface.js'
import { 
  CronJob, 
  CreateExecutionLog, 
  ExecutionStatus,
  TriggerType,
} from '../database/types'
import { TASK_TIMEOUTS } from '../config/timeouts.js'
import { toLocalISODateString } from '../lib/date-utils.js'

export type { DatabaseService }

export interface TestExecutionOptions {
  testData?: Record<string, { mockResponse?: unknown; mockInput?: unknown }>
  dryRun?: boolean
}

export interface WorkflowEngine {
  executeWorkflow(workflowJson: string, executionLogId?: string, taskExecutor?: ITaskExecutor, options?: TestExecutionOptions): Promise<WorkflowResult>
  pauseExecution(executionId: string): Promise<void>
  resumeExecution(executionId: string): Promise<void>
}

export interface CronSchedulerOptions {
  timezone?: string
  defaultTimeoutMs?: number
}

export class CronScheduler {
  private jobs: Map<string, ScheduledTask> = new Map()
  private db: DatabaseService
  private workflowEngine: WorkflowEngine
  private taskExecutor: ITaskExecutor | null = null
  private notificationService: NotificationService | null = null
  private eventBus: IEventBus
  private concurrencyManager: IConcurrencyManager
  private misfireHandler: IMisfireHandler | undefined
  private timezone: string
  private defaultTimeoutMs: number

  constructor(
    db: DatabaseService,
    workflowEngine: WorkflowEngine,
    taskExecutor: ITaskExecutor | null,
    notificationService: NotificationService | null,
    eventBus: IEventBus,
    concurrencyManager: IConcurrencyManager,
    misfireHandler?: IMisfireHandler,
    options?: CronSchedulerOptions
  ) {
    this.db = db
    this.workflowEngine = workflowEngine
    this.taskExecutor = taskExecutor
    this.notificationService = notificationService
    this.eventBus = eventBus
    this.concurrencyManager = concurrencyManager
    this.misfireHandler = misfireHandler
    this.timezone = options?.timezone ?? process.env.CRON_TIMEZONE ?? 'Asia/Shanghai'
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? TASK_TIMEOUTS.DEFAULT_CRON_MS
  }

  setMisfireHandler(handler: IMisfireHandler): void {
    this.misfireHandler = handler
  }

  getMisfireHandler(): IMisfireHandler | undefined {
    return this.misfireHandler
  }

  async init(): Promise<void> {
    const activeJobs = await this.db.getActiveCronJobs()
    
    for (const job of activeJobs) {
      try {
        await this.scheduleJob(job)
      } catch (error) {
        console.error(`[CronScheduler] Failed to schedule job "${job.name}" (${job.id}):`, error)
      }
    }

    await this.misfireHandler!.checkAndHandleMisfires(activeJobs)
  }

  calculateNextRun(expression: string): Date | null {
    try {
      const interval = CronExpressionParser.parse(expression, { tz: this.timezone })
      return interval.next().toDate()
    } catch {
      return null
    }
  }

  async scheduleJob(job: CronJob): Promise<void> {
    if (!cron.validate(job.cron_expression)) {
      throw new Error(`Invalid cron expression for job ${job.id}: ${job.cron_expression}`)
    }

    if (this.jobs.has(job.id)) {
      this.unscheduleJob(job.id)
    }

    // Calculate and save next_run_at
    const nextRun = this.calculateNextRun(job.cron_expression)
    if (nextRun) {
      await this.db.updateCronJob(job.id, { next_run_at: toLocalISODateString(nextRun) })
    }

    const task = cron.schedule(
      job.cron_expression,
      async () => {
        await this.executeJobTick(job)
        // Update next_run_at after execution
        const nextRunAfter = this.calculateNextRun(job.cron_expression)
        if (nextRunAfter) {
          await this.db.updateCronJob(job.id, { next_run_at: toLocalISODateString(nextRunAfter) })
        }
      },
      { timezone: this.timezone }
    )

    this.jobs.set(job.id, task)
  }

  async executeJobTick(job: CronJob): Promise<void> {
    // Check for shutdown
    if (this.concurrencyManager.isShuttingDown()) {
      return
    }

    // Check concurrent execution limit
    if (!(await this.concurrencyManager.acquireSlot(job.id))) {
      console.warn(`[CronScheduler] Job "${job.name}" (${job.id}) skipped due to concurrency limit`)
      return
    }

    const startTime = Date.now()
    const startedAt = toLocalISODateString()
    
    let log: { id: string } | null = null
    let executionSuccess = false
    let durationMs = 0
    
    try {
      log = await this.db.createExecutionLog({
        job_id: job.id,
        trigger_type: TriggerType.CRON,
        status: ExecutionStatus.RUNNING,
        tasks_executed: 0,
        tasks_succeeded: 0,
        tasks_failed: 0,
      })

      // Notify on_start
      await this.notificationService?.notifyJobEvent(job.id, 'on_start', {
        jobId: job.id,
        jobName: job.name,
        timestamp: toLocalISODateString(),
      }).catch(err => console.error('[CronScheduler] Failed to send on_start notification:', err))

      // Execute with timeout
      // Fetch workflow template if workflow_id is set
      let workflowJson: string
      if (job.workflow_id) {
        const template = await this.db.getWorkflowTemplateById(job.workflow_id, job.owner_id ?? undefined)
        if (!template) {
          throw new Error(`Workflow template ${job.workflow_id} not found`)
        }
        
        // Handle JSONB columns that may already be objects
        const nodes = typeof template.nodes_json === 'string' 
          ? JSON.parse(template.nodes_json) 
          : template.nodes_json
        const edges = typeof template.edges_json === 'string' 
          ? JSON.parse(template.edges_json) 
          : template.edges_json
        
        workflowJson = JSON.stringify({ nodes, edges })
      } else {
        throw new Error(`Job ${job.id} has no workflow_id configured`)
      }
      
      const result = await this.executeWithTimeout(
        () => this.workflowEngine.executeWorkflow(workflowJson, log?.id, this.taskExecutor || undefined),
        job.timeout_ms || this.defaultTimeoutMs
      )
      
      const endTime = Date.now()
      durationMs = endTime - startTime
      executionSuccess = result.success
      const completedAt = toLocalISODateString()
      
      const tasksExecuted = result.nodeResults.size
      let tasksSucceeded = 0
      let tasksFailed = 0
      for (const nodeResult of result.nodeResults.values()) {
        if (nodeResult.success) tasksSucceeded++
        else tasksFailed++
      }
      
      if (log) {
        await this.db.updateExecutionLog(log.id, {
          status: result.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
          completed_at: completedAt,
          duration_ms: durationMs,
          tasks_executed: tasksExecuted,
          tasks_succeeded: tasksSucceeded,
          tasks_failed: tasksFailed,
          error_summary: result.error ?? null,
        })
      }

      const newTotalRuns = job.total_runs + 1
      const newTotalFailures = result.success ? job.total_failures : job.total_failures + 1
      
      await this.db.updateCronJob(job.id, {
        last_run_at: completedAt,
        total_runs: newTotalRuns,
        total_failures: newTotalFailures,
      })

      // Notify on_success
      await this.notificationService?.notifyJobEvent(job.id, 'on_success', {
        jobId: job.id,
        jobName: job.name,
        duration: durationMs,
        timestamp: toLocalISODateString(),
      }).catch(err => console.error('[CronScheduler] Failed to send on_success notification:', err))
    } catch (error) {
      const endTime = Date.now()
      durationMs = endTime - startTime
      executionSuccess = false
      const completedAt = toLocalISODateString()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      console.error(`[CronScheduler] Job "${job.name}" (${job.id}) failed with error:`, errorMessage)

      try {
        if (log) {
          await this.db.updateExecutionLog(log.id, {
            status: ExecutionStatus.FAILED,
            completed_at: completedAt,
            duration_ms: durationMs,
            error_summary: errorMessage,
          })
        }

        await this.db.updateCronJob(job.id, {
          last_run_at: completedAt,
          total_runs: job.total_runs + 1,
          total_failures: job.total_failures + 1,
        })
      } catch (dbError) {
        console.error(`[CronScheduler] Failed to update database after job failure:`, dbError)
      }

      // Notify on_failure
      await this.notificationService?.notifyJobEvent(job.id, 'on_failure', {
        jobId: job.id,
        jobName: job.name,
        error: errorMessage,
        timestamp: toLocalISODateString(),
      }).catch(err => console.error('[CronScheduler] Failed to send on_failure notification:', err))
    } finally {
      this.concurrencyManager.releaseSlot(job.id)
      this.eventBus.emitJobExecuted(job.id, { success: executionSuccess, durationMs })
    }
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
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
      return false
    }

    try {
      await this.scheduleJob(job)
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
    for (const [jobId, task] of Array.from(this.jobs.entries())) {
      try {
        task.stop()
      } catch (error) {
        console.error(`[CronScheduler] Error stopping job ${jobId}:`, error)
      }
    }
    
    this.jobs.clear()
  }

  async gracefulShutdown(timeoutMs: number = 30000): Promise<void> {
    this.concurrencyManager.setShuttingDown(true)

    const startTime = Date.now()
    
    // Wait for running jobs to complete
    while (this.concurrencyManager.getRunningCount() > 0) {
      const elapsed = Date.now() - startTime
      const remaining = timeoutMs - elapsed
      
      if (remaining <= 0) {
        console.warn(`[CronScheduler] Graceful shutdown timed out with ${this.concurrencyManager.getRunningCount()} jobs still running`)
        break
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Force stop remaining jobs
    this.stopAll()
    this.concurrencyManager.setShuttingDown(false)
  }

  getRunningJobs(): Set<string> {
    return this.concurrencyManager.getRunningJobs()
  }

  getRunningJobCount(): number {
    return this.concurrencyManager.getRunningCount()
  }

  getJobCount(): number {
    return this.jobs.size
  }

  getTimezone(): string {
    return this.timezone
  }

  async executeJobNow(jobId: string): Promise<void> {
    const job = await this.db.getCronJobById(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }
    await this.executeJobTick(job)
  }

  async pauseExecution(executionId: string): Promise<void> {
    await this.workflowEngine.pauseExecution(executionId)
  }

  async resumeExecution(executionId: string): Promise<void> {
    await this.workflowEngine.resumeExecution(executionId)
  }
}
