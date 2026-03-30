export type MusicModel = 'music-2.5' | 'music-2.5+'

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

export const MUSIC_MODELS: { id: MusicModel; name: string; description: string }[] = [
  { id: 'music-2.5', name: 'music-2.5', description: '标准音乐生成模型' },
  { id: 'music-2.5+', name: 'music-2.5+', description: '支持纯音乐模式和 AI 歌词优化' },
]

export const MUSIC_TEMPLATES = [
  { id: 'folk', name: '民谣情歌', style: '独立民谣,忧郁,内省,渴望,独自漫步,咖啡馆', lyrics: '[Verse]\n在咖啡馆的角落里\n想着你的微笑\n...' },
  { id: 'pop', name: '流行励志', style: '流行音乐,励志,充满希望,青春,追梦', lyrics: '[Verse]\n追逐梦想的路上\n...' },
  { id: 'edm', name: '电子舞曲', style: '电子音乐,EDM,派对,活力,夜店,节奏感强', lyrics: '[Intro]\n[Verse]\n...' },
  { id: 'chinese', name: '古风情怀', style: '古风,中国风,唯美,诗意,江南,琵琶', lyrics: '[Verse]\n江南烟雨蒙蒙\n...' },
  { id: 'rock', name: '摇滚青春', style: '摇滚,热血,叛逆,青春,吉他,激情', lyrics: '[Verse]\n青春的火焰在燃烧\n...' },
]

export const STRUCTURE_TAGS = ['[Intro]', '[Verse]', '[Pre Chorus]', '[Chorus]', '[Bridge]', '[Outro]', '[Interlude]', '[Hook]', '[Inst]']