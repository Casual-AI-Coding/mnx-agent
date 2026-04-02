import { useEffect } from 'react'
import { useAppStore } from '@/stores/app'
import { getThemeById, getDefaultThemeForCategory } from '@/themes/registry'
import type { ThemeCategory } from '@/themes/registry'

/**
 * Gets the system color scheme preference
 */
export function getSystemPreference(): ThemeCategory {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Resolves the active theme ID from the store theme state
 * - If theme is 'system', returns default theme for current system preference
 * - Otherwise, returns the theme ID directly
 */
export function getActiveThemeId(themeState: 'system' | string): string {
  if (themeState === 'system') {
    const category = getSystemPreference()
    return getDefaultThemeForCategory(category).id
  }
  return themeState
}

/**
 * React hook that applies the current theme to the document root
 * - Adds .theme-{id} class to <html>
 * - Sets data-theme and data-themeCategory attributes
 * - Removes old theme class before adding new one
 */
export function useThemeEffect() {
  const { theme } = useAppStore()

  useEffect(() => {
    const root = document.documentElement
    const activeThemeId = getActiveThemeId(theme)
    const themeMeta = getThemeById(activeThemeId)

    const oldThemeClasses = Array.from(root.classList).filter(c => c.startsWith('theme-'))
    root.classList.remove(...oldThemeClasses)

    root.classList.add(`theme-${activeThemeId}`)

    root.dataset.theme = activeThemeId
    root.dataset.themeCategory = themeMeta?.category ?? 'dark'
  }, [theme])
}