export type StorageScope = 'local' | 'backend' | 'hybrid'

export interface SettingMetadata {
  key: string
  category: string
  scope: StorageScope
  encrypted?: boolean
  defaultValue: unknown
  validate: (value: unknown) => boolean
}

export interface SettingsChangeEvent {
  key: string
  category: string
  oldValue: unknown
  newValue: unknown
  scope: StorageScope
  timestamp: number
  source: 'user' | 'sync' | 'default'
}
