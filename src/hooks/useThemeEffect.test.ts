import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useThemeEffect, resetMediaQueryCache } from './useThemeEffect'

const mockMatchMedia = vi.fn()

vi.mock('@/settings/store', () => ({
  useSettingsStore: vi.fn(),
}))

import { useSettingsStore } from '@/settings/store'

beforeEach(() => {
  resetMediaQueryCache()
  vi.stubGlobal('matchMedia', mockMatchMedia)
  mockMatchMedia.mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  document.documentElement.className = ''
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.themeCategory
})

describe('useThemeEffect', () => {
  it('applies theme class to document root when theme is specific ID', () => {
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({ settings: { ui: { theme: 'dracula' } } })
      }
      return { settings: { ui: { theme: 'dracula' } } }
    })

    renderHook(() => useThemeEffect())

    expect(document.documentElement.classList.contains('theme-dracula')).toBe(true)
  })

  it('applies midnight when system preference is dark and theme is system', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({ settings: { ui: { theme: 'system' } } })
      }
      return { settings: { ui: { theme: 'system' } } }
    })

    renderHook(() => useThemeEffect())

    expect(document.documentElement.classList.contains('theme-midnight')).toBe(true)
  })

  it('applies classic-light when system preference is light and theme is system', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({ settings: { ui: { theme: 'system' } } })
      }
      return { settings: { ui: { theme: 'system' } } }
    })

    renderHook(() => useThemeEffect())

    expect(document.documentElement.classList.contains('theme-classic-light')).toBe(true)
  })

  it('removes old theme class before adding new one', () => {
    document.documentElement.classList.add('theme-midnight')

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({ settings: { ui: { theme: 'nord' } } })
      }
      return { settings: { ui: { theme: 'nord' } } }
    })

    renderHook(() => useThemeEffect())

    expect(document.documentElement.classList.contains('theme-midnight')).toBe(false)
    expect(document.documentElement.classList.contains('theme-nord')).toBe(true)
  })

  it('sets data attributes on document root', () => {
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({ settings: { ui: { theme: 'github-dark' } } })
      }
      return { settings: { ui: { theme: 'github-dark' } } }
    })

    renderHook(() => useThemeEffect())

    expect(document.documentElement.dataset.theme).toBe('github-dark')
    expect(document.documentElement.dataset.themeCategory).toBe('dark')
  })
})