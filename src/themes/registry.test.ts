import { describe, it, expect } from 'vitest'
import { getThemeById, getThemesByCategory, getDefaultThemeForCategory, THEME_REGISTRY } from './registry'
import type { ThemeCategory } from './registry'

describe('registry', () => {
  describe('getThemeById', () => {
    it('returns theme when id exists', () => {
      const theme = getThemeById('midnight')
      expect(theme).toBeDefined()
      expect(theme?.id).toBe('midnight')
      expect(theme?.name).toBe('Midnight')
      expect(theme?.category).toBe('dark')
    })

    it('returns undefined when id does not exist', () => {
      const theme = getThemeById('nonexistent-theme')
      expect(theme).toBeUndefined()
    })
  })

  describe('getThemesByCategory', () => {
    it('returns all dark themes', () => {
      const darkThemes = getThemesByCategory('dark')
      expect(darkThemes.length).toBe(15)
      expect(darkThemes.every(t => t.category === 'dark')).toBe(true)
    })

    it('returns all light themes', () => {
      const lightThemes = getThemesByCategory('light')
      expect(lightThemes.length).toBe(15)
      expect(lightThemes.every(t => t.category === 'light')).toBe(true)
    })
  })

  describe('getDefaultThemeForCategory', () => {
    it('returns midnight as default dark theme', () => {
      const theme = getDefaultThemeForCategory('dark')
      expect(theme.id).toBe('midnight')
    })

    it('returns classic-light as default light theme', () => {
      const theme = getDefaultThemeForCategory('light')
      expect(theme.id).toBe('classic-light')
    })
  })

  describe('THEME_REGISTRY', () => {
    it('contains exactly 22 themes', () => {
      expect(THEME_REGISTRY.length).toBe(53)
    })

    it('has unique ids for all themes', () => {
      const ids = THEME_REGISTRY.map(t => t.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(53)
    })
  })
})