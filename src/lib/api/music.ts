import { getBaseUrl, getHeaders } from './config'
import type { MusicGenerationRequest, MusicGenerationResponse } from '@/types'

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