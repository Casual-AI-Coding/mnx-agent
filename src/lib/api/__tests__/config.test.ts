import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getBaseUrl, getHeaders, getApiModeLabel, getApiMode, getApiModeDescription } from '../config'
import { useAppStore, PROXY_BASE_URL } from '@/stores/app'
import { API_HOSTS } from '@/types'

vi.mock('@/stores/app', () => ({
  useAppStore: {
    getState: vi.fn(),
  },
  PROXY_BASE_URL: '/api',
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
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: 'test-key',
        region: 'cn',
        theme: 'system',
        apiMode: 'proxy',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      const result = getBaseUrl()
      expect(result).toBe(PROXY_BASE_URL)
    })

    it('should return cn API host when apiMode is direct and region is cn', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: 'test-key',
        region: 'cn',
        theme: 'system',
        apiMode: 'direct',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      const result = getBaseUrl()
      expect(result).toBe(API_HOSTS.cn)
    })

    it('should return intl API host when apiMode is direct and region is intl', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: 'test-key',
        region: 'intl',
        theme: 'system',
        apiMode: 'direct',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      const result = getBaseUrl()
      expect(result).toBe(API_HOSTS.intl)
    })
  })

  describe('getHeaders', () => {
    it('should return Authorization header in direct mode with valid ASCII key', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: 'valid-ascii-key-123',
        region: 'cn',
        theme: 'system',
        apiMode: 'direct',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      const headers = getHeaders() as Record<string, string> as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Authorization']).toBe('Bearer valid-ascii-key-123')
    })

    it('should return X-API-Key header in proxy mode', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: 'test-key',
        region: 'cn',
        theme: 'system',
        apiMode: 'proxy',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-API-Key']).toBe('test-key')
      expect(headers['X-Region']).toBe('cn')
    })

    it('should set X-Region to intl when region is intl', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: 'test-key',
        region: 'intl',
        theme: 'system',
        apiMode: 'proxy',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['X-Region']).toBe('intl')
    })

    it('should not set auth header when apiKey is empty', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: '',
        region: 'cn',
        theme: 'system',
        apiMode: 'direct',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Authorization']).toBeUndefined()
    })

    it('should not set auth header when apiKey contains non-ASCII characters', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: '中文密钥',
        region: 'cn',
        theme: 'system',
        apiMode: 'direct',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Authorization']).toBeUndefined()
    })

    it('should handle whitespace-only apiKey', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: '   ',
        region: 'cn',
        theme: 'system',
        apiMode: 'direct',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      const headers = getHeaders() as Record<string, string>
      expect(headers['Authorization']).toBeUndefined()
    })

    it('should trim apiKey before checking', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: '  valid-key  ',
        region: 'cn',
        theme: 'system',
        apiMode: 'direct',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
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
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: 'test-key',
        region: 'cn',
        theme: 'system',
        apiMode: 'proxy',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
      })

      expect(getApiMode()).toBe('proxy')
    })

    it('should return direct mode from store', () => {
      vi.mocked(useAppStore.getState).mockReturnValue({
        apiKey: 'test-key',
        region: 'cn',
        theme: 'system',
        apiMode: 'direct',
        setApiKey: vi.fn(),
        setRegion: vi.fn(),
        setTheme: vi.fn(),
        setApiMode: vi.fn(),
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