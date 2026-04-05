// src/settings/store/hooks.ts
import { useSettingsStore } from './index'
import type { AllSettings, SettingsCategory } from '@/settings/types'

// Hook for accessing a single setting
export function useSetting<C extends SettingsCategory, K extends keyof AllSettings[C]>(
  category: C,
  key: K
): [AllSettings[C][K], (value: AllSettings[C][K]) => void] {
  const value = useSettingsStore(state => state.settings[category][key])
  const setSetting = useSettingsStore(state => state.setSetting)
  
  const setValue = (newValue: AllSettings[C][K]) => {
    setSetting(category, key, newValue)
  }
  
  return [value, setValue]
}

// Hook for accessing an entire category
export function useCategory<C extends SettingsCategory>(
  category: C
): [AllSettings[C], (values: Partial<AllSettings[C]>) => void] {
  const value = useSettingsStore(state => state.settings[category])
  const setCategory = useSettingsStore(state => state.setCategory)
  
  const setValue = (values: Partial<AllSettings[C]>) => {
    setCategory(category, values)
  }
  
  return [value, setValue]
}

// Hook for accessing all settings
export function useAllSettings() {
  return useSettingsStore(state => ({
    settings: state.settings,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    dirtyCategories: state.dirtyCategories,
    initialize: state.initialize,
    saveSettings: state.saveSettings,
    resetCategory: state.resetCategory,
  }))
}

// Hook for checking if there are unsaved changes
export function useHasUnsavedChanges(): boolean {
  return useSettingsStore(state => state.dirtyCategories.size > 0)
}