import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getBaseUrl, getHeaders, getApiModeLabel, getApiMode, getApiModeDescription } from '../config'
import { useSettingsStore } from '@/settings/store'
import { API_HOSTS } from '@/types'

const PROXY_BASE_URL = '/api'

vi.mock('@/settings/store', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({
      settings: {
        api: {
          minimaxKey: 'test-key',
          region: 'cn',
          mode: 'proxy',
        },
      },
    })),
  },
}))

vi.mock('@/types', () => ({
  API_HOSTS: {
    cn: 'https://api.minimaxi.com',
    intl: 'https://api.minimax.io',
  },
}))

describe('Config API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBaseUrl', () => {
    it('should return proxy URL when apiMode is proxy', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: 'test-key',
            region: 'cn',
            mode: 'proxy',
          },
        },
      })

      const result = getBaseUrl()
      expect(result).toBe(PROXY_BASE_URL)
    })

    it('should return cn API host when apiMode is direct and region is cn', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: 'test-key',
            region: 'cn',
            mode: 'direct',
          },
        },
      })

      const result = getBaseUrl()
      expect(result).toBe(API_HOSTS.cn)
    })

    it('should return intl API host when apiMode is direct and region is intl', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: 'test-key',
            region: 'intl',
            mode: 'direct',
          },
        },
      })

      const result = getBaseUrl()
      expect(result).toBe(API_HOSTS.intl)
    })
  })

  describe('getHeaders', () => {
    it('should return Authorization header in direct mode with valid ASCII key', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: 'valid-ascii-key-123',
            region: 'cn',
            mode: 'direct',
          },
        },
      })

      const headers = getHeaders() as Record<string, string> as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Authorization']).toBe('Bearer valid-ascii-key-123')
    })

    it('should return X-API-Key header in proxy mode', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: 'test-key',
            region: 'cn',
            mode: 'proxy',
          },
        },
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-API-Key']).toBe('test-key')
      expect(headers['X-Region']).toBe('cn')
    })

    it('should set X-Region to intl when region is intl', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: 'test-key',
            region: 'intl',
            mode: 'proxy',
          },
        },
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['X-Region']).toBe('intl')
    })

    it('should not set auth header when apiKey is empty', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: '',
            region: 'cn',
            mode: 'direct',
          },
        },
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Authorization']).toBeUndefined()
    })

    it('should not set auth header when apiKey contains non-ASCII characters', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: '中文密钥',
            region: 'cn',
            mode: 'direct',
          },
        },
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Authorization']).toBeUndefined()
    })

    it('should handle whitespace-only apiKey', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: '   ',
            region: 'cn',
            mode: 'direct',
          },
        },
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['Authorization']).toBeUndefined()
    })

    it('should trim apiKey before checking', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: '  valid-key  ',
            region: 'cn',
            mode: 'direct',
          },
        },
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer valid-key')
    })
  })

  describe('getApiModeLabel', () => {
    it('should return 直连 for direct mode', () => {
      expect(getApiModeLabel('direct')).toBe('直连')
    })

    it('should return 代理 for proxy mode', () => {
      expect(getApiModeLabel('proxy')).toBe('代理')
    })
  })

  describe('getApiMode', () => {
    it('should return current apiMode from store', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: 'test-key',
            region: 'cn',
            mode: 'proxy',
          },
        },
      })

      expect(getApiMode()).toBe('proxy')
    })

    it('should return direct mode from store', () => {
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        settings: {
          api: {
            minimaxKey: 'test-key',
            region: 'cn',
            mode: 'direct',
          },
        },
      })

      expect(getApiMode()).toBe('direct')
    })
  })

  describe('getApiModeDescription', () => {
    it('should return correct description for direct mode', () => {
      expect(getApiModeDescription('direct')).toBe('直接调用 MiniMax API')
    })

    it('should return correct description for proxy mode', () => {
      expect(getApiModeDescription('proxy')).toBe('通过本地后端代理调用')
    })
  })
})