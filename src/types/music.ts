// Music API interfaces - imports from models
import type { MusicModel } from '../models'

export interface MusicGenerationRequest {
  model: MusicModel
  lyrics?: string
  style_prompt?: string
  optimize_lyrics?: boolean
  audio_setting?: {
    sample_rate?: 44100 | 48000
    bitrate?: '128k' | '192k' | '256k' | '320k'
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
