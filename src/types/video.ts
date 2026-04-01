export type VideoModel = 'video-01' | 'video-01-live'

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type CameraCommand =
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'pan_left_up'
  | 'pan_left_down'
  | 'pan_right_up'
  | 'pan_right_down'
  | 'roll_left'
  | 'roll_right'
  | 'dolly_zoom_in'
  | 'dolly_zoom_out'
  | 'static'

export const CAMERA_COMMANDS: { id: CameraCommand; name: string; description: string }[] = [
  { id: 'static', name: 'Static', description: '固定镜头' },
  { id: 'zoom_in', name: 'Zoom In', description: '推进镜头' },
  { id: 'zoom_out', name: 'Zoom Out', description: '拉远镜头' },
  { id: 'pan_left', name: 'Pan Left', description: '向左平移' },
  { id: 'pan_right', name: 'Pan Right', description: '向右平移' },
  { id: 'tilt_up', name: 'Tilt Up', description: '向上倾斜' },
  { id: 'tilt_down', name: 'Tilt Down', description: '向下倾斜' },
  { id: 'pan_left_up', name: 'Pan Left Up', description: '向左上移动' },
  { id: 'pan_left_down', name: 'Pan Left Down', description: '向左下移动' },
  { id: 'pan_right_up', name: 'Pan Right Up', description: '向右上移动' },
  { id: 'pan_right_down', name: 'Pan Right Down', description: '向右下移动' },
  { id: 'roll_left', name: 'Roll Left', description: '向左旋转' },
  { id: 'roll_right', name: 'Roll Right', description: '向右旋转' },
  { id: 'dolly_zoom_in', name: 'Dolly Zoom In', description: '希区柯克推进' },
  { id: 'dolly_zoom_out', name: 'Dolly Zoom Out', description: '希区柯克拉远' },
]

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