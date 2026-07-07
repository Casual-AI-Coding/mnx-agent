import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TIMEOUTS } from '../../config/constants'
import { apiClient } from '../client'
import { generateLyrics } from '../lyrics'
import type { LyricsGenerationRequest, LyricsGenerationResponse } from '../../../types/lyrics'

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

describe('lyrics API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('提交写歌请求 when 调用 generateLyrics then 返回服务端响应', async () => {
    const request: LyricsGenerationRequest = {
      mode: 'write_full_song',
      prompt: '写一首关于清晨海岸的歌',
      title: '清晨海岸',
    }
    const lyricsResponse: LyricsGenerationResponse = {
      song_title: '清晨海岸',
      style_tags: ['dream pop', 'ambient'],
      lyrics: '[Verse 1]\n海风吹过黎明',
      base_resp: {
        status_code: 0,
        status_msg: 'success',
      },
    }
    const apiResponse = {
      success: true,
      data: lyricsResponse,
    }

    vi.mocked(apiClient.post).mockResolvedValueOnce(apiResponse)

    const result = await generateLyrics(request)

    expect(result).toEqual(apiResponse)
    expect(apiClient.post).toHaveBeenCalledWith('/lyrics/generate', request, {
      timeout: TIMEOUTS.LYRICS_GENERATION,
    })
  })

  it('返回服务端错误响应 when 歌词生成失败 then 保留 API 错误契约', async () => {
    const request: LyricsGenerationRequest = {
      mode: 'edit',
      lyrics: '旧歌词',
    }
    const apiResponse = {
      success: false,
      error: 'lyrics is required for edit mode, prompt is required for write_full_song mode',
    }

    vi.mocked(apiClient.post).mockResolvedValueOnce(apiResponse)

    const result = await generateLyrics(request)

    expect(result).toEqual(apiResponse)
  })
})
