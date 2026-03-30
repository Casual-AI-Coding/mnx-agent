export type SpeechModel =
  | 'speech-2.8-hd'
  | 'speech-2.8-turbo'
  | 'speech-2.6-hd'
  | 'speech-2.6-turbo'
  | 'speech-02-hd'
  | 'speech-02-turbo'
  | 'speech-01-hd'
  | 'speech-01-turbo'

export type Emotion = 'auto' | 'happy' | 'sad' | 'angry' | 'fear' | 'disgust' | 'surprise' | 'neutral' | 'vivid' | 'whisper'

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

export const SPEECH_MODELS: { id: SpeechModel; name: string; description: string; tier: 'latest' | 'recommended' | 'fast' | 'stable' }[] = [
  { id: 'speech-2.8-hd', name: 'Speech 2.8 HD', description: '最新旗舰音质', tier: 'latest' },
  { id: 'speech-2.8-turbo', name: 'Speech 2.8 Turbo', description: '最新低时延', tier: 'latest' },
  { id: 'speech-2.6-hd', name: 'Speech 2.6 HD', description: '极致音质与韵律', tier: 'recommended' },
  { id: 'speech-2.6-turbo', name: 'Speech 2.6 Turbo', description: '超低时延', tier: 'fast' },
  { id: 'speech-02-hd', name: 'Speech 02 HD', description: '稳定性好', tier: 'stable' },
  { id: 'speech-02-turbo', name: 'Speech 02 Turbo', description: '性能出色', tier: 'fast' },
  { id: 'speech-01-hd', name: 'Speech 01 HD', description: '经典版本', tier: 'stable' },
  { id: 'speech-01-turbo', name: 'Speech 01 Turbo', description: '经典快速版', tier: 'fast' },
]

export const EMOTIONS: { id: Emotion; label: string; emoji: string }[] = [
  { id: 'auto', label: '自动', emoji: '🤖' },
  { id: 'happy', label: '开心', emoji: '😊' },
  { id: 'sad', label: '悲伤', emoji: '😢' },
  { id: 'angry', label: '愤怒', emoji: '😠' },
  { id: 'fear', label: '恐惧', emoji: '😨' },
  { id: 'disgust', label: '厌恶', emoji: '🤢' },
  { id: 'surprise', label: '惊讶', emoji: '😲' },
  { id: 'neutral', label: '中性', emoji: '😐' },
  { id: 'vivid', label: '生动', emoji: '🎭' },
  { id: 'whisper', label: '低语', emoji: '🤫' },
]

export const VOICE_OPTIONS = [
  { id: 'male-qn-qingse', name: '青涩青年', gender: 'male' },
  { id: 'female-shaonv', name: '少女', gender: 'female' },
  { id: 'audiobook_male_1', name: '有声书男声1', gender: 'male' },
  { id: 'audiobook_male_2', name: '有声书男声2', gender: 'male' },
  { id: 'audiobook_female_1', name: '有声书女声1', gender: 'female' },
  { id: 'audiobook_female_2', name: '有声书女声2', gender: 'female' },
  { id: 'male_chunhou', name: '醇厚男声', gender: 'male' },
  { id: 'female_chengshu', name: '成熟女声', gender: 'female' },
  { id: 'presenter_male', name: '主持人男声', gender: 'male' },
  { id: 'presenter_female', name: '主持人女声', gender: 'female' },
]