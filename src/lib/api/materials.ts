/**
 * 素材管理 API 封装
 * 对应后端 server/routes/materials.ts
 */

import { internalAxios } from './client'
import { withApiResponse } from './request'
import type {
  ApiResponse,
  ListMaterialsParams,
  ListMaterialsResponse,
  Material,
  CreateMaterial,
  UpdateMaterial,
  MaterialItem,
  CreateMaterialItem,
  UpdateMaterialItem,
  MaterialDetailResult,
  DeleteResponse,
} from '@/types/material'

export async function listMaterials(
  params?: ListMaterialsParams
): Promise<ApiResponse<ListMaterialsResponse>> {
  return withApiResponse<ListMaterialsResponse>(() => internalAxios.get('/materials', { params }))
}

export async function getMaterial(
  id: string
): Promise<ApiResponse<Material>> {
  return withApiResponse<Material>(() => internalAxios.get(`/materials/${id}`))
}

export async function getMaterialDetail(
  id: string
): Promise<ApiResponse<MaterialDetailResult>> {
  return withApiResponse<MaterialDetailResult>(() => internalAxios.get(`/materials/${id}/detail`))
}

export async function createMaterial(
  data: CreateMaterial
): Promise<ApiResponse<Material>> {
  return withApiResponse<Material>(() => internalAxios.post('/materials', data))
}

export async function updateMaterial(
  id: string,
  data: UpdateMaterial
): Promise<ApiResponse<Material>> {
  return withApiResponse<Material>(() => internalAxios.put(`/materials/${id}`, data))
}

export async function deleteMaterial(
  id: string
): Promise<ApiResponse<DeleteResponse>> {
  return withApiResponse<DeleteResponse>(() => internalAxios.delete(`/materials/${id}`))
}

export async function createMaterialItem(
  materialId: string,
  data: CreateMaterialItem
): Promise<ApiResponse<MaterialItem>> {
  return withApiResponse<MaterialItem>(() => internalAxios.post(`/materials/${materialId}/items`, data))
}

export async function updateMaterialItem(
  itemId: string,
  data: UpdateMaterialItem
): Promise<ApiResponse<MaterialItem>> {
  return withApiResponse<MaterialItem>(() => internalAxios.put(`/materials/items/${itemId}`, data))
}

export async function deleteMaterialItem(
  itemId: string
): Promise<ApiResponse<DeleteResponse>> {
  return withApiResponse<DeleteResponse>(() => internalAxios.delete(`/materials/items/${itemId}`))
}

export async function reorderMaterialItems(
  materialId: string,
  items: Array<{ id: string; sort_order: number }>
): Promise<ApiResponse<{ reordered: boolean }>> {
  return withApiResponse<{ reordered: boolean }>(() =>
    internalAxios.post(`/materials/${materialId}/items/reorder`, { items })
  )
}
