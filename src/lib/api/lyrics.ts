import { apiClient } from './client'
import { TIMEOUTS } from '@/lib/config/constants'
import type { LyricsGenerationRequest, LyricsGenerationResponse } from '@/types/lyrics'

export async function generateLyrics(
  request: LyricsGenerationRequest
): Promise<LyricsGenerationResponse> {
  const response = await apiClient.client_.post<LyricsGenerationResponse>(
    '/lyrics/generate',
    request,
    { timeout: TIMEOUTS.LYRICS_GENERATION }
  )
  return response.data
}