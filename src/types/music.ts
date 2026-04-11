// Music API interfaces - imports from models
import type { MusicModel } from '../models'

export interface MusicGenerationRequest {
  model: MusicModel
  lyrics: string
  audio_setting?: {
    sample_rate: 44100
    bitrate: 256000
    format: 'mp3' | 'wav' | 'flac'
  }
  output_format?: 'hex' | 'url'
  style_prompt?: string
  optimize_lyrics?: boolean
}

export interface MusicGenerationResponse {
  trace_id: string
  data: {
    audio: string
    duration: number
  }
}
