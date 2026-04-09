import type { SpeechModel, Emotion } from '@/types'

export interface VoiceSyncState {
  text: string
  model: SpeechModel
  voiceId: string
  emotion: Emotion
  speed: number
  volume: number
  pitch: number
  isGenerating: boolean
  audioUrl: string | null
  error: string | null
}

export interface VoiceGenerationParams {
  model: SpeechModel
  text: string
  voice_setting: {
    voice_id: string
    speed: number
    vol: number
    pitch: number
    emotion: Emotion
  }
  audio_setting: {
    sample_rate: number
    bitrate: number
    format: string
    channel: number
  }
}

export interface VoiceConfigSummary {
  modelName: string
  voiceName: string
  voiceGender: 'male' | 'female' | undefined
  emotionLabel: string
  emotionEmoji: string
  speed: number
  volume: number
  pitch: number
}
