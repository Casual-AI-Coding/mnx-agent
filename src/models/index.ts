/**
 * Centralized Model Definitions
 * 
 * All model configurations for the debugging console are defined here.
 * This provides a single source of truth for models across the application.
 */

// ============================================================
// Text Models
// ============================================================

export type TextModel = 
  | 'MiniMax-M2.7'
  | 'MiniMax-M2.7-highspeed'
  | 'MiniMax-M2.5'
  | 'MiniMax-M2.5-highspeed'
  | 'M2-her'
  | 'MiniMax-M2.1'
  | 'MiniMax-M2'
  | 'MiniMax-Text-01'

export interface TextModelInfo {
  id: TextModel
  name: string
  description: string
}

export const TEXT_MODELS: TextModelInfo[] = [
  { id: 'MiniMax-M2.7', name: 'MiniMax-M2.7', description: '最新旗舰模型，综合能力最强' },
  { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax-M2.7-highspeed', description: '高速版本，更快响应速度' },
  { id: 'MiniMax-M2.5', name: 'MiniMax-M2.5', description: '旗舰模型，综合能力最强' },
  { id: 'MiniMax-M2.5-highspeed', name: 'MiniMax-M2.5-highspeed', description: '高速版本，更快响应速度' },
  { id: 'M2-her', name: 'M2-her', description: '角色扮演模型，支持丰富角色设定' },
  { id: 'MiniMax-M2.1', name: 'MiniMax-M2.1', description: '推理模型，深度思考能力' },
  { id: 'MiniMax-M2', name: 'MiniMax-M2', description: '推理模型，均衡性能' },
  { id: 'MiniMax-Text-01', name: 'MiniMax-Text-01', description: '经典文本模型' },
]

// ============================================================
// Voice / Speech Models
// ============================================================

export type SpeechModel = 
  | 'speech-2.8-hd'
  | 'speech-2.8-turbo'
  | 'speech-2.6-hd'
  | 'speech-2.6-turbo'
  | 'speech-02-hd'
  | 'speech-02-turbo'
  | 'speech-01-hd'
  | 'speech-01-turbo'

export type SpeechTier = 'latest' | 'recommended' | 'fast' | 'stable'

export interface SpeechModelInfo {
  id: SpeechModel
  name: string
  description: string
  tier: SpeechTier
}

export const SPEECH_MODELS: SpeechModelInfo[] = [
  { id: 'speech-2.8-hd', name: 'Speech 2.8 HD', description: '最新旗舰音质', tier: 'latest' },
  { id: 'speech-2.8-turbo', name: 'Speech 2.8 Turbo', description: '最新低时延', tier: 'latest' },
  { id: 'speech-2.6-hd', name: 'Speech 2.6 HD', description: '极致音质与韵律', tier: 'recommended' },
  { id: 'speech-2.6-turbo', name: 'Speech 2.6 Turbo', description: '超低时延', tier: 'fast' },
  { id: 'speech-02-hd', name: 'Speech 02 HD', description: '稳定性好', tier: 'stable' },
  { id: 'speech-02-turbo', name: 'Speech 02 Turbo', description: '性能出色', tier: 'fast' },
  { id: 'speech-01-hd', name: 'Speech 01 HD', description: '经典版本', tier: 'stable' },
  { id: 'speech-01-turbo', name: 'Speech 01 Turbo', description: '经典快速版', tier: 'fast' },
]

export type Emotion = 
  | 'auto' | 'happy' | 'sad' | 'angry' | 'fear' 
  | 'disgust' | 'surprise' | 'neutral' | 'vivid' | 'whisper'

export interface EmotionInfo {
  id: Emotion
  label: string
  emoji: string
}

export const EMOTIONS: EmotionInfo[] = [
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

export interface VoiceOption {
  id: string
  name: string
  gender: 'male' | 'female'
}

export const VOICE_OPTIONS: VoiceOption[] = [
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

// ============================================================
// Image Models
// ============================================================

export type ImageModel = 'image-01' | 'image-01-live'

export interface ImageModelInfo {
  id: ImageModel
  name: string
  description: string
}

export const IMAGE_MODELS: ImageModelInfo[] = [
  { id: 'image-01', name: 'image-01', description: '标准图像生成模型' },
  { id: 'image-01-live', name: 'image-01-live', description: '支持画风设置的模型' },
]

export type AspectRatio = 
  | '1:1' | '16:9' | '4:3' | '3:2' | '2:3' 
  | '3:4' | '9:16' | '21:9' | 'custom'

export interface AspectRatioInfo {
  id: AspectRatio
  label: string
  icon: string
}

export const ASPECT_RATIOS: AspectRatioInfo[] = [
  { id: '1:1', label: '1:1', icon: '⬜' },
  { id: '16:9', label: '16:9', icon: '▬' },
  { id: '4:3', label: '4:3', icon: '▭' },
  { id: '3:2', label: '3:2', icon: '▭' },
  { id: '2:3', label: '2:3', icon: '▯' },
  { id: '3:4', label: '3:4', icon: '▯' },
  { id: '9:16', label: '9:16', icon: '▮' },
  { id: '21:9', label: '21:9', icon: '━' },
]

export interface PromptTemplate {
  id: string
  name: string
  prompt: string
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  { id: 'portrait', name: '人物肖像', prompt: 'A professional portrait of a person, soft lighting, shallow depth of field, high quality, 8k' },
  { id: 'landscape', name: '风景摄影', prompt: 'Beautiful landscape photography, golden hour, dramatic clouds, professional composition' },
  { id: 'product', name: '产品展示', prompt: 'Professional product photography, clean background, studio lighting, high detail' },
  { id: 'scifi', name: '科幻场景', prompt: 'Futuristic sci-fi scene, cyberpunk style, neon lights, dramatic atmosphere' },
  { id: 'anime', name: '动漫角色', prompt: 'Anime style character illustration, vibrant colors, detailed, Japanese animation style' },
  { id: 'food', name: '美食摄影', prompt: 'Delicious food photography, professional lighting, appetizing presentation, high detail' },
]

// ============================================================
// Music Models
// ============================================================

export type MusicModel = 'music-2.6' | 'music-cover' | 'music-2.5' | 'music-2.5+'

export interface MusicModelInfo {
  id: MusicModel
  name: string
  description: string
}

export const MUSIC_MODELS: MusicModelInfo[] = [
  { id: 'music-2.6', name: 'music-2.6', description: '最新音乐生成模型，支持多样化风格' },
  { id: 'music-cover', name: 'music-cover', description: '音乐翻唱/混音模型' },
  { id: 'music-2.5', name: 'music-2.5', description: '标准音乐生成模型' },
  { id: 'music-2.5+', name: 'music-2.5+', description: '支持纯音乐模式和 AI 歌词优化' },
]

export interface MusicTemplate {
  id: string
  name: string
  style: string
  lyrics: string
}

export const MUSIC_TEMPLATES: MusicTemplate[] = [
  { id: 'folk', name: '民谣情歌', style: '独立民谣,忧郁,内省,渴望,独自漫步,咖啡馆', lyrics: '[Verse]\n在咖啡馆的角落里\n想着你的微笑\n...' },
  { id: 'pop', name: '流行励志', style: '流行音乐,励志,充满希望,青春,追梦', lyrics: '[Verse]\n追逐梦想的路上\n...' },
  { id: 'edm', name: '电子舞曲', style: '电子音乐,EDM,派对,活力,夜店,节奏感强', lyrics: '[Intro]\n[Verse]\n...' },
  { id: 'chinese', name: '古风情怀', style: '古风,中国风,唯美,诗意,江南,琵琶', lyrics: '[Verse]\n江南烟雨蒙蒙\n...' },
  { id: 'rock', name: '摇滚青春', style: '摇滚,热血,叛逆,青春,吉他,激情', lyrics: '[Verse]\n青春的火焰在燃烧\n...' },
]

export const STRUCTURE_TAGS = [
  '[Intro]', '[Verse]', '[Pre Chorus]', '[Chorus]', '[Bridge]', 
  '[Outro]', '[Interlude]', '[Hook]', '[Inst]'
]

// ============================================================
// Video Models
// ============================================================

export type VideoModel = 'video-01' | 'video-01-live'

export interface VideoModelInfo {
  id: VideoModel
  name: string
  description: string
}

export const VIDEO_MODELS: VideoModelInfo[] = [
  { id: 'video-01', name: 'video-01', description: '标准视频生成模型' },
  { id: 'video-01-live', name: 'video-01-live', description: '实时视频生成模型' },
]

export type CameraCommand = 
  | 'zoom_in' | 'zoom_out'
  | 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down'
  | 'pan_left_up' | 'pan_left_down' | 'pan_right_up' | 'pan_right_down'
  | 'roll_left' | 'roll_right'
  | 'dolly_zoom_in' | 'dolly_zoom_out'
  | 'static'

export interface CameraCommandInfo {
  id: CameraCommand
  name: string
  description: string
}

export const CAMERA_COMMANDS: CameraCommandInfo[] = [
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

export interface VideoAgentTemplate {
  id: string
  name: string
  description: string
  thumbnail: string
  icon: 'Waves' | 'Cpu' | 'Shield'
  gradient: string
}

export const VIDEO_AGENT_TEMPLATES: VideoAgentTemplate[] = [
  {
    id: 'diving',
    name: '潜水',
    description: '水下世界探索',
    thumbnail: '',
    icon: 'Waves',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'transformers',
    name: '变形金刚',
    description: '机器人变形',
    thumbnail: '',
    icon: 'Cpu',
    gradient: 'from-orange-500 to-red-600',
  },
  {
    id: 'superhero',
    name: '超级英雄',
    description: '英雄登场',
    thumbnail: '',
    icon: 'Shield',
    gradient: 'from-purple-500 to-pink-600',
  },
]

// ============================================================
// Default Model Values
// ============================================================

export const DEFAULT_MODELS = {
  text: 'MiniMax-Text-01' as TextModel,
  voice: 'speech-01-turbo' as SpeechModel,
  image: 'image-01' as ImageModel,
  music: 'music-2.6' as MusicModel,
  video: 'video-01' as VideoModel,
}

// ============================================================
// System Prompt Templates
// ============================================================

export interface SystemPromptTemplate {
  id: string
  name: string
  prompt: string
}

export const SYSTEM_PROMPT_TEMPLATES: SystemPromptTemplate[] = [
  { id: 'general', name: '通用助手', prompt: '你是一个有帮助的 AI 助手，用简洁、准确的方式回答用户的问题。' },
  { id: 'code', name: '代码专家', prompt: '你是一个资深的编程专家，精通多种编程语言和框架。请用清晰、专业的方式回答编程相关问题，必要时提供代码示例。' },
  { id: 'writing', name: '写作助手', prompt: '你是一个专业的写作助手，擅长各类文体的创作和润色。请帮助用户提升文章的表达力和感染力。' },
  { id: 'translate', name: '翻译专家', prompt: '你是一个专业的翻译专家，精通多国语言。请准确、地道地翻译用户提供的内容，保持原文的风格和语气。' },
  { id: 'roleplay', name: '角色扮演', prompt: '你是一个善于角色扮演的 AI，能够根据用户设定的角色进行生动的对话和互动。' },
]
