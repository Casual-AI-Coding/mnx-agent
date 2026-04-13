export type ImageTaskStatus = 'idle' | 'generating' | 'completed' | 'failed'

export interface ImageTask {
  id: string
  status: ImageTaskStatus
  progress: number
  imageUrls?: string[]
  error?: string
  retryCount: number
  requestParams?: {
    model: string
    prompt: string
    n: number
    prompt_optimizer?: boolean
    aspect_ratio?: string
    width?: number
    height?: number
    seed?: number
  }
  apiResponse?: {
    success: boolean
    data?: {
      created?: number
      image_urls?: string[]
    }
    error?: {
      status_code?: number
      status_msg?: string
    }
    raw?: unknown
  }
}