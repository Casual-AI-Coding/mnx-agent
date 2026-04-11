// Image API interfaces - imports from models
import type { ImageModel, AspectRatio } from '../models'

export interface ImageGenerationRequest {
  model: ImageModel
  prompt: string
  response_format?: 'url' | 'b64_json'
  n?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  prompt_optimizer?: boolean
  aspect_ratio?: AspectRatio
  seed?: number
  subject_reference?: {
    image_id: string
    description?: string
  }
  style?: string
}

export interface ImageGenerationResponse {
  created: number
  data: {
    url?: string
    b64_json?: string
  }[]
}

export interface ImageGenerationWithReference extends ImageGenerationRequest {
  image_file?: string
  image_url?: string
}
