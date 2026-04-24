/**
 * 素材管理前端类型
 * 基于 packages/shared-types/entities/material.ts 的领域类型
 */

import type {
  Material as SharedMaterial,
  CreateMaterial as SharedCreateMaterial,
  UpdateMaterial as SharedUpdateMaterial,
  MaterialItem as SharedMaterialItem,
  CreateMaterialItem as SharedCreateMaterialItem,
  UpdateMaterialItem as SharedUpdateMaterialItem,
  MaterialDetailResult as SharedMaterialDetailResult,
} from 'packages/shared-types/entities/material'

// Re-export from shared-types with explicit naming
export type {
} from 'packages/shared-types/entities/material'

// 前端友好的 Material 类型 (与 shared-types 相同结构)
export type Material = SharedMaterial
export type CreateMaterial = SharedCreateMaterial
export type UpdateMaterial = SharedUpdateMaterial
export type MaterialItem = SharedMaterialItem
export type CreateMaterialItem = SharedCreateMaterialItem
export type UpdateMaterialItem = SharedUpdateMaterialItem
export type MaterialDetailResult = SharedMaterialDetailResult

// 素材类型 - 目前仅 'artist'，后续可扩展
export type MaterialType = 'artist'

// 素材类型元数据（用于 UI 显示）
export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  artist: '艺术家',
} as const

export const MATERIAL_TYPE_COLORS: Record<MaterialType, string> = {
  artist: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
} as const

// 内部类型别名
export type {
  Material as MaterialRecord,
  MaterialItem as MaterialItemRecord,
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 列表查询参数
export interface ListMaterialsParams {
  ownerId?: string
  material_type?: MaterialType
  limit?: number
  offset?: number
}

// 分页响应
export interface PaginatedResponse<T> {
  records: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// 分页元数据（与后端 createPaginatedResponse 一致）
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 素材列表响应（后端返回 { records, pagination } 结构）
export interface ListMaterialsResponse {
  records: Material[]
  pagination: PaginationMeta
}

// 简化的删除响应
export interface DeleteResponse {
  deleted: boolean
}
