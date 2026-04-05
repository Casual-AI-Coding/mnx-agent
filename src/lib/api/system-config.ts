import { apiClient } from './client'

export interface SystemConfig {
  id: string
  key: string
  value: string
  description: string | null
  value_type: 'string' | 'number' | 'boolean'
  updated_at: string
  updated_by: string | null
}

export interface CreateSystemConfigRequest {
  key: string
  value: string
  description?: string
  value_type?: 'string' | 'number' | 'boolean'
}

export interface UpdateSystemConfigRequest {
  value: string
  description?: string | null
}

export async function getAllSystemConfigs(): Promise<SystemConfig[]> {
  const response = await apiClient.get<{ success: boolean; data: SystemConfig[] }>('/system-config')
  return response.data
}

export async function getSystemConfig(key: string): Promise<SystemConfig> {
  const response = await apiClient.get<{ success: boolean; data: SystemConfig }>(`/system-config/${key}`)
  return response.data
}

export async function createSystemConfig(data: CreateSystemConfigRequest): Promise<SystemConfig> {
  const response = await apiClient.post<{ success: boolean; data: SystemConfig }>('/system-config', data)
  return response.data
}

export async function updateSystemConfig(key: string, data: UpdateSystemConfigRequest): Promise<SystemConfig> {
  const response = await apiClient.patch<{ success: boolean; data: SystemConfig }>(`/system-config/${key}`, data)
  return response.data
}

export async function deleteSystemConfig(key: string): Promise<void> {
  await apiClient.delete<{ success: boolean; message: string }>(`/system-config/${key}`)
}
