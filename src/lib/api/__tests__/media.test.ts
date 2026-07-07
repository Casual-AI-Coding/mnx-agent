import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../client'
import {
  formatFileSize,
  getMediaDownloadUrl,
  getMediaSourceLabel,
  getMediaTypeLabel,
  listMedia,
} from '../media'
import type { MediaListResponse } from '../media-types'

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('media API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('序列化复合筛选参数 when 查询媒体列表 then 数组筛选以逗号分隔传给 API client', async () => {
    const response: MediaListResponse = {
      success: true,
      data: {
        records: [],
        pagination: {
          page: 2,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      },
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce(response)

    const result = await listMedia({
      type: 'audio',
      source: 'voice_sync',
      search: '海岸',
      page: 2,
      limit: 20,
      includeDeleted: true,
      favoriteFilter: ['favorite', 'non-favorite'],
      publicFilter: ['public', 'others-public'],
    })

    expect(result).toEqual(response)
    expect(apiClient.get).toHaveBeenCalledWith('/media', {
      type: 'audio',
      source: 'voice_sync',
      search: '海岸',
      page: 2,
      limit: 20,
      includeDeleted: true,
      favoriteFilter: 'favorite,non-favorite',
      publicFilter: 'public,others-public',
    })
  })

  it('保留媒体展示格式 when 渲染媒体字段 then 返回中文标签和稳定文件大小', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
    expect(getMediaTypeLabel('lyrics')).toBe('歌词')
    expect(getMediaSourceLabel('music_generation')).toBe('音乐生成')
  })

  it('抛出下载错误 when 令牌接口未返回 downloadUrl then 使用服务端错误消息', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: false,
      data: {},
      error: '媒体资源不可下载',
    })

    await expect(getMediaDownloadUrl('media-1')).rejects.toThrow('媒体资源不可下载')
    expect(apiClient.get).toHaveBeenCalledWith('/media/media-1/token')
  })
})
