export interface TextGenerationSettings {
  model: string
  temperature: number
  topP: number
  maxTokens: number
  promptCaching: boolean
  streamOutput: boolean
}

export interface VoiceGenerationSettings {
  model: string
  voiceId: string
  emotion: string
  speed: number
  pitch: number
  volume: number
}

export interface ImageGenerationSettings {
  model: string
  aspectRatio: string
  numImages: number
  promptOptimizer: boolean
  style: string
}

export interface MusicGenerationSettings {
  model: string
  optimizeLyrics: boolean
  duration: number
}

export interface VideoGenerationSettings {
  model: string
  quality: 'standard' | 'high'
  duration: number
}

export interface GenerationSettings {
  text: TextGenerationSettings
  voice: VoiceGenerationSettings
  image: ImageGenerationSettings
  music: MusicGenerationSettings
  video: VideoGenerationSettings
}
