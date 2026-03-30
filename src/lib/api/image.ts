import { useAppStore } from '@/stores/app'
import { API_HOSTS } from '@/types'
import type { ImageGenerationRequest, ImageGenerationResponse } from '@/types'

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

export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const response = await fetch(`${getBaseUrl()}/v1/image_generation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, response_format: 'url' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || 'Failed to generate image')
  }

  return response.json()
}

export function generateImageCurl(request: ImageGenerationRequest): string {
  const { region } = useAppStore.getState()
  const host = API_HOSTS[region]
  return `curl --request POST \\
  --url '${host}/v1/image_generation' \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '${JSON.stringify(request, null, 2)}'`
}