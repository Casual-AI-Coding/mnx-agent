import type { CronJob, TaskQueueItem, ExecutionLog } from '../../database/types.js'

export interface JobExecutionResult {
  success: boolean
  durationMs: number
}

export interface IEventBus {
  emitJobCreated(job: CronJob): void
  emitJobUpdated(job: CronJob): void
  emitJobDeleted(jobId: string): void
  emitJobToggled(job: CronJob): void
  emitJobExecuted(jobId: string, result: JobExecutionResult): void
  emitTaskCreated(task: TaskQueueItem): void
  emitTaskUpdated(task: TaskQueueItem): void
  emitTaskCompleted(task: TaskQueueItem): void
  emitTaskFailed(task: TaskQueueItem): void
  emitTaskMovedToDLQ(task: TaskQueueItem, error: string): void
  emitLogCreated(log: ExecutionLog): void
  emitLogUpdated(log: ExecutionLog): void
  emitWorkflowTestStarted(workflowId: string, executionId: string): void
  emitWorkflowTestCompleted(workflowId: string, executionId: string, result: unknown, error?: string): void
  emitWorkflowNodeOutput(nodeId: string, output: unknown, executionId: string): void
  emitWorkflowNodeStart(nodeId: string, executionId: string, workflowId?: string): void
  emitWorkflowNodeComplete(nodeId: string, executionId: string, result: unknown, durationMs: number): void
  emitWorkflowNodeError(nodeId: string, executionId: string, error: string): void
}