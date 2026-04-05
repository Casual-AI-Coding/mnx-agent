/**
 * System Config Entity Types
 */

export type SystemConfigValueType = 'string' | 'number' | 'boolean'

export interface SystemConfig {
  id: string
  key: string
  value: string
  description: string | null
  value_type: SystemConfigValueType
  updated_at: string
  updated_by: string | null
}

export interface SystemConfigRow {
  id: string
  key: string
  value: string
  description: string | null
  value_type: string
  updated_at: string
  updated_by: string | null
}

export interface CreateSystemConfig {
  key: string
  value: string
  description: string | null
  value_type: SystemConfigValueType
}

export interface UpdateSystemConfig {
  value?: string
  description?: string | null
}