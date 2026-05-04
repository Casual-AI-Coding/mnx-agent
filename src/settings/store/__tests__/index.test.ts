import { renderHook, act } from '@testing-library/react'
import { useSettingsStore } from '../index'
import { DEFAULT_SETTINGS, getDefaultForCategory } from '../defaults'
import type { AllSettings, SettingsCategory } from '../types'

// Mock localStorage for persist middleware
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    getStore: () => store,
    setStore: (s: Record<string, string>) => { store = s },
  }
})()
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock the settings API module
vi.mock('@/lib/api/settings', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}))

import { getSettings, updateSettings } from '@/lib/api/settings'

describe('useSettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.setStore({})
    localStorageMock.getItem.mockReturnValue(null)

    // Reset store state before each test
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      isSaving: false,
      lastSyncedAt: null,
      syncError: null,
      dirtyCategories: new Set(),
    })
  })

  describe('initial state', () => {
    it('should have correct initial settings', () => {
      const { result } = renderHook(() => useSettingsStore())
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('should have default isLoading as false', () => {
      const { result } = renderHook(() => useSettingsStore())
      expect(result.current.isLoading).toBe(false)
    })

    it('should have default isSaving as false', () => {
      const { result } = renderHook(() => useSettingsStore())
      expect(result.current.isSaving).toBe(false)
    })

    it('should have null lastSyncedAt', () => {
      const { result } = renderHook(() => useSettingsStore())
      expect(result.current.lastSyncedAt).toBeNull()
    })

    it('should have null syncError', () => {
      const { result } = renderHook(() => useSettingsStore())
      expect(result.current.syncError).toBeNull()
    })

    it('should have empty dirtyCategories Set', () => {
      const { result } = renderHook(() => useSettingsStore())
      expect(result.current.dirtyCategories.size).toBe(0)
    })
  })

  describe('setSetting action', () => {
    it('should update a single setting', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setSetting('api', 'minimaxKey', 'test-key-123')
      })

      expect(result.current.settings.api.minimaxKey).toBe('test-key-123')
    })

    it('should mark category as dirty', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setSetting('api', 'region', 'international')
      })

      expect(result.current.dirtyCategories.has('api')).toBe(true)
    })

    it('should preserve other settings in same category', () => {
      const { result } = renderHook(() => useSettingsStore())
      const originalTimeout = result.current.settings.api.timeout

      act(() => {
        result.current.setSetting('api', 'minimaxKey', 'new-key')
      })

      expect(result.current.settings.api.timeout).toBe(originalTimeout)
    })
  })

  describe('setCategory action', () => {
    it('should update multiple settings in a category', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setCategory('ui', { theme: 'dark', sidebarCollapsed: true })
      })

      expect(result.current.settings.ui.theme).toBe('dark')
      expect(result.current.settings.ui.sidebarCollapsed).toBe(true)
    })

    it('should mark category as dirty', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setCategory('ui', { theme: 'dark' })
      })

      expect(result.current.dirtyCategories.has('ui')).toBe(true)
    })

    it('should merge with existing category settings', () => {
      const { result } = renderHook(() => useSettingsStore())
      const originalFontSize = result.current.settings.ui.fontSize

      act(() => {
        result.current.setCategory('ui', { theme: 'light' })
      })

      expect(result.current.settings.ui.fontSize).toBe(originalFontSize)
    })

    it('should handle full category replacement', () => {
      const { result } = renderHook(() => useSettingsStore())

      const newApiSettings = {
        minimaxKey: 'full-replace-key',
        region: 'international' as const,
        mode: 'proxy' as const,
        timeout: 60000,
        retryAttempts: 5,
        retryDelay: 2000,
      }

      act(() => {
        result.current.setCategory('api', newApiSettings)
      })

      expect(result.current.settings.api).toMatchObject(newApiSettings)
    })
  })

  describe('getSetting action', () => {
    it('should return a single setting value', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setSetting('api', 'region', 'cn')
      })

      expect(result.current.getSetting('api', 'region')).toBe('cn')
    })

    it('should reflect current state', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setSetting('api', 'minimaxKey', 'dynamic-key')
      })

      expect(result.current.getSetting('api', 'minimaxKey')).toBe('dynamic-key')
    })
  })

  describe('getCategory action', () => {
    it('should return entire category', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setCategory('ui', { theme: 'dark', density: 'compact' })
      })

      const uiCategory = result.current.getCategory('ui')
      expect(uiCategory.theme).toBe('dark')
      expect(uiCategory.density).toBe('compact')
    })

    it('should return copy of category state', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setCategory('account', { username: 'testuser' })
      })

      const account1 = result.current.getCategory('account')
      act(() => {
        result.current.setSetting('account', 'email', 'test@example.com')
      })
      const account2 = result.current.getCategory('account')

      expect(account1.email).toBeNull()
      expect(account2.email).toBe('test@example.com')
    })
  })

  describe('initialize action', () => {
    it('should load settings from API', async () => {
      const mockServerSettings: Partial<AllSettings> = {
        ui: { theme: 'dark', sidebarCollapsed: true } as any,
        account: { username: 'server-user' } as any,
      }

      vi.mocked(getSettings).mockResolvedValue({
        success: true,
        data: mockServerSettings,
      })

      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.settings.ui.theme).toBe('dark')
      expect(result.current.settings.account.username).toBe('server-user')
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(getSettings).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.syncError).toBeInstanceOf(Error)
      expect(result.current.syncError?.message).toBe('Network error')
      expect(result.current.isLoading).toBe(false)
    })

    it('should set lastSyncedAt on success', async () => {
      vi.mocked(getSettings).mockResolvedValue({ success: true, data: {} })

      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.lastSyncedAt).toBeInstanceOf(Date)
    })
  })

  describe('saveSettings action', () => {
    it('should save dirty categories to API', async () => {
      act(() => {
        useSettingsStore.setState({
          dirtyCategories: new Set(['api', 'ui']),
        })
      })

      vi.mocked(updateSettings).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await result.current.saveSettings()
      })

      expect(updateSettings).toHaveBeenCalledTimes(2)
      expect(updateSettings).toHaveBeenCalledWith('api', expect.any(Object))
      expect(updateSettings).toHaveBeenCalledWith('ui', expect.any(Object))
    })

    it('should save specific category when provided', async () => {
      act(() => {
        useSettingsStore.setState({
          dirtyCategories: new Set(['api', 'ui', 'account']),
        })
      })

      vi.mocked(updateSettings).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await result.current.saveSettings('api')
      })

      expect(updateSettings).toHaveBeenCalledTimes(1)
      expect(updateSettings).toHaveBeenCalledWith('api', expect.any(Object))
    })

    it('should do nothing when no dirty categories', async () => {
      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await result.current.saveSettings()
      })

      expect(updateSettings).not.toHaveBeenCalled()
    })

    it('should clear dirty categories on success', async () => {
      act(() => {
        useSettingsStore.setState({
          dirtyCategories: new Set(['api', 'ui']),
        })
      })

      vi.mocked(updateSettings).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await result.current.saveSettings()
      })

      expect(result.current.dirtyCategories.size).toBe(0)
    })

    it('should set lastSyncedAt on success', async () => {
      act(() => {
        useSettingsStore.setState({
          dirtyCategories: new Set(['api']),
        })
      })

      vi.mocked(updateSettings).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await result.current.saveSettings()
      })

      expect(result.current.lastSyncedAt).toBeInstanceOf(Date)
    })

    it('should handle save errors', async () => {
      act(() => {
        useSettingsStore.setState({
          dirtyCategories: new Set(['api']),
        })
      })

      vi.mocked(updateSettings).mockRejectedValue(new Error('Save failed'))

      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await expect(result.current.saveSettings()).rejects.toThrow('Save failed')
      })

      expect(result.current.syncError).toBeInstanceOf(Error)
      expect(result.current.syncError?.message).toBe('Save failed')
      expect(result.current.isSaving).toBe(false)
    })
  })

  describe('resetCategory action', () => {
    it('should reset a category to defaults', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setCategory('ui', { theme: 'dark', density: 'compact' })
      })

      act(() => {
        result.current.resetCategory('ui')
      })

      expect(result.current.settings.ui).toEqual(getDefaultForCategory('ui'))
    })

    it('should mark category as dirty after reset', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.resetCategory('ui')
      })

      expect(result.current.dirtyCategories.has('ui')).toBe(true)
    })

    it('should not affect other categories', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setSetting('api', 'region', 'international')
      })

      act(() => {
        result.current.resetCategory('ui')
      })

      expect(result.current.settings.api.region).toBe('international')
    })
  })

  describe('resetAll action', () => {
    it('should reset all settings to defaults', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setCategory('ui', { theme: 'dark' })
        result.current.setCategory('api', { minimaxKey: 'test-key' })
        result.current.setSetting('account', 'username', 'testuser')
      })

      act(() => {
        result.current.resetAll()
      })

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('should clear all dirty categories', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setSetting('ui', 'theme', 'dark')
        result.current.setSetting('api', 'minimaxKey', 'key')
      })

      expect(result.current.dirtyCategories.size).toBe(2)

      act(() => {
        result.current.resetAll()
      })

      expect(result.current.dirtyCategories.size).toBe(0)
    })
  })

  describe('resetSync action', () => {
    it('should reset lastSyncedAt to null', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        useSettingsStore.setState({ lastSyncedAt: new Date() })
      })

      act(() => {
        result.current.resetSync()
      })

      expect(result.current.lastSyncedAt).toBeNull()
    })

    it('should reset syncError to null', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        useSettingsStore.setState({ syncError: new Error('Some error') })
      })

      act(() => {
        result.current.resetSync()
      })

      expect(result.current.syncError).toBeNull()
    })

    it('should not affect settings', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setSetting('api', 'minimaxKey', 'test-key')
      })

      const settingsBefore = result.current.settings

      act(() => {
        result.current.resetSync()
      })

      expect(result.current.settings).toEqual(settingsBefore)
    })
  })

  describe('dirty tracking', () => {
    it('should track multiple dirty categories', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setSetting('ui', 'theme', 'dark')
        result.current.setSetting('api', 'region', 'international')
        result.current.setSetting('account', 'username', 'test')
      })

      expect(result.current.dirtyCategories.size).toBe(3)
      expect(result.current.dirtyCategories.has('ui')).toBe(true)
      expect(result.current.dirtyCategories.has('api')).toBe(true)
      expect(result.current.dirtyCategories.has('account')).toBe(true)
    })

    it('should not duplicate dirty category', () => {
      const { result } = renderHook(() => useSettingsStore())

      act(() => {
        result.current.setSetting('ui', 'theme', 'dark')
        result.current.setSetting('ui', 'sidebarCollapsed', true)
      })

      expect(result.current.dirtyCategories.size).toBe(1)
      expect(result.current.dirtyCategories.has('ui')).toBe(true)
    })

    it('should clear specific category from dirty set after save', async () => {
      act(() => {
        useSettingsStore.setState({
          dirtyCategories: new Set(['api', 'ui', 'account']),
        })
      })

      vi.mocked(updateSettings).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useSettingsStore())

      await act(async () => {
        await result.current.saveSettings('api')
      })

      expect(result.current.dirtyCategories.has('api')).toBe(false)
      expect(result.current.dirtyCategories.has('ui')).toBe(true)
      expect(result.current.dirtyCategories.has('account')).toBe(true)
    })
  })
})
