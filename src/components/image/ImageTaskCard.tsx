export type ImageTaskStatus = 'idle' | 'generating' | 'completed' | 'failed'

export interface ImageTask {
  id: string
  status: ImageTaskStatus
  progress: number
  imageUrls?: string[]
  error?: string
  retryCount: number
}