import { internalAxios } from './client'
import type { AllSettings, SettingsCategory } from '@/settings/types'

export interface SettingsResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    changedKeys?: string[]
    updatedAt?: string
  }
}

export interface SettingsHistoryItem {
  id: string
  user_id: string
  category: string
  setting_key: string
  old_value: unknown
  new_value: unknown
  changed_at: string
  changed_by: string
  source: string
}

export interface SettingsHistoryResponse {
  success: boolean
  data?: {
    items: SettingsHistoryItem[]
    total: number
  }
  error?: string
}

export interface DefaultsResponse {
  success: boolean
  data?: Record<SettingsCategory, Record<string, unknown>>
  error?: string
}

export async function getSettings(): Promise<SettingsResponse<Partial<AllSettings>>> {
  const response = await internalAxios.get('/settings')
  return {
    success: true,
    data: response.data,
  }
}

export async function getSettingsByCategory(
  category: SettingsCategory
): Promise<SettingsResponse<Record<string, unknown>>> {
  const response = await internalAxios.get(`/settings/${category}`)
  return {
    success: true,
    data: response.data,
  }
}

export async function updateSettings(
  category: SettingsCategory,
  settings: Record<string, unknown>
): Promise<SettingsResponse<Record<string, unknown>>> {
  const response = await internalAxios.patch(`/settings/${category}`, { settings })
  return {
    success: true,
    data: response.data.settings,
    meta: {
      changedKeys: response.data.changedKeys,
    },
  }
}

export async function replaceSettings(
  category: SettingsCategory,
  settings: Record<string, unknown>
): Promise<SettingsResponse<Record<string, unknown>>> {
  const response = await internalAxios.put(`/settings/${category}`, { settings })
  return {
    success: true,
    data: response.data.settings,
    meta: {
      changedKeys: response.data.changedKeys,
    },
  }
}

export async function resetSettings(
  category: SettingsCategory
): Promise<SettingsResponse<Record<string, unknown>>> {
  const response = await internalAxios.delete(`/settings/${category}`)
  return {
    success: true,
    data: response.data.defaults,
  }
}

export async function getSettingsHistory(
  category?: SettingsCategory,
  page: number = 1,
  limit: number = 50
): Promise<SettingsHistoryResponse> {
  const params = new URLSearchParams()
  if (category) params.append('category', category)
  params.append('page', String(page))
  params.append('limit', String(limit))

  const response = await internalAxios.get(`/settings/history?${params.toString()}`)
  return {
    success: true,
    data: response.data,
  }
}

export async function getDefaultSettings(): Promise<DefaultsResponse> {
  const response = await internalAxios.get('/settings/defaults')
  return {
    success: true,
    data: response.data,
  }
}