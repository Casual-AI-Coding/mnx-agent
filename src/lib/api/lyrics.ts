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
  return apiClient.post<ApiResponse<LyricsGenerationResponse>>('/lyrics/generate', request, {
    timeout: TIMEOUTS.LYRICS_GENERATION,
  })
}
