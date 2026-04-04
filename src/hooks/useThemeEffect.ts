import { useEffect } from 'react'
import { useAppStore } from '@/stores/app'
import { getThemeById, getDefaultThemeForCategory } from '@/themes/registry'
import type { ThemeCategory } from '@/themes/registry'

const cachedMediaQuery: { current: MediaQueryList | null } = { current: null }

function getMediaQuery(): MediaQueryList {
  if (!cachedMediaQuery.current && typeof window !== 'undefined') {
    cachedMediaQuery.current = window.matchMedia('(prefers-color-scheme: dark)')
  }
  return cachedMediaQuery.current!
}

export function getSystemPreference(): ThemeCategory {
  if (typeof window === 'undefined') return 'dark'
  return getMediaQuery().matches ? 'dark' : 'light'
}

export function getActiveThemeId(themeState: 'system' | string): string {
  if (themeState === 'system') {
    const category = getSystemPreference()
    return getDefaultThemeForCategory(category).id
  }
  return themeState
}

export function resetMediaQueryCache(): void {
  cachedMediaQuery.current = null
}

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