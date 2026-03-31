import { getBaseUrl, getHeaders, getApiMode } from './config'
import type { ImageGenerationRequest, ImageGenerationResponse } from '@/types'

interface MiniMaxImageResponse {
  id?: string
  data?: {
    image_urls?: string[]
  }
  base_resp?: {
    status_code: number
    status_msg: string
  }
}

interface ProxyImageResponse {
  success: boolean
  data: MiniMaxImageResponse
}

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

  const result: MiniMaxImageResponse | ProxyImageResponse | ImageGenerationResponse = await response.json()
  
  // Proxy mode: backend wraps response as { success: true, data: MiniMaxResponse }
  if (apiMode === 'proxy' && 'success' in result) {
    const proxyResult = result as ProxyImageResponse
    const minimaxData = proxyResult.data?.data
    if (minimaxData && 'image_urls' in minimaxData) {
      const urls = minimaxData.image_urls || []
      return {
        created: Date.now(),
        data: urls.map(url => ({ url }))
      }
    }
  }
  
  // Direct mode: MiniMax returns { data: { image_urls: [...] } }
  if (!('success' in result) && result.data && 'image_urls' in result.data) {
    const urls = result.data.image_urls || []
    return {
      created: Date.now(),
      data: urls.map(url => ({ url }))
    }
  }
  
  return result as ImageGenerationResponse
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