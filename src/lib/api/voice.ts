import { getBaseUrl, getHeaders } from './config'
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
  const response = await fetch(`${getBaseUrl()}/v1/t2a_v2`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, output_format: 'hex' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || 'Failed to create voice')
  }

  return response.json()
}

export async function createAsyncVoice(
  request: T2AAsyncRequest
): Promise<T2AAsyncCreateResponse> {
  const response = await fetch(`${getBaseUrl()}/v1/t2a_async_v2`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || 'Failed to create async voice task')
  }

  return response.json()
}

export async function getAsyncVoiceStatus(
  taskId: string
): Promise<T2AAsyncStatusResponse> {
  const response = await fetch(`${getBaseUrl()}/v1/t2a_async_query?task_id=${taskId}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || 'Failed to query voice status')
  }

  return response.json()
}