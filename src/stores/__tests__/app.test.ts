import { renderHook, act } from '@testing-library/react'
import { useAppStore, PROXY_BASE_URL } from '../app'
import type { ApiMode } from '../app'

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      apiKey: '',
      region: 'cn',
      theme: 'system',
      apiMode: 'direct',
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAppStore())
      expect(result.current.apiKey).toBe('')
      expect(result.current.region).toBe('cn')
      expect(result.current.theme).toBe('system')
      expect(result.current.apiMode).toBe('direct')
    })
  })

  describe('setApiKey', () => {
    it('should set API key', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setApiKey('test-api-key')
      })

      expect(result.current.apiKey).toBe('test-api-key')
    })

    it('should update API key', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setApiKey('initial-key')
        result.current.setApiKey('updated-key')
      })

      expect(result.current.apiKey).toBe('updated-key')
    })

    it('should allow clearing API key', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setApiKey('test-key')
        result.current.setApiKey('')
      })

      expect(result.current.apiKey).toBe('')
    })
  })

  describe('setRegion', () => {
    it('should set region to cn', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setRegion('cn')
      })

      expect(result.current.region).toBe('cn')
    })

    it('should set region to intl', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setRegion('intl')
      })

      expect(result.current.region).toBe('intl')
    })
  })

  describe('setTheme', () => {
    it('should set theme to light', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTheme('light')
      })

      expect(result.current.theme).toBe('light')
    })

    it('should set theme to dark', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })

    it('should set theme to system', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTheme('dark')
        result.current.setTheme('system')
      })

      expect(result.current.theme).toBe('system')
    })
  })

  describe('setApiMode', () => {
    it('should set API mode to direct', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setApiMode('direct')
      })

      expect(result.current.apiMode).toBe('direct')
    })

    it('should set API mode to proxy', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setApiMode('proxy')
      })

      expect(result.current.apiMode).toBe('proxy')
    })
  })

  describe('multiple setters', () => {
    it('should handle multiple state updates', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setApiKey('new-key')
        result.current.setRegion('intl')
        result.current.setTheme('dark')
        result.current.setApiMode('proxy')
      })

      expect(result.current.apiKey).toBe('new-key')
      expect(result.current.region).toBe('intl')
      expect(result.current.theme).toBe('dark')
      expect(result.current.apiMode).toBe('proxy')
    })
  })
})

describe('constants', () => {
  it('should export correct PROXY_BASE_URL', () => {
    expect(PROXY_BASE_URL).toBe('/api')
  })
})

describe('ApiMode type', () => {
  it('should accept direct mode', () => {
    const mode: ApiMode = 'direct'
    expect(mode).toBe('direct')
  })

  it('should accept proxy mode', () => {
    const mode: ApiMode = 'proxy'
    expect(mode).toBe('proxy')
  })
})