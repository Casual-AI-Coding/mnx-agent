export type ImageModel = 'image-01' | 'image-01-live'

export type AspectRatio = '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9' | 'custom'

export interface ImageGenerationRequest {
  model: ImageModel
  prompt: string
  response_format?: 'url' | 'b64_json'
  n?: 1 | 2 | 3 | 4
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

export const IMAGE_MODELS: { id: ImageModel; name: string; description: string }[] = [
  { id: 'image-01', name: 'image-01', description: '标准图像生成模型' },
  { id: 'image-01-live', name: 'image-01-live', description: '支持画风设置的模型' },
]

export const ASPECT_RATIOS: { id: AspectRatio; label: string; icon: string }[] = [
  { id: '1:1', label: '1:1', icon: '⬜' },
  { id: '16:9', label: '16:9', icon: '▬' },
  { id: '4:3', label: '4:3', icon: '▭' },
  { id: '3:2', label: '3:2', icon: '▭' },
  { id: '2:3', label: '2:3', icon: '▯' },
  { id: '3:4', label: '3:4', icon: '▯' },
  { id: '9:16', label: '9:16', icon: '▮' },
  { id: '21:9', label: '21:9', icon: '━' },
]

export const PROMPT_TEMPLATES = [
  { id: 'portrait', name: '人物肖像', prompt: 'A professional portrait of a person, soft lighting, shallow depth of field, high quality, 8k' },
  { id: 'landscape', name: '风景摄影', prompt: 'Beautiful landscape photography, golden hour, dramatic clouds, professional composition' },
  { id: 'product', name: '产品展示', prompt: 'Professional product photography, clean background, studio lighting, high detail' },
  { id: 'scifi', name: '科幻场景', prompt: 'Futuristic sci-fi scene, cyberpunk style, neon lights, dramatic atmosphere' },
  { id: 'anime', name: '动漫角色', prompt: 'Anime style character illustration, vibrant colors, detailed, Japanese animation style' },
  { id: 'food', name: '美食摄影', prompt: 'Delicious food photography, professional lighting, appetizing presentation, high detail' },
]