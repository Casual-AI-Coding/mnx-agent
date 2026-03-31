import { getBaseUrl, getHeaders, getApiMode } from './config'
import type {
  T2ASyncRequest,
  T2ASyncResponse,
  T2AAsyncRequest,
  T2AAsyncCreateResponse,
  T2AAsyncStatusResponse,
} from '@/types'

export async function createSyncVoice(
  request: T2ASyncRequest
): Promise<T2ASyncResponse> {
  const apiMode = getApiMode()
  const endpoint = apiMode === 'proxy' ? '/voice/sync' : '/v1/t2a_v2'
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, output_format: 'hex' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to create voice')
  }

  return response.json()
}

export async function createAsyncVoice(
  request: T2AAsyncRequest
): Promise<T2AAsyncCreateResponse> {
  const apiMode = getApiMode()
  const endpoint = apiMode === 'proxy' ? '/voice/async' : '/v1/t2a_async_v2'
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to create async voice task')
  }

  return response.json()
}

export async function getAsyncVoiceStatus(
  taskId: string
): Promise<T2AAsyncStatusResponse> {
  const apiMode = getApiMode()
  const endpoint = apiMode === 'proxy' ? `/voice/async/${taskId}` : `/v1/t2a_async_query?task_id=${taskId}`
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to query voice status')
  }

  return response.json()
}