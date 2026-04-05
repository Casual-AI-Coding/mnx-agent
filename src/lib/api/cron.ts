import { internalAxios } from './client'
import { AxiosError, isAxiosError } from 'axios'
import type {
  CronJob,
  BackendJob,
  TaskQueueItem,
  ExecutionLog,
  ExecutionLogDetail,
  CapacityRecord,
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

function handleApiError(error: unknown, context: string): ApiResponse<never> {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string; data?: { error?: string } }>
    const message = axiosError.response?.data?.error 
      || axiosError.response?.data?.data?.error
      || axiosError.response?.data?.message 
      || axiosError.message 
      || 'Unknown error'
    console.error(`[Cron API] ${context}:`, message)
    return { success: false, error: message }
  }
  
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`[Cron API] ${context}:`, message)
  return { success: false, error: message }
}

// ============================================
// Cron Jobs API - Fixed endpoints to match backend
// ============================================

export async function getCronJobs(): Promise<ApiResponse<{ jobs: BackendJob[]; total: number }>> {
  try {
    const response = await cronClient.get('/cron/jobs')
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getCronJobs')
  }
}

export async function createCronJob(job: CreateCronJobDTO): Promise<ApiResponse<BackendJob>> {
  try {
    const backendJob = {
      name: job.name,
      description: job.description,
      cron_expression: job.cronExpression,
      timezone: job.timezone ?? 'Asia/Shanghai',
      workflow_id: job.workflowId,
      is_active: job.isActive ?? true,
    }
    const response = await cronClient.post('/cron/jobs', backendJob)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'createCronJob')
  }
}

export async function getCronJob(id: string): Promise<ApiResponse<BackendJob>> {
  try {
    const response = await cronClient.get(`/cron/jobs/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getCronJob')
  }
}

export async function updateCronJob(id: string, updates: UpdateCronJobDTO): Promise<ApiResponse<BackendJob>> {
  try {
    const backendUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) backendUpdates.name = updates.name
    if (updates.description !== undefined) backendUpdates.description = updates.description
    if (updates.cronExpression !== undefined) backendUpdates.cron_expression = updates.cronExpression
    if (updates.timezone !== undefined) backendUpdates.timezone = updates.timezone
    if (updates.workflowId !== undefined) backendUpdates.workflow_id = updates.workflowId
    if (updates.isActive !== undefined) backendUpdates.is_active = updates.isActive
    
    const response = await cronClient.put(`/cron/jobs/${id}`, backendUpdates)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'updateCronJob')
  }
}

export async function deleteCronJob(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.delete(`/cron/jobs/${id}`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'deleteCronJob')
  }
}

export async function runCronJob(id: string): Promise<ApiResponse<{ message: string; logId: string }>> {
  try {
    const response = await cronClient.post(`/cron/jobs/${id}/run`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'runCronJob')
  }
}

export async function toggleCronJob(id: string): Promise<ApiResponse<{ job: BackendJob; scheduled: boolean }>> {
  try {
    const response = await cronClient.post(`/cron/jobs/${id}/toggle`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'toggleCronJob')
  }
}

// ============================================
// Task Queue API - Fixed endpoints
// ============================================

export async function getTasks(filter?: TaskQueueFilter & { page?: number; limit?: number }): Promise<ApiResponse<TasksResponse>> {
  try {
    const params = new URLSearchParams()
    if (filter?.status) params.append('status', filter.status)
    if (filter?.jobId) params.append('job_id', filter.jobId)
    if (filter?.page) params.append('page', String(filter.page))
    if (filter?.limit) params.append('limit', String(filter.limit))
    
    const response = await cronClient.get('/cron/queue', { params })
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getTasks')
  }
}

export async function createTask(task: CreateTaskDTO): Promise<ApiResponse<TaskQueueItem>> {
  try {
    const backendTask = {
      job_id: task.jobId,
      task_type: task.taskType,
      payload: typeof task.payload === 'string' ? task.payload : JSON.stringify(task.payload),
      priority: task.priority ?? 0,
      max_retries: task.maxRetries ?? 3,
    }
    const response = await cronClient.post('/cron/queue', backendTask)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'createTask')
  }
}

export async function updateTask(id: string, updates: UpdateTaskDTO): Promise<ApiResponse<TaskQueueItem>> {
  try {
    const response = await cronClient.put(`/cron/queue/${id}`, updates)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'updateTask')
  }
}

export async function deleteTask(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.delete(`/cron/queue/${id}`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'deleteTask')
  }
}

export async function retryTask(id: string): Promise<ApiResponse<TaskQueueItem>> {
  try {
    const response = await cronClient.post(`/cron/queue/${id}/retry`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'retryTask')
  }
}

// ============================================
// Execution Logs API - Fixed endpoints
// ============================================

export async function getLogs(filter?: { jobId?: string; status?: string; limit?: number }): Promise<ApiResponse<{ logs: ExecutionLog[]; total: number }>> {
  try {
    const params = new URLSearchParams()
    if (filter?.jobId) params.append('job_id', filter.jobId)
    if (filter?.status) params.append('status', filter.status)
    if (filter?.limit) params.append('limit', String(filter.limit))
    
    const response = await cronClient.get('/cron/logs', { params })
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getLogs')
  }
}

export async function getLogById(id: string): Promise<ApiResponse<ExecutionLog>> {
  try {
    const response = await cronClient.get(`/cron/logs/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getLogById')
  }
}

export async function getLogDetails(id: string): Promise<ApiResponse<{ log: ExecutionLog; details: ExecutionLogDetail[] }>> {
  try {
    const response = await cronClient.get(`/cron/logs/${id}/details`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getLogDetails')
  }
}

// ============================================
// Workflow API - Fixed endpoints
// ============================================

export async function validateWorkflow(workflow: { nodes: unknown[]; edges: unknown[] } | { workflow_json: string }): Promise<ApiResponse<WorkflowValidationResponse>> {
  try {
    const response = await cronClient.post('/cron/workflow/validate', workflow)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'validateWorkflow')
  }
}

export async function getWorkflowTemplates(): Promise<ApiResponse<{ templates: WorkflowTemplate[]; total: number }>> {
  try {
    const response = await cronClient.get('/cron/workflow/templates')
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getWorkflowTemplates')
  }
}

export async function createWorkflowTemplate(template: { name: string; description: string; nodesJson: string; edgesJson: string }): Promise<ApiResponse<WorkflowTemplate>> {
  try {
    const backendTemplate = {
      name: template.name,
      description: template.description,
      nodes_json: template.nodesJson,
      edges_json: template.edgesJson,
      is_template: true,
    }
    const response = await cronClient.post('/cron/workflow/templates', backendTemplate)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'createWorkflowTemplate')
  }
}

export async function updateWorkflowTemplate(id: string, updates: UpdateWorkflowTemplateDTO): Promise<ApiResponse<WorkflowTemplate>> {
  try {
    const backendUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) backendUpdates.name = updates.name
    if (updates.description !== undefined) backendUpdates.description = updates.description
    if (updates.nodesJson !== undefined) backendUpdates.nodes_json = updates.nodesJson
    if (updates.edgesJson !== undefined) backendUpdates.edges_json = updates.edgesJson
    
    const response = await cronClient.put(`/cron/workflow/templates/${id}`, backendUpdates)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'updateWorkflowTemplate')
  }
}

export async function deleteWorkflowTemplate(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.delete(`/cron/workflow/templates/${id}`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'deleteWorkflowTemplate')
  }
}

// ============================================
// Job Tags API
// ============================================

export async function addJobTag(jobId: string, tag: string): Promise<ApiResponse<{ tags: string[] }>> {
  try {
    const response = await cronClient.post(`/cron/jobs/${jobId}/tags`, { tag })
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'addJobTag')
  }
}

export async function removeJobTag(jobId: string, tag: string): Promise<ApiResponse<{ tags: string[] }>> {
  try {
    const response = await cronClient.delete(`/cron/jobs/${jobId}/tags/${encodeURIComponent(tag)}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'removeJobTag')
  }
}

export async function getJobTags(jobId: string): Promise<ApiResponse<{ tags: string[] }>> {
  try {
    const response = await cronClient.get(`/cron/jobs/${jobId}/tags`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getJobTags')
  }
}

export async function getJobsByTag(tag: string): Promise<ApiResponse<{ jobs: BackendJob[]; total: number }>> {
  try {
    const response = await cronClient.get(`/cron/tags/${encodeURIComponent(tag)}/jobs`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getJobsByTag')
  }
}

export async function getAllTags(): Promise<ApiResponse<{ tags: { tag: string; count: number }[] }>> {
  try {
    const response = await cronClient.get('/cron/tags')
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getAllTags')
  }
}

// ============================================
// Job Dependencies API
// ============================================

export async function addJobDependency(jobId: string, dependsOnJobId: string): Promise<ApiResponse<{ dependencies: string[] }>> {
  try {
    const response = await cronClient.post(`/cron/jobs/${jobId}/dependencies`, { depends_on_job_id: dependsOnJobId })
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'addJobDependency')
  }
}

export async function removeJobDependency(jobId: string, dependsOnJobId: string): Promise<ApiResponse<{ dependencies: string[] }>> {
  try {
    const response = await cronClient.delete(`/cron/jobs/${jobId}/dependencies/${dependsOnJobId}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'removeJobDependency')
  }
}

export async function getJobDependencies(jobId: string): Promise<ApiResponse<{ dependencies: string[] }>> {
  try {
    const response = await cronClient.get(`/cron/jobs/${jobId}/dependencies`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getJobDependencies')
  }
}

export async function getJobDependents(jobId: string): Promise<ApiResponse<{ dependents: string[] }>> {
  try {
    const response = await cronClient.get(`/cron/jobs/${jobId}/dependents`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getJobDependents')
  }
}

// ============================================
// Dead Letter Queue API
// ============================================

interface DLQListResponse {
  items: DeadLetterQueueItem[]
  total: number
}

export async function getDeadLetterQueue(limit?: number): Promise<ApiResponse<DLQListResponse>> {
  try {
    const params = new URLSearchParams()
    if (limit) params.append('limit', String(limit))
    
    const response = await cronClient.get('/cron/dlq', { params })
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getDeadLetterQueue')
  }
}

export async function retryDeadLetterQueueItem(id: string): Promise<ApiResponse<{ taskId: string; message: string }>> {
  try {
    const response = await cronClient.post(`/cron/dlq/${id}/retry`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'retryDeadLetterQueueItem')
  }
}

export async function deleteDeadLetterQueueItem(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.delete(`/cron/dlq/${id}`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'deleteDeadLetterQueueItem')
  }
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

export async function getAutoRetryStats(): Promise<ApiResponse<AutoRetryStats>> {
  try {
    const response = await cronClient.get('/cron/dlq/auto-retry/stats')
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getAutoRetryStats')
  }
}

export async function updateAutoRetryConfig(config: {
  enabled?: boolean
  initialDelayMs?: number
  maxDelayMs?: number
  maxAttempts?: number
  backoffMultiplier?: number
}): Promise<ApiResponse<void>> {
  try {
    await cronClient.patch('/cron/dlq/auto-retry/config', config)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'updateAutoRetryConfig')
  }
}

export async function startAutoRetry(): Promise<ApiResponse<{ message: string }>> {
  try {
    const response = await cronClient.post('/cron/dlq/auto-retry/start')
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'startAutoRetry')
  }
}

export async function stopAutoRetry(): Promise<ApiResponse<{ message: string }>> {
  try {
    const response = await cronClient.post('/cron/dlq/auto-retry/stop')
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'stopAutoRetry')
  }
}

export async function getWebhooks(): Promise<ApiResponse<{ webhooks: WebhookConfig[]; total: number }>> {
  try {
    const response = await cronClient.get('/cron/webhooks')
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getWebhooks')
  }
}

export async function createWebhook(data: CreateWebhookConfig): Promise<ApiResponse<WebhookConfig>> {
  try {
    const backendData = {
      job_id: data.jobId,
      name: data.name,
      url: data.url,
      events: data.events,
      headers: data.headers,
      secret: data.secret,
      is_active: data.isActive ?? true,
    }
    const response = await cronClient.post('/cron/webhooks', backendData)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'createWebhook')
  }
}

export async function updateWebhook(id: string, data: UpdateWebhookConfig): Promise<ApiResponse<WebhookConfig>> {
  try {
    const backendData: Record<string, unknown> = {}
    if (data.jobId !== undefined) backendData.job_id = data.jobId
    if (data.name !== undefined) backendData.name = data.name
    if (data.url !== undefined) backendData.url = data.url
    if (data.events !== undefined) backendData.events = data.events
    if (data.headers !== undefined) backendData.headers = data.headers
    if (data.secret !== undefined) backendData.secret = data.secret
    if (data.isActive !== undefined) backendData.is_active = data.isActive

    const response = await cronClient.patch(`/cron/webhooks/${id}`, backendData)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'updateWebhook')
  }
}

export async function deleteWebhook(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.delete(`/cron/webhooks/${id}`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'deleteWebhook')
  }
}

export async function testWebhook(id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
  try {
    const response = await cronClient.post(`/cron/webhooks/${id}/test`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'testWebhook')
  }
}

export async function getWebhookDeliveries(webhookId: string): Promise<ApiResponse<{ deliveries: WebhookDelivery[]; total: number }>> {
  try {
    const response = await cronClient.get(`/cron/webhooks/${webhookId}/deliveries`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getWebhookDeliveries')
  }
}

export interface ExecutionState {
  id: string
  workflowId: string
  status: 'idle' | 'running' | 'completed' | 'paused'
  startTime: string
  endTime: string | null
  nodeStatuses: Record<string, { status: string; result?: unknown; error?: string }>
}

export async function pauseExecution(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.post(`/cron/executions/${id}/pause`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'pauseExecution')
  }
}

export async function resumeExecution(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.post(`/cron/executions/${id}/resume`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'resumeExecution')
  }
}

export async function cancelExecution(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.post(`/cron/executions/${id}/cancel`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'cancelExecution')
  }
}

export async function getExecutionState(id: string): Promise<ApiResponse<ExecutionState>> {
  try {
    const response = await cronClient.get(`/cron/executions/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    return handleApiError(error, 'getExecutionState')
  }
}

export { cronClient }
