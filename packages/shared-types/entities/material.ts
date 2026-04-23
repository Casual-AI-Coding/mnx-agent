/**
 * 素材管理实体类型
 */

export type MaterialType = 'artist'

export type MaterialItemType = 'song'

export type PromptTargetType = 'material-main' | 'material-item'

export type PromptSlotType = 'artist-style' | 'song-style'

export interface Material {
  id: string
  material_type: MaterialType
  name: string
  description: string | null
  metadata: string | null
  owner_id: string
  sort_order: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateMaterial {
  material_type: MaterialType
  name: string
  description?: string | null
  metadata?: Record<string, unknown> | null
  sort_order?: number
}

export interface UpdateMaterial {
  name?: string
  description?: string | null
  metadata?: Record<string, unknown> | null
  sort_order?: number
  updated_at?: string
}

export interface MaterialRow {
  id: string
  material_type: MaterialType
  name: string
  description: string | null
  metadata: string | null
  owner_id: string
  sort_order: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MaterialItem {
  id: string
  material_id: string
  item_type: MaterialItemType
  name: string
  lyrics: string | null
  remark: string | null
  metadata: string | null
  owner_id: string
  sort_order: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateMaterialItem {
  material_id: string
  item_type: MaterialItemType
  name: string
  lyrics?: string | null
  remark?: string | null
  metadata?: Record<string, unknown> | null
  sort_order?: number
}

export interface UpdateMaterialItem {
  name?: string
  lyrics?: string | null
  remark?: string | null
  metadata?: Record<string, unknown> | null
  sort_order?: number
  updated_at?: string
}

export interface MaterialItemRow {
  id: string
  material_id: string
  item_type: MaterialItemType
  name: string
  lyrics: string | null
  remark: string | null
  metadata: string | null
  owner_id: string
  sort_order: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PromptRecord {
  id: string
  target_type: PromptTargetType
  target_id: string
  slot_type: PromptSlotType
  name: string
  content: string
  sort_order: number
  is_default: boolean
  owner_id: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreatePromptRecord {
  target_type: PromptTargetType
  target_id: string
  slot_type: PromptSlotType
  name: string
  content: string
  sort_order?: number
  is_default?: boolean
}

export interface UpdatePromptRecord {
  name?: string
  content?: string
  sort_order?: number
  is_default?: boolean
  updated_at?: string
}

export interface PromptRecordRow {
  id: string
  target_type: PromptTargetType
  target_id: string
  slot_type: PromptSlotType
  name: string
  content: string
  sort_order: number
  is_default: boolean
  owner_id: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}
