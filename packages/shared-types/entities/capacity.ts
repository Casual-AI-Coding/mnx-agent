/**
 * Capacity Tracking Entity Types
 */

export interface CapacityRecord {
  id: string
  service_type: string
  remaining_quota: number
  total_quota: number
  reset_at: string | null
  last_checked_at: string
}

export interface CreateCapacityRecord {
  service_type: string
  remaining_quota: number
  total_quota: number
  reset_at?: string | null
}

export interface UpdateCapacityRecord {
  remaining_quota?: number
  total_quota?: number
  reset_at?: string | null
}

export interface CapacityRecordRow {
  id: string
  service_type: string
  remaining_quota: number
  total_quota: number
  reset_at: string | null
  last_checked_at: string
}