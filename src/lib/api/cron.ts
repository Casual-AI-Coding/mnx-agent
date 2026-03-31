import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  CronJob,
  TaskQueueItem,
  ExecutionLog,
  CapacityRecord,
  WorkflowTemplate,
  CreateCronJobDTO,
  UpdateCronJobDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  CreateWorkflowTemplateDTO,
  UpdateWorkflowTemplateDTO,
  TaskQueueFilter,
} from '@/types/cron'

// ============================================
// Types
// ============================================

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

// ============================================
// Axios Instance
// ============================================

const cronClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4511',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================
// Error Handler
// ============================================

function handleApiError(error: unknown, context: string): ApiResponse<never> {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>
    const message = axiosError.response?.data?.error 
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
// Cron Jobs API
// ============================================

export async function getCronJobs(): Promise<ApiResponse<CronJob[]>> {
  try {
    const response = await cronClient.get<CronJob[]>('/api/cron-jobs')
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'getCronJobs')
  }
}

export async function createCronJob(job: CreateCronJobDTO): Promise<ApiResponse<CronJob>> {
  try {
    const response = await cronClient.post<CronJob>('/api/cron-jobs', job)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'createCronJob')
  }
}

export async function getCronJob(id: string): Promise<ApiResponse<CronJob>> {
  try {
    const response = await cronClient.get<CronJob>(`/api/cron-jobs/${id}`)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'getCronJob')
  }
}

export async function updateCronJob(id: string, updates: UpdateCronJobDTO): Promise<ApiResponse<CronJob>> {
  try {
    const response = await cronClient.patch<CronJob>(`/api/cron-jobs/${id}`, updates)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'updateCronJob')
  }
}

export async function deleteCronJob(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.delete(`/api/cron-jobs/${id}`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'deleteCronJob')
  }
}

export async function runCronJob(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.post(`/api/cron-jobs/${id}/run`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'runCronJob')
  }
}

export async function toggleCronJob(id: string): Promise<ApiResponse<CronJob>> {
  try {
    const response = await cronClient.post<CronJob>(`/api/cron-jobs/${id}/toggle`)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'toggleCronJob')
  }
}

// ============================================
// Task Queue API
// ============================================

export async function getTasks(filter?: TaskQueueFilter & { page?: number; limit?: number }): Promise<ApiResponse<TasksResponse>> {
  try {
    const params = new URLSearchParams()
    if (filter?.status) params.append('status', filter.status)
    if (filter?.jobId) params.append('jobId', filter.jobId)
    if (filter?.page) params.append('page', String(filter.page))
    if (filter?.limit) params.append('limit', String(filter.limit))
    
    const response = await cronClient.get<TasksResponse>('/api/tasks', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'getTasks')
  }
}

export async function createTask(task: CreateTaskDTO): Promise<ApiResponse<TaskQueueItem>> {
  try {
    const response = await cronClient.post<TaskQueueItem>('/api/tasks', task)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'createTask')
  }
}

export async function updateTask(id: string, updates: UpdateTaskDTO): Promise<ApiResponse<TaskQueueItem>> {
  try {
    const response = await cronClient.patch<TaskQueueItem>(`/api/tasks/${id}`, updates)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'updateTask')
  }
}

export async function deleteTask(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.delete(`/api/tasks/${id}`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'deleteTask')
  }
}

export async function retryTask(id: string): Promise<ApiResponse<TaskQueueItem>> {
  try {
    const response = await cronClient.post<TaskQueueItem>(`/api/tasks/${id}/retry`)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'retryTask')
  }
}

// ============================================
// Execution Logs API
// ============================================

export async function getLogs(filter?: { jobId?: string; status?: string; limit?: number }): Promise<ApiResponse<ExecutionLog[]>> {
  try {
    const params = new URLSearchParams()
    if (filter?.jobId) params.append('jobId', filter.jobId)
    if (filter?.status) params.append('status', filter.status)
    if (filter?.limit) params.append('limit', String(filter.limit))
    
    const response = await cronClient.get<ExecutionLog[]>('/api/logs', { params })
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'getLogs')
  }
}

export async function getLogById(id: string): Promise<ApiResponse<ExecutionLog>> {
  try {
    const response = await cronClient.get<ExecutionLog>(`/api/logs/${id}`)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'getLogById')
  }
}

// ============================================
// Capacity API
// ============================================

export async function getCapacity(): Promise<ApiResponse<CapacityRecord[]>> {
  try {
    const response = await cronClient.get<CapacityRecord[]>('/api/capacity')
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'getCapacity')
  }
}

export async function refreshCapacity(): Promise<ApiResponse<CapacityRecord[]>> {
  try {
    const response = await cronClient.post<CapacityRecord[]>('/api/capacity/refresh')
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'refreshCapacity')
  }
}

// ============================================
// Workflow API
// ============================================

export async function validateWorkflow(workflow: { nodes: unknown[]; edges: unknown[] }): Promise<ApiResponse<WorkflowValidationResponse>> {
  try {
    const response = await cronClient.post<WorkflowValidationResponse>('/api/workflow/validate', workflow)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'validateWorkflow')
  }
}

export async function getWorkflowTemplates(): Promise<ApiResponse<WorkflowTemplate[]>> {
  try {
    const response = await cronClient.get<WorkflowTemplate[]>('/api/workflow/templates')
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'getWorkflowTemplates')
  }
}

export async function createWorkflowTemplate(template: CreateWorkflowTemplateDTO): Promise<ApiResponse<WorkflowTemplate>> {
  try {
    const response = await cronClient.post<WorkflowTemplate>('/api/workflow/templates', template)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'createWorkflowTemplate')
  }
}

export async function updateWorkflowTemplate(id: string, updates: UpdateWorkflowTemplateDTO): Promise<ApiResponse<WorkflowTemplate>> {
  try {
    const response = await cronClient.patch<WorkflowTemplate>(`/api/workflow/templates/${id}`, updates)
    return { success: true, data: response.data }
  } catch (error) {
    return handleApiError(error, 'updateWorkflowTemplate')
  }
}

export async function deleteWorkflowTemplate(id: string): Promise<ApiResponse<void>> {
  try {
    await cronClient.delete(`/api/workflow/templates/${id}`)
    return { success: true }
  } catch (error) {
    return handleApiError(error, 'deleteWorkflowTemplate')
  }
}

// ============================================
// Export client for custom use cases
// ============================================

export { cronClient }