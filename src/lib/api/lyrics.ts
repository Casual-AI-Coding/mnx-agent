import { apiClient } from './client'
import { TIMEOUTS } from '@/lib/config/constants'
import type { LyricsGenerationRequest, LyricsGenerationResponse } from '@/types/lyrics'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export async function generateLyrics(
  request: LyricsGenerationRequest
): Promise<ApiResponse<LyricsGenerationResponse>> {
  const response = await apiClient.client_.post<ApiResponse<LyricsGenerationResponse>>(
    '/lyrics/generate',
    request,
    { timeout: 60000 }
  )
  return response.data
}