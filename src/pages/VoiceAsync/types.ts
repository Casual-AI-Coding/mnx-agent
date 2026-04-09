import type { SpeechModel, Emotion, T2AAsyncStatusResponse } from '@/types'

export const MAX_CHARS = 50000

export type TaskStatus = 'idle' | 'creating' | 'pending' | 'processing' | 'completed' | 'failed'

export interface Task {
  id: string
  taskId: string
  status: TaskStatus
  text: string
  createdAt: number
  result?: {
    audioUrl: string
    subtitleUrl?: string
    audioLength: number
  }
  error?: string
}

export interface VoiceFormData {
  text: string
  model: SpeechModel
  voiceId: string
  emotion: Emotion
  speed: number
  volume: number
  pitch: number
  activeTab: 'text' | 'file'
  fileId: string | null
}

export interface VoiceAsyncFormProps {
  formData: VoiceFormData
  onFormChange: (data: Partial<VoiceFormData>) => void
  onCreateTask: () => void
  uploadError: string | null
  uploadRetryCount: number
  pendingFile: File | null
  isDragging: boolean
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onRetryUpload: () => void
  onClearUploadError: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  charCount: number
  isOverLimit: boolean
}

export interface VoiceUploadSectionProps {
  uploadError: string | null
  uploadRetryCount: number
  pendingFile: File | null
  fileId: string | null
  isDragging: boolean
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onRetryUpload: () => void
  onClearUploadError: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

export interface VoiceHistoryProps {
  tasks: Task[]
  onRemoveTask: (taskId: string) => void
  onDownload: (url: string, filename: string) => void
}

export interface VoiceTaskCardProps {
  task: Task
  onRemove: () => void
  onDownload: (url: string, filename: string) => void
}

export interface VoiceTextInputProps {
  text: string
  onChange: (text: string) => void
  charCount: number
  isOverLimit: boolean
}

export interface VoiceParameterSettingsProps {
  model: SpeechModel
  voiceId: string
  emotion: Emotion
  speed: number
  onModelChange: (model: SpeechModel) => void
  onVoiceIdChange: (voiceId: string) => void
  onEmotionChange: (emotion: Emotion) => void
  onSpeedChange: (speed: number) => void
}

export { type SpeechModel, type Emotion, type T2AAsyncStatusResponse }
