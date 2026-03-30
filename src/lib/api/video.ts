import { useAppStore } from '@/stores/app'
import { API_HOSTS } from '@/types'
import type { VideoGenerationRequest, VideoGenerationResponse, VideoTaskStatusResponse } from '@/types'

function getBaseUrl(): string {
  const { region } = useAppStore.getState()
  return API_HOSTS[region]
}

function getHeaders(): HeadersInit {
  const { apiKey } = useAppStore.getState()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
}

export async function createVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const response = await fetch(`${getBaseUrl()}/v1/video_generation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || 'Failed to create video task')
  }

  return response.json()
}

export async function getVideoStatus(
  taskId: string
): Promise<VideoTaskStatusResponse> {
  const response = await fetch(`${getBaseUrl()}/v1/video_generation/query?task_id=${taskId}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || 'Failed to query video status')
  }

  return response.json()
}