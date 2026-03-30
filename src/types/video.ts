export type VideoModel = 'video-01' | 'video-01-live'

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface VideoGenerationRequest {
  model: VideoModel
  prompt: string
  first_frame_image?: string
  last_frame_image?: string
  subject_reference?: {
    image_id: string
    description?: string
  }
  callback_url?: string
}

export interface VideoGenerationResponse {
  task_id: string
}

export interface VideoTaskStatusResponse {
  task_id: string
  status: VideoStatus
  file_id?: string
  results?: {
    video_url: string
    duration: number
  }
  error?: string
}

export const VIDEO_MODELS: { id: VideoModel; name: string; description: string }[] = [
  { id: 'video-01', name: 'video-01', description: '标准视频生成模型' },
  { id: 'video-01-live', name: 'video-01-live', description: '实时视频生成模型' },
]

export interface VideoAgentTemplate {
  id: string
  name: string
  description: string
  thumbnail: string
}

export const VIDEO_AGENT_TEMPLATES: VideoAgentTemplate[] = [
  { id: 'diving', name: '潜水', description: '水下世界探索', thumbnail: '' },
  { id: 'transformers', name: '变形金刚', description: '机器人变形', thumbnail: '' },
  { id: 'superhero', name: '超级英雄', description: '英雄登场', thumbnail: '' },
]