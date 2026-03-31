import { getBaseUrl, getHeaders } from './config'
import type { ImageGenerationRequest, ImageGenerationResponse } from '@/types'

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
  const baseUrl = getBaseUrl()
  return `curl --request POST \\
  --url '${baseUrl}/v1/image_generation' \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '${JSON.stringify(request, null, 2)}'`
}