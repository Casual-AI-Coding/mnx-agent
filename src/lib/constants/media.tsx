import { Image, Music, Video, FileAudio, RefreshCw } from 'lucide-react'
import type { MediaType, MediaSource } from '@/types/media'

export const MEDIA_TABS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: <RefreshCw className="w-4 h-4" /> },
  { value: 'image', label: '图片', icon: <Image className="w-4 h-4" /> },
  { value: 'audio', label: '音频', icon: <FileAudio className="w-4 h-4" /> },
  { value: 'video', label: '视频', icon: <Video className="w-4 h-4" /> },
  { value: 'music', label: '音乐', icon: <Music className="w-4 h-4" /> },
]

export const TYPE_VARIANTS: Record<MediaType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  image: 'default',
  audio: 'secondary',
  video: 'destructive',
  music: 'outline',
}

export const TYPE_LABELS: Record<MediaType, string> = {
  image: '图片',
  audio: '音频',
  video: '视频',
  music: '音乐',
}

export const SOURCE_LABELS: Record<MediaSource, string> = {
  voice_sync: '语音同步',
  voice_async: '语音异步',
  image_generation: '图像生成',
  video_generation: '视频生成',
  music_generation: '音乐生成',
}

export const TYPE_GRADIENTS: Record<MediaType, string> = {
  image: 'bg-muted/50',
  audio: 'bg-blue-950/50',
  video: 'bg-destructive-950/50',
  music: 'bg-purple-950/50',
}
