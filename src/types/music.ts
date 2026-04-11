// Music API interfaces - imports from models
import type { MusicModel } from '../models'

export interface MusicGenerationRequest {
  model: MusicModel
  lyrics?: string
  prompt?: string
  optimize_lyrics?: boolean
  audio_setting?: {
    sample_rate?: 16000 | 24000 | 32000 | 44100
    bitrate?: 32000 | 64000 | 128000 | 256000
    format?: 'mp3' | 'wav' | 'flac'
  }
  output_format?: 'hex' | 'url'
  seed?: number
  reference_audio_url?: string
  use_original_lyrics?: boolean
}

export interface MusicGenerationResponse {
  trace_id: string
  data: {
    audio: string
    duration: number
  }
  extra_info?: {
    music_duration?: number
    music_sample_rate?: number
    music_channel?: number
    bitrate?: number
    music_size?: number
  }
  base_resp?: {
    status_code: number
    status_msg: string
  }
}

export interface MusicPreprocessResponse {
  lyrics: string
  audio_url: string
  duration: number
}
