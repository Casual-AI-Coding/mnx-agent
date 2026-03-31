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
  WEBHOOK = 'webhook',
}

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

export enum WebhookEvent {
  ON_START = 'on_start',
  ON_SUCCESS = 'on_success',
  ON_FAILURE = 'on_failure',
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
  timeout_ms: number | null
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
  error_message?: string | null
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

export interface ExecutionLogDetail {
  id: string
  log_id: string
  node_id: string | null
  node_type: string | null
  input_payload: string | null
  output_result: string | null
  error_message?: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
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
// Job Organization & Dependencies
// ============================================================================

export interface JobTag {
  id: string
  job_id: string
  tag: string
  created_at: string
}

export interface JobDependency {
  id: string
  job_id: string
  depends_on_job_id: string
  created_at: string
}

// ============================================================================
// Webhooks & Notifications
// ============================================================================

export interface WebhookConfig {
  id: string
  job_id: string | null
  name: string
  url: string
  events: WebhookEvent[]
  headers: Record<string, string> | null
  secret: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  execution_log_id: string | null
  event: string
  payload: string
  response_status: number | null
  response_body: string | null
  error_message?: string | null
  delivered_at: string
}

// ============================================================================
// Dead Letter Queue
// ============================================================================

export interface DeadLetterItem {
  id: string
  original_task_id: string | null
  job_id: string | null
  task_type: string
  payload: string
  error_message?: string | null
  failed_at: string
  retry_count: number
  resolved_at: string | null
  resolution: 'retried' | 'discarded' | 'manual' | null
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
  timeout_ms?: number
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

export interface CreateExecutionLogDetail {
  log_id: string
  node_id?: string | null
  node_type?: string | null
  input_payload?: string | null
  output_result?: string | null
  error_message?: string | null
  started_at?: string | null
  completed_at?: string | null
  duration_ms?: number | null
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

export interface CreateJobTag {
  job_id: string
  tag: string
}

export interface CreateJobDependency {
  job_id: string
  depends_on_job_id: string
}

export interface CreateWebhookConfig {
  job_id?: string | null
  name: string
  url: string
  events: WebhookEvent[]
  headers?: Record<string, string> | null
  secret?: string | null
  is_active?: boolean
}

export interface CreateWebhookDelivery {
  webhook_id: string
  execution_log_id: string | null
  event: string
  payload: string
  response_status: number | null
  response_body: string | null
  error_message?: string | null
}

export interface CreateDeadLetterItem {
  original_task_id?: string | null
  job_id?: string | null
  task_type: string
  payload: string
  error_message?: string | null
  retry_count?: number
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
  timeout_ms?: number
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

export interface UpdateWebhookConfig {
  name?: string
  url?: string
  events?: WebhookEvent[]
  headers?: Record<string, string> | null
  secret?: string | null
  is_active?: boolean
}

export interface UpdateDeadLetterItem {
  resolved_at?: string
  resolution?: 'retried' | 'discarded' | 'manual'
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
  timeout_ms: number | null
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

export interface ExecutionLogDetailRow {
  id: string
  log_id: string
  node_id: string | null
  node_type: string | null
  input_payload: string | null
  output_result: string | null
  error_message?: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
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

export interface JobTagRow {
  id: string
  job_id: string
  tag: string
  created_at: string
}

export interface JobDependencyRow {
  id: string
  job_id: string
  depends_on_job_id: string
  created_at: string
}

export interface WebhookConfigRow {
  id: string
  job_id: string | null
  name: string
  url: string
  events: string
  headers: string | null
  secret: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface WebhookDeliveryRow {
  id: string
  webhook_id: string
  execution_log_id: string | null
  event: string
  payload: string
  response_status: number | null
  response_body: string | null
  error_message?: string | null
  delivered_at: string
}

export interface DeadLetterItemRow {
  id: string
  original_task_id: string | null
  job_id: string | null
  task_type: string
  payload: string
  error_message?: string | null
  failed_at: string
  retry_count: number
  resolved_at: string | null
  resolution: string | null
}

export interface MigrationRow {
  id: number
  name: string
  executed_at: string
}

// ============================================================================
// Utility Types
// ============================================================================

export type JobWithTags = CronJob & { tags: string[] }
export type JobWithDependencies = CronJob & { 
  tags: string[]
  dependencies: string[] 
  dependents: string[]
}
