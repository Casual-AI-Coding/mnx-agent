import { TaskStatus } from './enums.js'

export interface TaskQueueItem {
  id: string
  job_id: string | null
  task_type: string
  payload: string
  priority: number
  status: TaskStatus
  retry_count: number
  max_retries: number
  error_message?: string | null
  result: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  owner_id: string | null
}

export interface CreateTaskQueueItem {
  job_id?: string | null
  task_type: string
  payload: string
  priority?: number
  status?: TaskStatus
  max_retries?: number
}

export interface UpdateTaskQueueItem {
  status?: TaskStatus
  retry_count?: number
  error_message?: string | null
  result?: string | null
  started_at?: string | null
  completed_at?: string | null
}

export interface TaskQueueRow {
  id: string
  job_id: string | null
  task_type: string
  payload: string
  priority: number
  status: string
  retry_count: number
  max_retries: number
  error_message?: string | null
  result: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  owner_id: string | null
}

export interface DeadLetterQueueItem {
  id: string
  original_task_id: string | null
  job_id: string | null
  owner_id: string | null
  task_type: string
  payload: Record<string, unknown>
  error_message: string | null
  retry_count: number
  max_retries: number
  failed_at: string
  resolved_at: string | null
  resolution: string | null
  created_at: string
}

export interface DeadLetterQueueRow {
  id: string
  original_task_id: string | null
  job_id: string | null
  owner_id: string | null
  task_type: string
  payload: string
  error_message: string | null
  retry_count: number
  max_retries: number
  failed_at: string
  resolved_at: string | null
  resolution: string | null
  created_at: string
}

export interface CreateDeadLetterQueueItem {
  original_task_id?: string
  job_id?: string
  task_type: string
  payload: Record<string, unknown>
  error_message?: string
  retry_count?: number
  max_retries?: number
  owner_id?: string | null
}

export interface UpdateDeadLetterQueueItem {
  resolved_at?: string
  resolution?: string
  retry_count?: number
}

export interface RunStats {
  success: boolean
  tasksExecuted: number
  tasksSucceeded: number
  tasksFailed: number
  durationMs: number
  errorSummary?: string | null
}

export interface MigrationRow {
  id: number
  name: string
  executed_at: string
}