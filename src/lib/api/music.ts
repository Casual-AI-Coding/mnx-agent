import { apiClient } from './client'
import type { MusicGenerationRequest, MusicGenerationResponse, MusicPreprocessResponse } from '@/types'

export async function generateMusic(
  request: MusicGenerationRequest
): Promise<MusicGenerationResponse> {
  return apiClient.post<MusicGenerationResponse>('/music/generate', {
    ...request,
    output_format: 'url',
  })
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