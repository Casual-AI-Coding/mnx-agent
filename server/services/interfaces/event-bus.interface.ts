export interface IEventBus {
  emitJobCreated(job: unknown): void
  emitJobUpdated(job: unknown): void
  emitJobDeleted(jobId: string): void
  emitJobToggled(job: unknown): void
  emitJobExecuted(jobId: string, result: { success: boolean; durationMs: number }): void
  emitTaskCreated(task: unknown): void
  emitTaskUpdated(task: unknown): void
  emitTaskCompleted(task: unknown): void
  emitTaskFailed(task: unknown): void
  emitTaskMovedToDLQ(task: unknown, error: string): void
  emitLogCreated(log: unknown): void
  emitLogUpdated(log: unknown): void
  emitWorkflowTestStarted(workflowId: string, executionId: string): void
  emitWorkflowTestCompleted(workflowId: string, executionId: string, result: unknown, error?: string): void
  emitWorkflowNodeOutput(nodeId: string, output: unknown, executionId: string): void
  emitWorkflowNodeStart(nodeId: string, executionId: string, workflowId?: string): void
  emitWorkflowNodeComplete(nodeId: string, executionId: string, result: unknown, durationMs: number): void
  emitWorkflowNodeError(nodeId: string, executionId: string, error: string): void
}