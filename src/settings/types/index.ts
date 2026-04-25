export type { AccountSettings } from './category-account'
export type { ApiSettings } from './category-api'
export type { ExternalEndpoint, ExternalProtocol } from './category-external-api'
export type { UISettings, ThemeSetting, ToastPosition, UIDensity, FontSize } from './category-ui'
export type {
  GenerationSettings,
  TextGenerationSettings,
  VoiceGenerationSettings,
  ImageGenerationSettings,
  MusicGenerationSettings,
  VideoGenerationSettings,
} from './category-generation'
export type { CronSettings, RetryBackoffStrategy, MisfirePolicy } from './category-cron'
export type { WorkflowSettings } from './category-workflow'
export type { NotificationSettings, NotificationEvent } from './category-notification'
export type { MediaSettings } from './category-media'
export type { PrivacySettings } from './category-privacy'
export type { AccessibilitySettings } from './category-accessibility'
export type { StorageScope, SettingMetadata, SettingsChangeEvent } from './storage'

import type { AccountSettings } from './category-account'
import type { ApiSettings } from './category-api'
import type { UISettings } from './category-ui'
import type { GenerationSettings } from './category-generation'
import type { CronSettings } from './category-cron'
import type { WorkflowSettings } from './category-workflow'
import type { NotificationSettings } from './category-notification'
import type { MediaSettings } from './category-media'
import type { PrivacySettings } from './category-privacy'
import type { AccessibilitySettings } from './category-accessibility'

export interface AllSettings {
  account: AccountSettings
  api: ApiSettings
  ui: UISettings
  generation: GenerationSettings
  cron: CronSettings
  workflow: WorkflowSettings
  notification: NotificationSettings
  media: MediaSettings
  privacy: PrivacySettings
  accessibility: AccessibilitySettings
}

export type SettingsCategory = keyof AllSettings
