import type { MediaSource, MediaType } from './media-types'

const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  audio: '音频',
  image: '图片',
  video: '视频',
  music: '音乐',
  lyrics: '歌词',
}

const MEDIA_SOURCE_LABELS: Record<MediaSource, string> = {
  voice_sync: '语音同步',
  voice_async: '语音异步',
  image_generation: '图像生成',
  video_generation: '视频生成',
  music_generation: '音乐生成',
  lyrics_generation: '歌词生成',
  external_debug: '外部调试',
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const unitBase = 1024
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(unitBase))
  return `${parseFloat((bytes / Math.pow(unitBase, unitIndex)).toFixed(1))} ${FILE_SIZE_UNITS[unitIndex]}`
}

export function getMediaTypeLabel(type: MediaType): string {
  return MEDIA_TYPE_LABELS[type]
}

export function getMediaSourceLabel(source: MediaSource): string {
  return MEDIA_SOURCE_LABELS[source]
}
