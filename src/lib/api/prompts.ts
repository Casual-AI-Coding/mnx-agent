/**
 * 提示词记录 API 封装
 * 对应后端 server/routes/prompts.ts
 */

import { internalAxios } from './client'
import type {
  ApiResponse,
  CreatePromptParams,
  UpdatePromptParams,
  PromptRecord,
  DeleteResponse,
} from '@/types/prompt'

export async function createPrompt(
  data: CreatePromptParams
): Promise<ApiResponse<PromptRecord>> {
  try {
    const response = await internalAxios.post('/prompts', data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function updatePrompt(
  promptId: string,
  data: UpdatePromptParams
): Promise<ApiResponse<PromptRecord>> {
  try {
    const response = await internalAxios.put(`/prompts/${promptId}`, data)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function setDefaultPrompt(
  promptId: string
): Promise<ApiResponse<PromptRecord>> {
  try {
    const response = await internalAxios.post(`/prompts/${promptId}/set-default`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function deletePrompt(
  promptId: string
): Promise<ApiResponse<DeleteResponse>> {
  try {
    const response = await internalAxios.delete(`/prompts/${promptId}`)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function reorderPrompts(params: {
  target_type: string
  target_id: string
  slot_type: string
  items: string[]
}): Promise<ApiResponse<{ reordered: boolean }>> {
  try {
    const response = await internalAxios.post('/prompts/reorder', params)
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}
