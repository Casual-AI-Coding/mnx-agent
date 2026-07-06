import cron, { ScheduledTask } from 'node-cron'
import { CronExpressionParser } from 'cron-parser'
import type { WorkflowResult } from './workflow/types.js'
import type { UpdateExecutionLog } from '../database/types.js'
import type { ITaskExecutor } from '../types/task.js'
import type { NotificationService } from './notification-service.js'
import type { IEventBus } from './interfaces/event-bus.interface.js'
import type { IConcurrencyManager } from './interfaces/concurrency-manager.interface.js'
import type { IMisfireHandler } from './interfaces/misfire-handler.interface.js'
import { 
  CronJob, 
  ExecutionStatus,
  TriggerType,
} from '../database/types'
import { TASK_TIMEOUTS } from '../config/timeouts.js'
import { toLocalISODateString } from '../lib/date-utils.js'
import { getLogger } from '../lib/logger.js'
import { getJobService, getLogService, getWorkflowService } from '../service-registration.js'

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

interface ExecutionContext {
  startTime: number
  logId: string | null
}

interface ExecutionOutcome {
  success: boolean
  durationMs: number
}

interface WorkflowExecutionData {
  result: WorkflowResult
  durationMs: number
}

interface ExecutionStats {
  tasksExecuted: number
  tasksSucceeded: number
  tasksFailed: number
}

export class CronScheduler {
  private jobs: Map<string, ScheduledTask> = new Map()
  private workflowEngine: WorkflowEngine
  private taskExecutor: ITaskExecutor | null = null
  private notificationService: NotificationService | null = null
  private eventBus: IEventBus
  private concurrencyManager: IConcurrencyManager
  private misfireHandler: IMisfireHandler | undefined
  private timezone: string
  private defaultTimeoutMs: number
  private log = getLogger().child({ component: 'CronScheduler' })

  constructor(
    workflowEngine: WorkflowEngine,
    taskExecutor: ITaskExecutor | null,
    notificationService: NotificationService | null,
    eventBus: IEventBus,
    concurrencyManager: IConcurrencyManager,
    misfireHandler?: IMisfireHandler,
    options?: CronSchedulerOptions
  ) {
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
    const activeJobs = await getJobService().getActive()
    
    for (const job of activeJobs) {
      try {
        await this.scheduleJob(job)
      } catch (error) {
        this.log.error(error, 'Failed to schedule job: %s (%s)', job.name, job.id)
      }
    }

    if (this.misfireHandler) {
      await this.misfireHandler.checkAndHandleMisfires(activeJobs)
    }
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
      await getJobService().update(job.id, { next_run_at: toLocalISODateString(nextRun) })
    }

    const task = cron.schedule(
      job.cron_expression,
      async () => {
        await this.executeJobTick(job)
        // Update next_run_at after execution
        const nextRunAfter = this.calculateNextRun(job.cron_expression)
        if (nextRunAfter) {
          await getJobService().update(job.id, { next_run_at: toLocalISODateString(nextRunAfter) })
        }
      },
      { timezone: this.timezone }
    )

    this.jobs.set(job.id, task)
  }

  async executeJobTick(job: CronJob): Promise<void> {
    if (this.concurrencyManager.isShuttingDown()) {
      return
    }

    if (!(await this.tryAcquireExecutionSlot(job))) {
      return
    }

    const context = await this.handleExecutionStart(job)
    let outcome: ExecutionOutcome = { success: false, durationMs: 0 }

    try {
      const executionData = await this.executeJobWorkflow(job, context)
      await this.handleExecutionSuccess(job, context, executionData)
      outcome = { success: executionData.result.success, durationMs: executionData.durationMs }
    } catch (error) {
      outcome = await this.handleExecutionFailure(job, context, error)
    } finally {
      this.finalizeExecution(job, outcome)
    }
  }

  private async tryAcquireExecutionSlot(job: CronJob): Promise<boolean> {
    if (await this.concurrencyManager.acquireSlot(job.id)) {
      return true
    }

    this.log.warn('Job skipped due to concurrency limit: %s (%s)', job.name, job.id)
    return false
  }

  private async handleExecutionStart(job: CronJob): Promise<ExecutionContext> {
    const log = await getLogService().create({
      job_id: job.id,
      trigger_type: TriggerType.CRON,
      status: ExecutionStatus.RUNNING,
      tasks_executed: 0,
      tasks_succeeded: 0,
      tasks_failed: 0,
    }, job.owner_id ?? undefined)

    await this.notifyJobEvent(job, 'on_start', {
      jobId: job.id,
      jobName: job.name,
      timestamp: toLocalISODateString(),
    })

    return {
      startTime: Date.now(),
      logId: log.id,
    }
  }

  private async executeJobWorkflow(job: CronJob, context: ExecutionContext): Promise<WorkflowExecutionData> {
    const workflowJson = await this.getWorkflowJson(job)
    const result = await this.executeWithTimeout(
      () => this.workflowEngine.executeWorkflow(workflowJson, context.logId ?? undefined, this.taskExecutor || undefined),
      job.timeout_ms || this.defaultTimeoutMs
    )

    return {
      result,
      durationMs: Date.now() - context.startTime,
    }
  }

  private async getWorkflowJson(job: CronJob): Promise<string> {
    if (!job.workflow_id) {
      throw new Error(`Job ${job.id} has no workflow_id configured`)
    }

    const template = await getWorkflowService().getById(job.workflow_id, job.owner_id ?? undefined)
    if (!template) {
      throw new Error(`Workflow template ${job.workflow_id} not found`)
    }

    const nodes = typeof template.nodes_json === 'string'
      ? JSON.parse(template.nodes_json)
      : template.nodes_json
    const edges = typeof template.edges_json === 'string'
      ? JSON.parse(template.edges_json)
      : template.edges_json

    return JSON.stringify({ nodes, edges })
  }

  private async handleExecutionSuccess(
    job: CronJob,
    context: ExecutionContext,
    executionData: WorkflowExecutionData
  ): Promise<void> {
    const stats = this.buildExecutionStats(executionData.result)
    const completedAt = toLocalISODateString()

    await this.updateExecutionLog(context.logId, {
      status: executionData.result.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
      completed_at: completedAt,
      duration_ms: executionData.durationMs,
      tasks_executed: stats.tasksExecuted,
      tasks_succeeded: stats.tasksSucceeded,
      tasks_failed: stats.tasksFailed,
      error_summary: executionData.result.error ?? null,
    })

    await getJobService().updateRunStats(job.id, {
      success: executionData.result.success,
      tasksExecuted: stats.tasksExecuted,
      tasksSucceeded: stats.tasksSucceeded,
      tasksFailed: stats.tasksFailed,
      durationMs: executionData.durationMs,
      errorSummary: executionData.result.error ?? undefined,
    }, job.owner_id ?? undefined)

    await this.notifyJobEvent(job, 'on_success', {
      jobId: job.id,
      jobName: job.name,
      duration: executionData.durationMs,
      timestamp: toLocalISODateString(),
    })
  }

  private buildExecutionStats(result: WorkflowResult): ExecutionStats {
    let tasksSucceeded = 0
    let tasksFailed = 0

    for (const nodeResult of result.nodeResults.values()) {
      if (nodeResult.success) {
        tasksSucceeded++
      } else {
        tasksFailed++
      }
    }

    return {
      tasksExecuted: result.nodeResults.size,
      tasksSucceeded,
      tasksFailed,
    }
  }

  private async handleExecutionFailure(
    job: CronJob,
    context: ExecutionContext,
    error: unknown
  ): Promise<ExecutionOutcome> {
    const durationMs = Date.now() - context.startTime
    const completedAt = toLocalISODateString()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    this.log.error({ error: errorMessage }, 'Job execution failed: %s (%s)', job.name, job.id)

    try {
      await this.updateExecutionLog(context.logId, {
        status: ExecutionStatus.FAILED,
        completed_at: completedAt,
        duration_ms: durationMs,
        error_summary: errorMessage,
      })

      await getJobService().updateRunStats(job.id, {
        success: false,
        tasksExecuted: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        durationMs,
        errorSummary: errorMessage,
      }, job.owner_id ?? undefined)
    } catch (dbError) {
      this.log.error(dbError, 'Failed to update database after job failure')
    }

    await this.notifyJobEvent(job, 'on_failure', {
      jobId: job.id,
      jobName: job.name,
      error: errorMessage,
      timestamp: toLocalISODateString(),
    })

    return { success: false, durationMs }
  }

  private async updateExecutionLog(
    logId: string | null,
    update: UpdateExecutionLog
  ): Promise<void> {
    if (!logId) {
      return
    }

    await getLogService().update(logId, update)
  }

  private async notifyJobEvent(
    job: CronJob,
    event: 'on_start' | 'on_success' | 'on_failure',
    payload: Record<string, string | number>
  ): Promise<void> {
    await this.notificationService?.notifyJobEvent(job.id, event, payload)
      .catch(err => this.log.error(err, 'Failed to send %s notification', event))
  }

  private finalizeExecution(job: CronJob, outcome: ExecutionOutcome): void {
    this.concurrencyManager.releaseSlot(job.id)
    this.eventBus.emitJobExecuted(job.id, { ...outcome, ownerId: job.owner_id ?? undefined })
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
      this.log.warn('Job not found in scheduler: %s', jobId)
      return false
    }

    try {
      task.stop()
      this.jobs.delete(jobId)
      return true
    } catch (error) {
      this.log.error(error, 'Error unscheduling job: %s', jobId)
      return false
    }
  }

  async rescheduleJob(jobId: string): Promise<boolean> {
    this.unscheduleJob(jobId)

    const job = await getJobService().getById(jobId)
    
    if (!job) {
      this.log.warn('Job not found in database: %s', jobId)
      return false
    }

    if (!job.is_active) {
      return false
    }

    try {
      await this.scheduleJob(job)
      return true
    } catch (error) {
      this.log.error(error, 'Failed to reschedule job: %s', jobId)
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
        this.log.error(error, 'Error stopping job: %s', jobId)
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
        this.log.warn('Graceful shutdown timed out with %d jobs still running', this.concurrencyManager.getRunningCount())
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
    const job = await getJobService().getById(jobId)
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
