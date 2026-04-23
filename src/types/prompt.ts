/**
 * 提示词记录前端类型
 * 基于 packages/shared-types/entities/material.ts 的领域类型
 */

import type {
  PromptRecord as SharedPromptRecord,
  CreatePromptRecord as SharedCreatePromptRecord,
  UpdatePromptRecord as SharedUpdatePromptRecord,
  PromptTargetType,
  PromptSlotType,
} from 'packages/shared-types/entities/material'

// Re-export from shared-types
export type {
  PromptTargetType,
  PromptSlotType,
  PromptRecord as SharedPromptRecord,
  CreatePromptRecord as SharedCreatePromptRecord,
  UpdatePromptRecord as SharedUpdatePromptRecord,
} from 'packages/shared-types/entities/material'

// 前端友好的 Prompt 类型
export type PromptRecord = SharedPromptRecord
export type CreatePromptRecord = SharedCreatePromptRecord
export type UpdatePromptRecord = SharedUpdatePromptRecord

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 创建提示词参数
export interface CreatePromptParams {
  target_type: PromptTargetType
  target_id: string
  slot_type: PromptSlotType
  name: string
  content: string
  is_default?: boolean
  sort_order?: number
}

// 更新提示词参数
export interface UpdatePromptParams {
  name?: string
  content?: string
  sort_order?: number
  is_default?: boolean
}

// 删除响应
export interface DeleteResponse {
  deleted: boolean
}
