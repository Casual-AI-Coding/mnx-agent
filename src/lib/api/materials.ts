/**
 * 素材管理 API 封装
 * 对应后端 server/routes/materials.ts
 */

import { internalAxios } from './client'
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
  try {
    const response = await internalAxios.get('/materials', { params })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getMaterial(
  id: string
): Promise<ApiResponse<Material>> {
  try {
    const response = await internalAxios.get(`/materials/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function getMaterialDetail(
  id: string
): Promise<ApiResponse<MaterialDetailResult>> {
  try {
    const response = await internalAxios.get(`/materials/${id}/detail`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function createMaterial(
  data: CreateMaterial
): Promise<ApiResponse<Material>> {
  try {
    const response = await internalAxios.post('/materials', data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function updateMaterial(
  id: string,
  data: UpdateMaterial
): Promise<ApiResponse<Material>> {
  try {
    const response = await internalAxios.put(`/materials/${id}`, data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function deleteMaterial(
  id: string
): Promise<ApiResponse<DeleteResponse>> {
  try {
    const response = await internalAxios.delete(`/materials/${id}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function createMaterialItem(
  materialId: string,
  data: CreateMaterialItem
): Promise<ApiResponse<MaterialItem>> {
  try {
    const response = await internalAxios.post(`/materials/${materialId}/items`, data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function updateMaterialItem(
  itemId: string,
  data: UpdateMaterialItem
): Promise<ApiResponse<MaterialItem>> {
  try {
    const response = await internalAxios.put(`/materials/items/${itemId}`, data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function deleteMaterialItem(
  itemId: string
): Promise<ApiResponse<DeleteResponse>> {
  try {
    const response = await internalAxios.delete(`/materials/items/${itemId}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function reorderMaterialItems(
  materialId: string,
  items: Array<{ id: string; sort_order: number }>
): Promise<ApiResponse<{ reordered: boolean }>> {
  try {
    const response = await internalAxios.post(`/materials/${materialId}/items/reorder`, { items })
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}
