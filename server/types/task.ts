/**
 * Shared Task Types
 * 
 * Centralizes task-related interfaces to eliminate duplicate definitions
 * and break type-only circular dependencies.
 */

/**
 * Result of a task execution
 */
export interface TaskResult {
  success: boolean
  data?: unknown
  error?: string
  durationMs: number
}

/**
 * Interface for task executors
 * 
 * Implementations: TaskExecutor class in services/task-executor.ts
 */
export interface ITaskExecutor {
  executeTask(taskType: string, payload: Record<string, unknown>): Promise<TaskResult>
}