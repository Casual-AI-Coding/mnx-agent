import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

export interface FormPersistenceConfig<T> {
  storageKey: string
  defaultValue: T
  enabled?: boolean
}

export function useFormPersistence<T extends object>(
  config: FormPersistenceConfig<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const { storageKey, defaultValue, enabled = true } = config
  const fullKey = `form-persistence:${storageKey}`

  const [storedValue, setStoredValue, removeStoredValue] = useLocalStorage<T>(
    fullKey,
    defaultValue
  )

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (!enabled) return
      setStoredValue(value)
    },
    [enabled, setStoredValue]
  )

  const clearValue = useCallback(() => {
    removeStoredValue()
  }, [removeStoredValue])

  return [storedValue, setValue, clearValue]
}

export const DEBUG_FORM_KEYS = {
  TEXT_GENERATION: 'text-generation',
  MUSIC_GENERATION: 'music-generation',
  IMAGE_GENERATION: 'image-generation',
  VIDEO_GENERATION: 'video-generation',
  VIDEO_AGENT: 'video-agent',
  VOICE_SYNC: 'voice-sync',
  VOICE_ASYNC: 'voice-async',
} as const