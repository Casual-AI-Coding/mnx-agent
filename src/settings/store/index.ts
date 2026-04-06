// src/settings/store/index.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AllSettings, SettingsCategory } from '@/settings/types'
import { DEFAULT_SETTINGS, getDefaultForCategory } from './defaults'

interface SettingsState {
  // Settings data
  settings: AllSettings
  
  // Loading states
  isLoading: boolean
  isSaving: boolean
  lastSyncedAt: Date | null
  
  // Error state
  syncError: Error | null
  
  // Dirty tracking
  dirtyCategories: Set<SettingsCategory>
  
  // Actions
  initialize: () => Promise<void>
  setSetting: <C extends SettingsCategory, K extends keyof AllSettings[C]>(
    category: C,
    key: K,
    value: AllSettings[C][K]
  ) => void
  setCategory: <C extends SettingsCategory>(
    category: C,
    values: Partial<AllSettings[C]>
  ) => void
  saveSettings: (category?: SettingsCategory) => Promise<void>
  resetCategory: (category: SettingsCategory) => void
  resetAll: () => void
  
  // Getters
  getSetting: <C extends SettingsCategory, K extends keyof AllSettings[C]>(
    category: C,
    key: K
  ) => AllSettings[C][K]
  getCategory: <C extends SettingsCategory>(category: C) => AllSettings[C]
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      isSaving: false,
      lastSyncedAt: null,
      syncError: null,
      dirtyCategories: new Set(),
      
      initialize: async () => {
        set({ isLoading: true, syncError: null })
        try {
          // Load from backend API
          const { getSettings } = await import('@/lib/api/settings')
          const response = await getSettings()
          
          if (response.success && response.data) {
            const serverSettings = response.data as Partial<AllSettings>
            set(state => ({
              settings: { 
                ...state.settings, 
                ...serverSettings,
                api: serverSettings.api ?? state.settings.api
              },
              lastSyncedAt: new Date(),
              dirtyCategories: new Set(),
            }))
          }
        } catch (error) {
          set({  syncError: error as Error })
        } finally {
          set({ isLoading: false })
        }
      },
      
      setSetting: (category, key, value) => {
        set(state => {
          const newCategory = { ...state.settings[category], [key]: value }
          const newSettings = { ...state.settings, [category]: newCategory }
          const newDirty = new Set(state.dirtyCategories)
          newDirty.add(category)
          
          return {
            settings: newSettings as AllSettings,
            dirtyCategories: newDirty,
          }
        })
      },
      
      setCategory: (category, values) => {
        set(state => {
          const newCategory = { ...state.settings[category], ...values }
          const newSettings = { ...state.settings, [category]: newCategory }
          const newDirty = new Set(state.dirtyCategories)
          newDirty.add(category)
          
          return {
            settings: newSettings as AllSettings,
            dirtyCategories: newDirty,
          }
        })
      },
      
      saveSettings: async (category) => {
        const state = get()
        const categoriesToSave = category 
          ? [category] 
          : Array.from(state.dirtyCategories)
        
        if (categoriesToSave.length === 0) return
        
        set({ isSaving: true, syncError: null })
        
        try {
          const { updateSettings } = await import('@/lib/api/settings')
          
          for (const cat of categoriesToSave) {
            await updateSettings(cat, state.settings[cat] as unknown as Record<string, unknown>)
          }
          
          set(state => {
            const newDirty = new Set(state.dirtyCategories)
            categoriesToSave.forEach(c => newDirty.delete(c))
            
            return {
              isSaving: false,
              lastSyncedAt: new Date(),
              dirtyCategories: newDirty,
            }
          })
        } catch (error) {
          set({ isSaving: false, syncError: error as Error })
          throw error
        }
      },
      
      resetCategory: (category) => {
        set(state => ({
          settings: { ...state.settings, [category]: getDefaultForCategory(category) },
          dirtyCategories: new Set([...state.dirtyCategories, category]),
        }))
      },
      
      resetAll: () => {
        set({
          settings: DEFAULT_SETTINGS,
          dirtyCategories: new Set(),
        })
      },
      
      getSetting: (category, key) => {
        return get().settings[category][key]
      },
      
      getCategory: (category) => {
        return get().settings[category]
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const { api, ...safeSettings } = state.settings
        return {
          settings: safeSettings as Partial<AllSettings>,
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Merge localStorage recovered data with defaults
          // api field is excluded from localStorage (see partialize above)
          // so api will be undefined here and will use DEFAULT_SETTINGS.api temporarily
          // The actual API key will be loaded from backend via initialize() method
          state.settings = {
            ...DEFAULT_SETTINGS,
            ...state.settings,
            // Don't force override api - let initialize() load from backend
            // If state.settings.api exists (edge case), preserve it; otherwise use defaults
            api: state.settings.api ?? DEFAULT_SETTINGS.api,
          }
        }
      },
    }
  )
)