import { getHeaders } from './config'
import type { MusicGenerationRequest, MusicGenerationResponse, MusicPreprocessResponse } from '@/types'

// 音乐 API 必须通过后端代理（需要预处理、文件上传等）
const MUSIC_API_BASE = '/api'

export async function generateMusic(
  request: MusicGenerationRequest
): Promise<MusicGenerationResponse> {
  const response = await fetch(`${MUSIC_API_BASE}/music/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, output_format: 'url' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to generate music')
  }

  return response.json()
}

export async function preprocessMusic(
  audioFile: File
): Promise<MusicPreprocessResponse> {
  const formData = new FormData()
  formData.append('audio_file', audioFile)

  const response = await fetch(`${MUSIC_API_BASE}/music/preprocess`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to preprocess audio')
  }

  return response.json()
}