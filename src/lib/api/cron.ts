import { internalAxios } from './client'
import { createApiMethod } from './create-api-method'
import type {
  BackendJob,
  TaskQueueItem,
  ExecutionLog,
  ExecutionLogDetail,
  WorkflowTemplate,
  CreateCronJobDTO,
  UpdateCronJobDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  UpdateWorkflowTemplateDTO,
  TaskQueueFilter,
  DeadLetterQueueItem,
  WebhookConfig,
  WebhookDelivery,
  CreateWebhookConfig,
  UpdateWebhookConfig,
} from '@/types/cron'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface TasksResponse {
  tasks: TaskQueueItem[]
  total: number
}

interface WorkflowValidationResponse {
  valid: boolean
  errors?: string[]
}

const cronClient = internalAxios

// ============================================
// Cron Jobs API - Fixed endpoints to match backend
// ============================================

export function getCronJobs(): Promise<ApiResponse<{ jobs: BackendJob[]; total: number }>> {
  return createApiMethod<Record<string, never>, { jobs: BackendJob[]; total: number }>({
    method: 'GET',
    path: '/cron/jobs',
  })({})
}

export function createCronJob(job: CreateCronJobDTO): Promise<ApiResponse<BackendJob>> {
  const backendJob = {
    name: job.name,
    description: job.description,
    cron_expression: job.cronExpression,
    timezone: job.timezone ?? 'Asia/Shanghai',
    workflow_id: job.workflowId,
    is_active: job.isActive ?? true,
  }
  return createApiMethod<{ body: typeof backendJob }, BackendJob>({
    method: 'POST',
    path: '/cron/jobs',
  })({ body: backendJob })
}

export function getCronJob(id: string): Promise<ApiResponse<BackendJob>> {
  return createApiMethod<{ id: string }, BackendJob>({
    method: 'GET',
    path: '/cron/jobs/:id',
  })({ id })
}

export function updateCronJob(id: string, updates: UpdateCronJobDTO): Promise<ApiResponse<BackendJob>> {
  const backendUpdates: Record<string, unknown> = {}
  if (updates.name !== undefined) backendUpdates.name = updates.name
  if (updates.description !== undefined) backendUpdates.description = updates.description
  if (updates.cronExpression !== undefined) backendUpdates.cron_expression = updates.cronExpression
  if (updates.timezone !== undefined) backendUpdates.timezone = updates.timezone
  if (updates.workflowId !== undefined) backendUpdates.workflow_id = updates.workflowId
  if (updates.isActive !== undefined) backendUpdates.is_active = updates.isActive

  return createApiMethod<{ id: string; body: Record<string, unknown> }, BackendJob>({
    method: 'PUT',
    path: '/cron/jobs/:id',
  })({ id, body: backendUpdates })
}

export function deleteCronJob(id: string): Promise<ApiResponse<void>> {
  return createApiMethod<{ id: string }, void>({
    method: 'DELETE',
    path: '/cron/jobs/:id',
  })({ id })
}

export function runCronJob(id: string): Promise<ApiResponse<{ message: string; logId: string }>> {
  return createApiMethod<{ id: string }, { message: string; logId: string }>({
    method: 'POST',
    path: '/cron/jobs/:id/run',
  })({ id })
}

export function toggleCronJob(id: string): Promise<ApiResponse<{ job: BackendJob; scheduled: boolean }>> {
  return createApiMethod<{ id: string }, { job: BackendJob; scheduled: boolean }>({
    method: 'POST',
    path: '/cron/jobs/:id/toggle',
  })({ id })
}

// ============================================
// Task Queue API - Fixed endpoints
// ============================================

export function getTasks(filter?: TaskQueueFilter & { page?: number; limit?: number }): Promise<ApiResponse<TasksResponse>> {
  return createApiMethod<{ query: { status?: string; job_id?: string; page?: number; limit?: number } }, TasksResponse>({
    method: 'GET',
    path: '/cron/queue',
  })({ query: { status: filter?.status, job_id: filter?.jobId, page: filter?.page, limit: filter?.limit } })
}

export function createTask(task: CreateTaskDTO): Promise<ApiResponse<TaskQueueItem>> {
  const backendTask = {
    job_id: task.jobId,
    task_type: task.taskType,
    payload: typeof task.payload === 'string' ? task.payload : JSON.stringify(task.payload),
    priority: task.priority ?? 0,
    max_retries: task.maxRetries ?? 3,
  }
  return createApiMethod<{ body: typeof backendTask }, TaskQueueItem>({
    method: 'POST',
    path: '/cron/queue',
  })({ body: backendTask })
}

export function updateTask(id: string, updates: UpdateTaskDTO): Promise<ApiResponse<TaskQueueItem>> {
  return createApiMethod<{ id: string; body: UpdateTaskDTO }, TaskQueueItem>({
    method: 'PUT',
    path: '/cron/queue/:id',
  })({ id, body: updates })
}

export function deleteTask(id: string): Promise<ApiResponse<void>> {
  return createApiMethod<{ id: string }, void>({
    method: 'DELETE',
    path: '/cron/queue/:id',
  })({ id })
}

export function retryTask(id: string): Promise<ApiResponse<TaskQueueItem>> {
  return createApiMethod<{ id: string }, TaskQueueItem>({
    method: 'POST',
    path: '/cron/queue/:id/retry',
  })({ id })
}

// ============================================
// Execution Logs API - Fixed endpoints
// ============================================

export function getLogs(filter?: { jobId?: string; status?: string; limit?: number }): Promise<ApiResponse<{ logs: ExecutionLog[]; total: number }>> {
  return createApiMethod<{ query: { job_id?: string; status?: string; limit?: number } }, { logs: ExecutionLog[]; total: number }>({
    method: 'GET',
    path: '/cron/logs',
  })({ query: { job_id: filter?.jobId, status: filter?.status, limit: filter?.limit } })
}

export function getLogById(id: string): Promise<ApiResponse<ExecutionLog>> {
  return createApiMethod<{ id: string }, ExecutionLog>({
    method: 'GET',
    path: '/cron/logs/:id',
  })({ id })
}

export function getLogDetails(id: string): Promise<ApiResponse<{ log: ExecutionLog; details: ExecutionLogDetail[] }>> {
  return createApiMethod<{ id: string }, { log: ExecutionLog; details: ExecutionLogDetail[] }>({
    method: 'GET',
    path: '/cron/logs/:id/details',
  })({ id })
}

// ============================================
// Workflow API - Fixed endpoints
// ============================================

export function validateWorkflow(workflow: { nodes: unknown[]; edges: unknown[] } | { workflow_json: string }): Promise<ApiResponse<WorkflowValidationResponse>> {
  return createApiMethod<{ body: typeof workflow }, WorkflowValidationResponse>({
    method: 'POST',
    path: '/cron/workflow/validate',
  })({ body: workflow })
}

export function getWorkflowTemplates(): Promise<ApiResponse<{ templates: WorkflowTemplate[]; total: number }>> {
  return createApiMethod<Record<string, never>, { templates: WorkflowTemplate[]; total: number }>({
    method: 'GET',
    path: '/cron/workflow/templates',
  })({})
}

export function createWorkflowTemplate(template: { name: string; description: string; nodesJson: string; edgesJson: string }): Promise<ApiResponse<WorkflowTemplate>> {
  const backendTemplate = {
    name: template.name,
    description: template.description,
    nodes_json: template.nodesJson,
    edges_json: template.edgesJson,
    is_template: true,
  }
  return createApiMethod<{ body: typeof backendTemplate }, WorkflowTemplate>({
    method: 'POST',
    path: '/cron/workflow/templates',
  })({ body: backendTemplate })
}

export function updateWorkflowTemplate(id: string, updates: UpdateWorkflowTemplateDTO): Promise<ApiResponse<WorkflowTemplate>> {
  const backendUpdates: Record<string, unknown> = {}
  if (updates.name !== undefined) backendUpdates.name = updates.name
  if (updates.description !== undefined) backendUpdates.description = updates.description
  if (updates.nodesJson !== undefined) backendUpdates.nodes_json = updates.nodesJson
  if (updates.edgesJson !== undefined) backendUpdates.edges_json = updates.edgesJson

  return createApiMethod<{ id: string; body: Record<string, unknown> }, WorkflowTemplate>({
    method: 'PUT',
    path: '/cron/workflow/templates/:id',
  })({ id, body: backendUpdates })
}

export function deleteWorkflowTemplate(id: string): Promise<ApiResponse<void>> {
  return createApiMethod<{ id: string }, void>({
    method: 'DELETE',
    path: '/cron/workflow/templates/:id',
  })({ id })
}

// ============================================
// Job Tags API
// ============================================

export function addJobTag(jobId: string, tag: string): Promise<ApiResponse<{ tags: string[] }>> {
  return createApiMethod<{ jobId: string; body: { tag: string } }, { tags: string[] }>({
    method: 'POST',
    path: '/cron/jobs/:jobId/tags',
  })({ jobId, body: { tag } })
}

export function removeJobTag(jobId: string, tag: string): Promise<ApiResponse<{ tags: string[] }>> {
  return createApiMethod<{ jobId: string; tag: string }, { tags: string[] }>({
    method: 'DELETE',
    path: '/cron/jobs/:jobId/tags/:tag',
  })({ jobId, tag: encodeURIComponent(tag) })
}

export function getJobTags(jobId: string): Promise<ApiResponse<{ tags: string[] }>> {
  return createApiMethod<{ jobId: string }, { tags: string[] }>({
    method: 'GET',
    path: '/cron/jobs/:jobId/tags',
  })({ jobId })
}

export function getJobsByTag(tag: string): Promise<ApiResponse<{ jobs: BackendJob[]; total: number }>> {
  return createApiMethod<{ tag: string }, { jobs: BackendJob[]; total: number }>({
    method: 'GET',
    path: '/cron/tags/:tag/jobs',
  })({ tag })
}

export function getAllTags(): Promise<ApiResponse<{ tags: { tag: string; count: number }[] }>> {
  return createApiMethod<Record<string, never>, { tags: { tag: string; count: number }[] }>({
    method: 'GET',
    path: '/cron/tags',
  })({})
}

// ============================================
// Job Dependencies API
// ============================================

export function addJobDependency(jobId: string, dependsOnJobId: string): Promise<ApiResponse<{ dependencies: string[] }>> {
  return createApiMethod<{ jobId: string; body: { depends_on_job_id: string } }, { dependencies: string[] }>({
    method: 'POST',
    path: '/cron/jobs/:jobId/dependencies',
  })({ jobId, body: { depends_on_job_id: dependsOnJobId } })
}

export function removeJobDependency(jobId: string, dependsOnJobId: string): Promise<ApiResponse<{ dependencies: string[] }>> {
  return createApiMethod<{ jobId: string; dependsOnJobId: string }, { dependencies: string[] }>({
    method: 'DELETE',
    path: '/cron/jobs/:jobId/dependencies/:dependsOnJobId',
  })({ jobId, dependsOnJobId })
}

export function getJobDependencies(jobId: string): Promise<ApiResponse<{ dependencies: string[] }>> {
  return createApiMethod<{ jobId: string }, { dependencies: string[] }>({
    method: 'GET',
    path: '/cron/jobs/:jobId/dependencies',
  })({ jobId })
}

export function getJobDependents(jobId: string): Promise<ApiResponse<{ dependents: string[] }>> {
  return createApiMethod<{ jobId: string }, { dependents: string[] }>({
    method: 'GET',
    path: '/cron/jobs/:jobId/dependents',
  })({ jobId })
}

// ============================================
// Dead Letter Queue API
// ============================================

interface DLQListResponse {
  items: DeadLetterQueueItem[]
  total: number
}

export function getDeadLetterQueue(limit?: number): Promise<ApiResponse<DLQListResponse>> {
  return createApiMethod<{ query: { limit?: number } }, DLQListResponse>({
    method: 'GET',
    path: '/cron/dlq',
  })({ query: { limit } })
}

export function retryDeadLetterQueueItem(id: string): Promise<ApiResponse<{ taskId: string; message: string }>> {
  return createApiMethod<{ id: string }, { taskId: string; message: string }>({
    method: 'POST',
    path: '/cron/dlq/:id/retry',
  })({ id })
}

export function deleteDeadLetterQueueItem(id: string): Promise<ApiResponse<void>> {
  return createApiMethod<{ id: string }, void>({
    method: 'DELETE',
    path: '/cron/dlq/:id',
  })({ id })
}

// ============================================
// Auto-Retry API
// ============================================

export interface AutoRetryConfig {
  initialDelayMs: number
  maxDelayMs: number
  maxAttempts: number
  backoffMultiplier: number
}

export interface AutoRetryStats {
  enabled: boolean
  dlqItemCount: number
  pendingRetryCount: number
  config: AutoRetryConfig
}

export function getAutoRetryStats(): Promise<ApiResponse<AutoRetryStats>> {
  return createApiMethod<Record<string, never>, AutoRetryStats>({
    method: 'GET',
    path: '/cron/dlq/auto-retry/stats',
  })({})
}

export function updateAutoRetryConfig(config: {
  enabled?: boolean
  initialDelayMs?: number
  maxDelayMs?: number
  maxAttempts?: number
  backoffMultiplier?: number
}): Promise<ApiResponse<void>> {
  return createApiMethod<{ body: typeof config }, void>({
    method: 'PATCH',
    path: '/cron/dlq/auto-retry/config',
  })({ body: config })
}

export function startAutoRetry(): Promise<ApiResponse<{ message: string }>> {
  return createApiMethod<Record<string, never>, { message: string }>({
    method: 'POST',
    path: '/cron/dlq/auto-retry/start',
  })({})
}

export function stopAutoRetry(): Promise<ApiResponse<{ message: string }>> {
  return createApiMethod<Record<string, never>, { message: string }>({
    method: 'POST',
    path: '/cron/dlq/auto-retry/stop',
  })({})
}

export function getWebhooks(): Promise<ApiResponse<{ webhooks: WebhookConfig[]; total: number }>> {
  return createApiMethod<Record<string, never>, { webhooks: WebhookConfig[]; total: number }>({
    method: 'GET',
    path: '/cron/webhooks',
  })({})
}

export function createWebhook(data: CreateWebhookConfig): Promise<ApiResponse<WebhookConfig>> {
  const backendData = {
    job_id: data.jobId,
    name: data.name,
    url: data.url,
    events: data.events,
    headers: data.headers,
    secret: data.secret,
    is_active: data.isActive ?? true,
  }
  return createApiMethod<{ body: typeof backendData }, WebhookConfig>({
    method: 'POST',
    path: '/cron/webhooks',
  })({ body: backendData })
}

export function updateWebhook(id: string, data: UpdateWebhookConfig): Promise<ApiResponse<WebhookConfig>> {
  const backendData: Record<string, unknown> = {}
  if (data.jobId !== undefined) backendData.job_id = data.jobId
  if (data.name !== undefined) backendData.name = data.name
  if (data.url !== undefined) backendData.url = data.url
  if (data.events !== undefined) backendData.events = data.events
  if (data.headers !== undefined) backendData.headers = data.headers
  if (data.secret !== undefined) backendData.secret = data.secret
  if (data.isActive !== undefined) backendData.is_active = data.isActive

  return createApiMethod<{ id: string; body: Record<string, unknown> }, WebhookConfig>({
    method: 'PATCH',
    path: '/cron/webhooks/:id',
  })({ id, body: backendData })
}

export function deleteWebhook(id: string): Promise<ApiResponse<void>> {
  return createApiMethod<{ id: string }, void>({
    method: 'DELETE',
    path: '/cron/webhooks/:id',
  })({ id })
}

export function testWebhook(id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return createApiMethod<{ id: string }, { success: boolean; message: string }>({
    method: 'POST',
    path: '/cron/webhooks/:id/test',
  })({ id })
}

export function getWebhookDeliveries(webhookId: string): Promise<ApiResponse<{ deliveries: WebhookDelivery[]; total: number }>> {
  return createApiMethod<{ webhookId: string }, { deliveries: WebhookDelivery[]; total: number }>({
    method: 'GET',
    path: '/cron/webhooks/:webhookId/deliveries',
  })({ webhookId })
}

export interface ExecutionState {
  id: string
  workflowId: string
  status: 'idle' | 'running' | 'completed' | 'paused'
  startTime: string
  endTime: string | null
  nodeStatuses: Record<string, { status: string; result?: unknown; error?: string }>
}

export function pauseExecution(id: string): Promise<ApiResponse<void>> {
  return createApiMethod<{ id: string }, void>({
    method: 'POST',
    path: '/cron/executions/:id/pause',
  })({ id })
}

export function resumeExecution(id: string): Promise<ApiResponse<void>> {
  return createApiMethod<{ id: string }, void>({
    method: 'POST',
    path: '/cron/executions/:id/resume',
  })({ id })
}

export function cancelExecution(id: string): Promise<ApiResponse<void>> {
  return createApiMethod<{ id: string }, void>({
    method: 'POST',
    path: '/cron/executions/:id/cancel',
  })({ id })
}

export function getExecutionState(id: string): Promise<ApiResponse<ExecutionState>> {
  return createApiMethod<{ id: string }, ExecutionState>({
    method: 'GET',
    path: '/cron/executions/:id',
  })({ id })
}

export { cronClient }
