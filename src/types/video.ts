// Video API interfaces - imports from models
import type { VideoModel, CameraCommand } from '../models'

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
  camera_control?: {
    type: CameraCommand
  }
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
