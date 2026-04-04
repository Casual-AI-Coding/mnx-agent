import { internalAxios } from './client'
import { AxiosError, isAxiosError } from 'axios'
import type {
  CronJob,
  BackendJob,
  TaskQueueItem,
  ExecutionLog,
  CapacityRecord,
  WorkflowTemplate,
  CreateCronJobDTO,
  UpdateCronJobDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  UpdateWorkflowTemplateDTO,
  TaskQueueFilter,
  DeadLetterQueueItem,
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
// Export client for custom use cases
// ============================================

export { cronClient }
