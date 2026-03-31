/**
 * TypeScript types for the MiniMax cron task management database
 */

// ============================================================================
// Enums
// ============================================================================

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TriggerType {
  CRON = 'cron',
  MANUAL = 'manual',
  RETRY = 'retry',
}

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

// ============================================================================
// Core Entities
// ============================================================================

export interface CronJob {
  id: string
  name: string
  description: string | null
  cron_expression: string
  is_active: boolean
  workflow_json: string
  created_at: string
  updated_at: string
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_failures: number
}

export interface TaskQueueItem {
  id: string
  job_id: string | null
  task_type: string
  payload: string
  priority: number
  status: TaskStatus
  retry_count: number
  max_retries: number
  error_message: string | null
  result: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface ExecutionLog {
  id: string
  job_id: string | null
  trigger_type: TriggerType
  status: ExecutionStatus
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  tasks_executed: number
  tasks_succeeded: number
  tasks_failed: number
  error_summary: string | null
  log_detail: string | null
}

export interface CapacityRecord {
  id: string
  service_type: string
  remaining_quota: number
  total_quota: number
  reset_at: string | null
  last_checked_at: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  created_at: string
  is_template: boolean
}

// ============================================================================
// Create DTOs (for inserting new records)
// ============================================================================

export interface CreateCronJob {
  name: string
  description?: string | null
  cron_expression: string
  is_active?: boolean
  workflow_json: string
}

export interface CreateTaskQueueItem {
  job_id?: string | null
  task_type: string
  payload: string
  priority?: number
  status?: TaskStatus
  max_retries?: number
}

export interface CreateExecutionLog {
  job_id?: string | null
  trigger_type: TriggerType
  status: ExecutionStatus
  tasks_executed?: number
  tasks_succeeded?: number
  tasks_failed?: number
  error_summary?: string | null
  log_detail?: string | null
}

export interface CreateCapacityRecord {
  service_type: string
  remaining_quota: number
  total_quota: number
  reset_at?: string | null
}

export interface CreateWorkflowTemplate {
  name: string
  description?: string | null
  nodes_json: string
  edges_json: string
  is_template?: boolean
}

// ============================================================================
// Update DTOs (for partial updates)
// ============================================================================

export interface UpdateCronJob {
  name?: string
  description?: string | null
  cron_expression?: string
  is_active?: boolean
  workflow_json?: string
  last_run_at?: string | null
  next_run_at?: string | null
  total_runs?: number
  total_failures?: number
}

export interface UpdateTaskQueueItem {
  status?: TaskStatus
  retry_count?: number
  error_message?: string | null
  result?: string | null
  started_at?: string | null
  completed_at?: string | null
}

export interface UpdateExecutionLog {
  status?: ExecutionStatus
  completed_at?: string | null
  duration_ms?: number | null
  tasks_executed?: number
  tasks_succeeded?: number
  tasks_failed?: number
  error_summary?: string | null
  log_detail?: string | null
}

export interface UpdateCapacityRecord {
  remaining_quota?: number
  total_quota?: number
  reset_at?: string | null
}

export interface UpdateWorkflowTemplate {
  name?: string
  description?: string | null
  nodes_json?: string
  edges_json?: string
  is_template?: boolean
}

// ============================================================================
// Run Statistics DTO
// ============================================================================

export interface RunStats {
  success: boolean
  tasksExecuted: number
  tasksSucceeded: number
  tasksFailed: number
  durationMs: number
  errorSummary?: string | null
}

// ============================================================================
// Database Row Types (for raw SQL results)
// ============================================================================

export interface CronJobRow {
  id: string
  name: string
  description: string | null
  cron_expression: string
  is_active: number
  workflow_json: string
  created_at: string
  updated_at: string
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_failures: number
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
  error_message: string | null
  result: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface ExecutionLogRow {
  id: string
  job_id: string | null
  trigger_type: string
  status: string
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  tasks_executed: number
  tasks_succeeded: number
  tasks_failed: number
  error_summary: string | null
  log_detail: string | null
}

export interface CapacityRecordRow {
  id: string
  service_type: string
  remaining_quota: number
  total_quota: number
  reset_at: string | null
  last_checked_at: string
}

export interface WorkflowTemplateRow {
  id: string
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  created_at: string
  is_template: number
}

export interface MigrationRow {
  id: number
  name: string
  executed_at: string
}