// ============================================
// Backend Types (snake_case - matches database API responses)
// ============================================

export interface BackendJob {
  id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  is_active: number | boolean
  workflow_id: string | null
  created_at: string
  updated_at: string
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_failures: number
}

// ============================================
// Enums
// ============================================

export enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum TriggerType {
  Cron = 'cron',
  Manual = 'manual',
  Retry = 'retry',
}

export enum ServiceType {
  Text = 'text',
  VoiceSync = 'voice_sync',
  VoiceAsync = 'voice_async',
  Image = 'image',
  Music = 'music',
  Video = 'video',
}

export enum WorkflowNodeType {
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Transform = 'transform',
}

// ============================================
// Core Interfaces
// ============================================

export interface CronJob {
  id: string
  name: string
  description: string
  cronExpression: string
  timezone: string
  isActive: boolean
  workflowId: string | null
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
  nextRunAt: string | null
  totalRuns: number
  totalFailures: number
}

export interface TaskQueueItem {
  id: string
  jobId: string
  taskType: string
  payload: Record<string, unknown>
  priority: number
  status: TaskStatus
  retryCount: number
  maxRetries: number
  errorMessage: string | null
  result: Record<string, unknown> | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface ExecutionLog {
  id: string
  jobId: string
  triggerType: TriggerType
  status: TaskStatus
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  tasksExecuted: number
  tasksSucceeded: number
  tasksFailed: number
  errorSummary: string | null
  logDetail: string | null
}

export interface CapacityRecord {
  id: string
  serviceType: ServiceType
  remainingQuota: number
  totalQuota: number
  resetAt: string
  lastCheckedAt: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  nodesJson: string
  edgesJson: string
  createdAt: string
  isTemplate: boolean
}

// ============================================
// Workflow Editor Types
// ============================================

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position: { x: number; y: number }
  data: {
    label: string
    config: Record<string, unknown>
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface WorkflowState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export interface CreateCronJobDTO {
  name: string
  description: string
  cronExpression: string
  timezone?: string
  workflowId: string
  isActive?: boolean
}

export interface UpdateCronJobDTO {
  name?: string
  description?: string
  cronExpression?: string
  timezone?: string
  workflowId?: string
  isActive?: boolean
}

export interface CreateTaskDTO {
  jobId: string
  taskType: string
  payload: Record<string, unknown>
  priority?: number
  maxRetries?: number
}

export interface UpdateTaskDTO {
  status?: TaskStatus
  retryCount?: number
  errorMessage?: string | null
  result?: Record<string, unknown> | null
  startedAt?: string | null
  completedAt?: string | null
}

export interface ActionNodeConfig {
  service: string
  method: string
  args?: unknown[]
}

// API response types for available action nodes
export interface AvailableActionNode {
  id: string
  service: string
  method: string
  label: string
  minRole: string
}

export interface GroupedActionNodes {
  [category: string]: AvailableActionNode[]
}

export interface UpdateWorkflowTemplateDTO {
  name?: string
  description?: string
  nodesJson?: string
  edgesJson?: string
}

export interface TaskQueueFilter {
  status?: TaskStatus
  jobId?: string
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface CronJobListResponse extends PaginatedResponse<CronJob> {}
export interface TaskQueueListResponse extends PaginatedResponse<TaskQueueItem> {}
export interface ExecutionLogListResponse extends PaginatedResponse<ExecutionLog> {}

// ============================================
// Helper Type Guards
// ============================================

export function isTaskStatus(value: string): value is TaskStatus {
  return Object.values(TaskStatus).includes(value as TaskStatus)
}

export function isTriggerType(value: string): value is TriggerType {
  return Object.values(TriggerType).includes(value as TriggerType)
}

export function isServiceType(value: string): value is ServiceType {
  return Object.values(ServiceType).includes(value as ServiceType)
}