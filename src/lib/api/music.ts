import { apiClient } from './client'
import { TIMEOUTS } from '@/lib/config/constants'
import type { MusicGenerationRequest, MusicGenerationResponse, MusicPreprocessResponse } from '@/types'

export async function generateMusic(
  request: MusicGenerationRequest
): Promise<MusicGenerationResponse> {
  const response = await apiClient.client_.post<MusicGenerationResponse>(
    '/music/generate',
    {
      ...request,
      output_format: 'url',
    },
    { timeout: TIMEOUTS.MUSIC_GENERATION }
  )
  return response.data
}

export async function preprocessMusic(
  audioFile: File
): Promise<MusicPreprocessResponse> {
  const formData = new FormData()
  formData.append('audio_file', audioFile)

  const response = await apiClient.client_.post<MusicPreprocessResponse>(
    '/music/preprocess',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  return response.data
}