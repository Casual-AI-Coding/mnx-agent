// Voice API interfaces - imports from models
import type { SpeechModel, Emotion } from '../models'

export interface VoiceSetting {
  voice_id: string
  speed: number
  vol: number
  pitch: number
  emotion?: Emotion
}

export interface AudioSetting {
  sample_rate: 8000 | 16000 | 22050 | 24000 | 32000 | 44100
  bitrate: 32000 | 64000 | 128000 | 256000
  format: 'mp3' | 'wav' | 'pcm' | 'flac'
  channel: 1 | 2
}

export interface T2ASyncRequest {
  model: SpeechModel
  text: string
  voice_setting: VoiceSetting
  audio_setting: AudioSetting
  stream?: boolean
  pronunciation_dict?: { tone: string[] }
  subtitle_enable?: boolean
  output_format?: 'hex' | 'url'
  language_boost?: 'auto' | string
}

export interface T2ASyncResponse {
  trace_id: string
  data: string
  extra_info: {
    audio_length: number
    usage_characters: number
  }
}

export interface T2AAsyncRequest {
  model: SpeechModel
  text?: string
  file_id?: string | null
  voice_setting: VoiceSetting
  audio_setting: AudioSetting
  pronunciation_dict?: { tone: string[] }
  subtitle_enable?: boolean
  language_boost?: 'auto' | string
}

export interface T2AAsyncCreateResponse {
  trace_id: string
  task_id: string
  file_id: string
}

export interface T2AAsyncStatusResponse {
  trace_id: string
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_id: string
  results?: {
    audio_url: string
    subtitle_url?: string
    audio_length: number
  }
}
