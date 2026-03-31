import { getBaseUrl, getHeaders, getApiMode } from './config'
import type { ImageGenerationRequest, ImageGenerationResponse } from '@/types'

export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const apiMode = getApiMode()
  const endpoint = apiMode === 'proxy' ? '/image/generate' : '/v1/image_generation'
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, response_format: 'url' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to generate image')
  }

  return response.json()
}

export function generateImageCurl(request: ImageGenerationRequest): string {
  const baseUrl = getBaseUrl()
  const apiMode = getApiMode()
  const endpoint = apiMode === 'proxy' ? '/image/generate' : '/v1/image_generation'
  return `curl --request POST \\
  --url '${baseUrl}${endpoint}' \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '${JSON.stringify(request, null, 2)}'`
}