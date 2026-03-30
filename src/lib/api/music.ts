import { useAppStore } from '@/stores/app'
import { API_HOSTS } from '@/types'
import type { MusicGenerationRequest, MusicGenerationResponse } from '@/types'

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

export async function generateMusic(
  request: MusicGenerationRequest
): Promise<MusicGenerationResponse> {
  const response = await fetch(`${getBaseUrl()}/v1/music_generation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, output_format: 'url' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || 'Failed to generate music')
  }

  return response.json()
}