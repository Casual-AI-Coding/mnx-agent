import { internalAxios } from './client'
import { AxiosError, isAxiosError } from 'axios'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
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

export interface CreateWorkflowDTO {
  name: string
  description?: string
  nodes_json: string
  edges_json: string
  is_template?: boolean
}

export interface UpdateWorkflowDTO {
  name?: string
  description?: string | null
  nodes_json?: string
  edges_json?: string
  is_template?: boolean
}

export async function listWorkflows(params?: { is_template?: boolean; page?: number; limit?: number }): Promise<ApiResponse<{ workflows: WorkflowTemplate[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
  try {
    const response = await internalAxios.get('/workflows', { params })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getWorkflow(id: string): Promise<ApiResponse<WorkflowTemplate>> {
  try {
    const response = await internalAxios.get(`/workflows/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function createWorkflow(data: CreateWorkflowDTO): Promise<ApiResponse<WorkflowTemplate>> {
  try {
    const response = await internalAxios.post('/workflows', data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function updateWorkflow(id: string, data: UpdateWorkflowDTO): Promise<ApiResponse<WorkflowTemplate>> {
  try {
    const response = await internalAxios.put(`/workflows/${id}`, data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function deleteWorkflow(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  try {
    const response = await internalAxios.delete(`/workflows/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// =========================
// Workflow Versions
// =========================

export interface WorkflowVersion {
  id: string
  workflow_template_id: string
  version_number: number
  name: string | null
  description: string | null
  nodes_json: string
  edges_json: string
  change_summary: string | null
  created_by: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateVersionDTO {
  nodes_json: string
  edges_json: string
  name?: string
  description?: string
  change_summary?: string
}

/**
 * Get all versions for a workflow template
 */
export async function getWorkflowVersions(templateId: string): Promise<ApiResponse<WorkflowVersion[]>> {
  try {
    const response = await internalAxios.get(`/cron/workflows/${templateId}/versions`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Get the currently active version for a workflow template
 */
export async function getActiveVersion(templateId: string): Promise<ApiResponse<WorkflowVersion | null>> {
  try {
    const response = await internalAxios.get(`/cron/workflows/${templateId}/versions/active`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Activate a specific version
 */
export async function activateVersion(templateId: string, versionId: string): Promise<ApiResponse<void>> {
  try {
    await internalAxios.post(`/cron/workflows/${templateId}/versions/${versionId}/activate`)
    return { success: true }
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Create a new version for a workflow template
 */
export async function createVersion(
  templateId: string,
  data: CreateVersionDTO
): Promise<ApiResponse<WorkflowVersion>> {
  try {
    const response = await internalAxios.post(`/cron/workflows/${templateId}/versions`, data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.error || error.message : 'Unknown error'
    return { success: false, error: message }
  }
}