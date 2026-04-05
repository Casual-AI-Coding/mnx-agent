# Settings System Design Specification

> **Version**: 1.0.0  
> **Date**: 2026-04-05  
> **Status**: Design Phase  
> **Type**: Architecture Specification (specs/)

---

## Executive Summary

This specification defines a comprehensive, production-grade settings system for mnx-agent that consolidates fragmented configuration (AppStore, AuthStore, scattered page state) into a unified, extensible architecture following SOLID principles.

**Key Design Decisions**:
| Decision | Choice | Rationale |
|----------|--------|-----------|
| State Management | Zustand + Slices | Matches existing pattern, enables selective persistence |
| Storage Strategy | Hybrid (localStorage + Backend) | UI prefs locally, user data server-side |
| Validation | Zod per category | Type-safe, runtime validation |
| Architecture | CategoryStrategy pattern | Extensible, supports plugin architecture |
| Sync Strategy | Optimistic UI + Background sync | Responsive UX with consistency guarantees |

---

## 1. Settings Categories

### 1.1 Category Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Settings Category Hierarchy                  │
├─────────────────────────────────────────────────────────────────┤
│ account.*          → User profile, credentials, security        │
│ api.*              → MiniMax API configuration (key, region)    │
│ ui.*               → Theme, layout, animations                  │
│ generation.*       → Default parameters for all AI modules      │
│   ├── generation.text.*                                         │
│   ├── generation.voice.*                                        │
│   ├── generation.image.*                                        │
│   ├── generation.music.*                                        │
│   └── generation.video.*                                        │
│ cron.*             → Scheduler defaults, timezone, retry        │
│ workflow.*         → Builder defaults, node preferences         │
│ notification.*     → WebSocket, Webhook, Toast preferences      │
│ media.*            → Storage path, auto-save, naming patterns   │
│ privacy.*          → Session timeout, data retention            │
│ accessibility.*    → High contrast, font size, screen reader    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Detailed Schema per Category

#### Category: account
User profile and security settings.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `account.username` | string | - | backend | Username |
| `account.email` | string | - | backend | Email address |
| `account.role` | enum | - | backend | User role (user/pro/admin/super) |
| `account.locale` | string | 'zh-CN' | local | UI language |
| `account.timezone` | string | 'Asia/Shanghai' | hybrid | Primary timezone |
| `account.sessionTimeout` | number | 30 | hybrid | Auto-logout minutes (0=never) |
| `account.lastPasswordChange` | date | - | backend | Security tracking |

#### Category: api
MiniMax API configuration.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `api.minimaxKey` | string | '' | backend | API Key (encrypted storage) |
| `api.region` | enum | 'cn' | backend | cn / intl |
| `api.mode` | enum | 'direct' | local | direct / proxy |
| `api.timeout` | number | 30000 | hybrid | Default request timeout ms |
| `api.retryAttempts` | number | 3 | hybrid | Max retry attempts |
| `api.retryDelay` | number | 1000 | hybrid | Initial retry delay ms |

#### Category: ui
Interface appearance and behavior.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `ui.theme` | enum | 'system' | local | system / theme-id |
| `ui.sidebarCollapsed` | boolean | false | local | Sidebar collapsed state |
| `ui.sidebarWidth` | number | 280 | local | Sidebar width px |
| `ui.showAnimations` | boolean | true | local | Enable transitions |
| `ui.reducedMotion` | boolean | false | local | Respect prefers-reduced-motion |
| `ui.toastPosition` | enum | 'bottom-right' | local | Toast notification position |
| `ui.density` | enum | 'comfortable' | local | compact / comfortable / spacious |
| `ui.fontSize` | enum | 'medium' | local | small / medium / large |

#### Category: generation.text
Default text generation parameters.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `generation.text.model` | string | 'MiniMax-Text-01' | hybrid | Default model |
| `generation.text.temperature` | number | 0.7 | hybrid | Sampling temperature |
| `generation.text.topP` | number | 0.9 | hybrid | Nucleus sampling |
| `generation.text.maxTokens` | number | 2048 | hybrid | Max output tokens |
| `generation.text.promptCaching` | boolean | true | hybrid | Enable prompt caching |
| `generation.text.streamOutput` | boolean | true | hybrid | Stream responses |

#### Category: generation.voice
Default voice synthesis parameters.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `generation.voice.model` | string | 'speech-01-turbo' | hybrid | Default TTS model |
| `generation.voice.voiceId` | string | 'male-qn-qingse' | hybrid | Default voice |
| `generation.voice.emotion` | string | 'neutral' | hybrid | Default emotion |
| `generation.voice.speed` | number | 1.0 | hybrid | Speech speed (0.5-2.0) |
| `generation.voice.pitch` | number | 0 | hybrid | Pitch shift (-10 to 10) |
| `generation.voice.volume` | number | 1.0 | hybrid | Volume multiplier |

#### Category: generation.image
Default image generation parameters.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `generation.image.model` | string | 'image-01' | hybrid | Default image model |
| `generation.image.aspectRatio` | string | '1:1' | hybrid | Default aspect ratio |
| `generation.image.numImages` | number | 1 | hybrid | Images per request |
| `generation.image.promptOptimizer` | boolean | true | hybrid | Auto-optimize prompts |
| `generation.image.style` | string | '' | hybrid | Default style preset |

#### Category: generation.music
Default music generation parameters.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `generation.music.model` | string | 'music-01' | hybrid | Default music model |
| `generation.music.optimizeLyrics` | boolean | true | hybrid | Auto-optimize lyrics |
| `generation.music.duration` | number | 30 | hybrid | Default duration seconds |

#### Category: generation.video
Default video generation parameters.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `generation.video.model` | string | 'video-01' | hybrid | Default video model |
| `generation.video.quality` | enum | 'standard' | hybrid | standard / high |
| `generation.video.duration` | number | 5 | hybrid | Default duration seconds |

#### Category: cron
Cron scheduler defaults.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `cron.defaultTimezone` | string | 'Asia/Shanghai' | hybrid | Default job timezone |
| `cron.timeoutSeconds` | number | 300 | hybrid | Default timeout |
| `cron.maxRetries` | number | 3 | hybrid | Default retry count |
| `cron.retryBackoff` | enum | 'exponential' | hybrid | exponential / linear / fixed |
| `cron.concurrency` | number | 5 | hybrid | Max parallel jobs |
| `cron.misfirePolicy` | enum | 'fire_once' | hybrid | fire_once / ignore / fire_all |

#### Category: workflow
Workflow builder preferences.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `workflow.autoLayout` | boolean | true | local | Auto-layout on open |
| `workflow.snapToGrid` | boolean | true | local | Grid snapping |
| `workflow.gridSize` | number | 20 | local | Grid size px |
| `workflow.showMinimap` | boolean | true | local | Show mini map |
| `workflow.defaultZoom` | number | 1 | local | Initial zoom level |
| `workflow.confirmDelete` | boolean | true | local | Confirm node deletion |

#### Category: notification
Notification preferences.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `notification.webhookEnabled` | boolean | false | hybrid | Enable webhooks |
| `notification.webhookUrl` | string | '' | backend | Webhook endpoint |
| `notification.webhookSecret` | string | '' | backend | HMAC secret |
| `notification.emailEnabled` | boolean | false | backend | Email notifications |
| `notification.desktopEnabled` | boolean | true | local | Browser notifications |
| `notification.soundEnabled` | boolean | false | local | Sound on notification |
| `notification.events` | array | ['failure'] | hybrid | Events to notify |

#### Category: media
Media storage and management.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `media.storagePath` | string | './data/media' | backend | Storage directory |
| `media.autoSave` | boolean | true | hybrid | Auto-save generations |
| `media.namingPattern` | string | '{timestamp}_{type}' | hybrid | File naming template |
| `media.maxFileSize` | number | 100 | hybrid | Max file size MB |
| `media.allowedTypes` | array | ['*'] | backend | Allowed MIME types |
| `media.retentionDays` | number | 0 | hybrid | Auto-delete days (0=keep) |
| `media.thumbnailSize` | number | 200 | local | Thumbnail size px |

#### Category: privacy
Privacy and security settings.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `privacy.shareUsageData` | boolean | false | backend | Analytics consent |
| `privacy.autoRefreshToken` | boolean | true | hybrid | Auto-refresh tokens |
| `privacy.secureExport` | boolean | true | hybrid | Encrypt exports |
| `privacy.auditLogRetention` | number | 90 | backend | Audit log days |

#### Category: accessibility
Accessibility features.

| Key | Type | Default | Scope | Description |
|-----|------|---------|-------|-------------|
| `accessibility.highContrast` | boolean | false | local | High contrast mode |
| `accessibility.screenReader` | boolean | false | local | Screen reader optimizations |
| `accessibility.keyboardShortcuts` | boolean | true | local | Enable shortcuts |
| `accessibility.focusIndicators` | boolean | true | local | Enhanced focus visibility |

---

## 2. TypeScript Interface Design

### 2.1 Interface Segregation Pattern

Each category has its own interface for maximum flexibility.

```typescript
// settings/types/category-account.ts
export interface AccountSettings {
  username: string
  email: string | null
  role: UserRole
  locale: string
  timezone: string
  sessionTimeout: number
  lastPasswordChange?: Date
}

// settings/types/category-api.ts
export interface ApiSettings {
  minimaxKey: string
  region: 'cn' | 'intl'
  mode: 'direct' | 'proxy'
  timeout: number
  retryAttempts: number
  retryDelay: number
}

// settings/types/category-ui.ts
export type ThemeSetting = 'system' | string
export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type UIDensity = 'compact' | 'comfortable' | 'spacious'
export type FontSize = 'small' | 'medium' | 'large'

export interface UISettings {
  theme: ThemeSetting
  sidebarCollapsed: boolean
  sidebarWidth: number
  showAnimations: boolean
  reducedMotion: boolean
  toastPosition: ToastPosition
  density: UIDensity
  fontSize: FontSize
}

// settings/types/category-generation.ts
export interface TextGenerationSettings {
  model: string
  temperature: number
  topP: number
  maxTokens: number
  promptCaching: boolean
  streamOutput: boolean
}

export interface VoiceGenerationSettings {
  model: string
  voiceId: string
  emotion: string
  speed: number
  pitch: number
  volume: number
}

export interface ImageGenerationSettings {
  model: string
  aspectRatio: string
  numImages: number
  promptOptimizer: boolean
  style: string
}

export interface MusicGenerationSettings {
  model: string
  optimizeLyrics: boolean
  duration: number
}

export interface VideoGenerationSettings {
  model: string
  quality: 'standard' | 'high'
  duration: number
}

export interface GenerationSettings {
  text: TextGenerationSettings
  voice: VoiceGenerationSettings
  image: ImageGenerationSettings
  music: MusicGenerationSettings
  video: VideoGenerationSettings
}

// settings/types/category-cron.ts
export type RetryBackoffStrategy = 'exponential' | 'linear' | 'fixed'
export type MisfirePolicy = 'fire_once' | 'ignore' | 'fire_all'

export interface CronSettings {
  defaultTimezone: string
  timeoutSeconds: number
  maxRetries: number
  retryBackoff: RetryBackoffStrategy
  concurrency: number
  misfirePolicy: MisfirePolicy
}

// settings/types/category-workflow.ts
export interface WorkflowSettings {
  autoLayout: boolean
  snapToGrid: boolean
  gridSize: number
  showMinimap: boolean
  defaultZoom: number
  confirmDelete: boolean
}

// settings/types/category-notification.ts
export type NotificationEvent = 'start' | 'success' | 'failure' | 'retry'

export interface NotificationSettings {
  webhookEnabled: boolean
  webhookUrl: string
  webhookSecret: string
  emailEnabled: boolean
  desktopEnabled: boolean
  soundEnabled: boolean
  events: NotificationEvent[]
}

// settings/types/category-media.ts
export interface MediaSettings {
  storagePath: string
  autoSave: boolean
  namingPattern: string
  maxFileSize: number
  allowedTypes: string[]
  retentionDays: number
  thumbnailSize: number
}

// settings/types/category-privacy.ts
export interface PrivacySettings {
  shareUsageData: boolean
  autoRefreshToken: boolean
  secureExport: boolean
  auditLogRetention: number
}

// settings/types/category-accessibility.ts
export interface AccessibilitySettings {
  highContrast: boolean
  screenReader: boolean
  keyboardShortcuts: boolean
  focusIndicators: boolean
}
```

### 2.2 Unified Settings Interface

```typescript
// settings/types/index.ts
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

// Category key type for type-safe access
export type SettingsCategory = keyof AllSettings

// Nested path type (e.g., 'generation.text.model')
export type SettingsPath = 
  | SettingsCategory
  | `generation.${keyof GenerationSettings}`
  | `generation.text.${keyof TextGenerationSettings}`
  // ... etc
```

### 2.3 Storage Scope Types

```typescript
// settings/types/storage.ts
export type StorageScope = 'local' | 'backend' | 'hybrid'

export interface SettingMetadata {
  key: string
  category: SettingsCategory
  scope: StorageScope
  encrypted?: boolean
  defaultValue: unknown
  validate: (value: unknown) => boolean
}

export interface SettingsChangeEvent {
  key: string
  category: SettingsCategory
  oldValue: unknown
  newValue: unknown
  scope: StorageScope
  timestamp: number
  source: 'user' | 'sync' | 'default'
}
```

---

## 3. Zod Validation Schemas

```typescript
// settings/validation/account.ts
export const accountSettingsSchema = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email().nullable(),
  role: z.enum(['user', 'pro', 'admin', 'super']),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
  timezone: z.string().min(1),
  sessionTimeout: z.number().int().min(0).max(1440),
  lastPasswordChange: z.date().optional(),
})

// settings/validation/api.ts
export const apiSettingsSchema = z.object({
  minimaxKey: z.string().min(32).max(128),
  region: z.enum(['cn', 'intl']),
  mode: z.enum(['direct', 'proxy']),
  timeout: z.number().int().min(1000).max(120000),
  retryAttempts: z.number().int().min(0).max(10),
  retryDelay: z.number().int().min(100).max(30000),
})

// settings/validation/ui.ts
export const uiSettingsSchema = z.object({
  theme: z.union([z.literal('system'), z.string()]),
  sidebarCollapsed: z.boolean(),
  sidebarWidth: z.number().int().min(200).max(400),
  showAnimations: z.boolean(),
  reducedMotion: z.boolean(),
  toastPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  density: z.enum(['compact', 'comfortable', 'spacious']),
  fontSize: z.enum(['small', 'medium', 'large']),
})

// settings/validation/generation.ts
export const textGenerationSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(1),
  topP: z.number().min(0).max(1),
  maxTokens: z.number().int().min(1).max(8192),
  promptCaching: z.boolean(),
  streamOutput: z.boolean(),
})

export const voiceGenerationSchema = z.object({
  model: z.string().min(1),
  voiceId: z.string().min(1),
  emotion: z.string(),
  speed: z.number().min(0.5).max(2),
  pitch: z.number().int().min(-10).max(10),
  volume: z.number().min(0).max(2),
})

export const imageGenerationSchema = z.object({
  model: z.string().min(1),
  aspectRatio: z.enum(['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9']),
  numImages: z.number().int().min(1).max(4),
  promptOptimizer: z.boolean(),
  style: z.string(),
})

export const musicGenerationSchema = z.object({
  model: z.string().min(1),
  optimizeLyrics: z.boolean(),
  duration: z.number().int().min(5).max(300),
})

export const videoGenerationSchema = z.object({
  model: z.string().min(1),
  quality: z.enum(['standard', 'high']),
  duration: z.number().int().min(3).max(10),
})

export const generationSettingsSchema = z.object({
  text: textGenerationSchema,
  voice: voiceGenerationSchema,
  image: imageGenerationSchema,
  music: musicGenerationSchema,
  video: videoGenerationSchema,
})

// settings/validation/index.ts - Combined schema
export const allSettingsSchema = z.object({
  account: accountSettingsSchema,
  api: apiSettingsSchema,
  ui: uiSettingsSchema,
  generation: generationSettingsSchema,
  cron: cronSettingsSchema,
  workflow: workflowSettingsSchema,
  notification: notificationSettingsSchema,
  media: mediaSettingsSchema,
  privacy: privacySettingsSchema,
  accessibility: accessibilitySettingsSchema,
})

export type AllSettings = z.infer<typeof allSettingsSchema>
```

---

## 4. Zustand Store Architecture

### 4.1 Store Design Principles

- **Slice Pattern**: Each category is a separate Zustand slice
- **Selective Persistence**: localStorage for UI, backend for user data
- **Optimistic Updates**: UI updates immediately, syncs in background
- **Change Notifications**: Subscribe to specific setting changes

### 4.2 Store Structure

```typescript
// settings/store/types.ts
export interface SettingsState {
  // Raw settings data
  settings: AllSettings
  
  // Loading states
  isLoading: boolean
  isSaving: boolean
  lastSyncedAt: Date | null
  
  // Error state
  syncError: Error | null
  validationErrors: Record<string, string[]>
  
  // Actions
  initialize: () => Promise<void>
  setSetting: <T>(path: string, value: T) => void
  setCategory: <C extends SettingsCategory>(
    category: C, 
    values: Partial<AllSettings[C]>
  ) => void
  saveSettings: () => Promise<void>
  resetCategory: (category: SettingsCategory) => void
  resetAll: () => void
  
  // Subscriptions
  subscribe: (path: string, callback: (value: unknown) => void) => () => void
}

// settings/store/index.ts
export const useSettingsStore = create<SettingsState>()(
  persist(
    // Main store implementation...
  )
)
```

### 4.3 Persistence Strategy

```typescript
// settings/store/persistence.ts
interface PersistenceConfig {
  localKeys: string[]      // Keys stored in localStorage
  backendKeys: string[]    // Keys stored in database
  hybridKeys: string[]     // Keys stored both places (local for speed, backend for sync)
  encryptedKeys: string[]  // Keys requiring encryption
}

export const SETTINGS_PERSISTENCE: PersistenceConfig = {
  localKeys: [
    'ui.theme',
    'ui.sidebarCollapsed',
    'ui.sidebarWidth',
    'ui.showAnimations',
    'ui.reducedMotion',
    'ui.toastPosition',
    'ui.density',
    'ui.fontSize',
    'workflow.autoLayout',
    'workflow.snapToGrid',
    'workflow.gridSize',
    'workflow.showMinimap',
    'workflow.defaultZoom',
    'workflow.confirmDelete',
    'accessibility.highContrast',
    'accessibility.screenReader',
    'accessibility.keyboardShortcuts',
    'accessibility.focusIndicators',
  ],
  backendKeys: [
    'account.username',
    'account.email',
    'account.role',
    'api.minimaxKey',
    'notification.webhookUrl',
    'notification.webhookSecret',
    'notification.emailEnabled',
    'privacy.shareUsageData',
    'media.storagePath',
    'media.allowedTypes',
  ],
  hybridKeys: [
    'account.locale',
    'account.timezone',
    'account.sessionTimeout',
    'api.region',
    'api.mode',
    'api.timeout',
    'api.retryAttempts',
    'api.retryDelay',
    'generation.text.model',
    'generation.text.temperature',
    'generation.text.topP',
    'generation.text.maxTokens',
    'generation.text.promptCaching',
    'generation.text.streamOutput',
    'generation.voice.model',
    'generation.voice.voiceId',
    'generation.voice.emotion',
    'generation.voice.speed',
    'generation.voice.pitch',
    'generation.voice.volume',
    'generation.image.model',
    'generation.image.aspectRatio',
    'generation.image.numImages',
    'generation.image.promptOptimizer',
    'generation.image.style',
    'generation.music.model',
    'generation.music.optimizeLyrics',
    'generation.music.duration',
    'generation.video.model',
    'generation.video.quality',
    'generation.video.duration',
    'cron.defaultTimezone',
    'cron.timeoutSeconds',
    'cron.maxRetries',
    'cron.retryBackoff',
    'cron.concurrency',
    'cron.misfirePolicy',
    'notification.webhookEnabled',
    'notification.desktopEnabled',
    'notification.soundEnabled',
    'notification.events',
    'media.autoSave',
    'media.namingPattern',
    'media.maxFileSize',
    'media.retentionDays',
    'media.thumbnailSize',
    'privacy.autoRefreshToken',
    'privacy.secureExport',
    'privacy.auditLogRetention',
  ],
  encryptedKeys: [
    'api.minimaxKey',
    'notification.webhookSecret',
  ],
}
```

---

## 5. Backend API Design

### 5.1 REST API Endpoints

```
GET    /api/settings                    → Get all settings for current user
GET    /api/settings/:category          → Get settings for specific category
PATCH  /api/settings/:category          → Update settings for category
PUT    /api/settings/:category          → Replace entire category
DELETE /api/settings/:category          → Reset category to defaults

GET    /api/settings/history            → Get settings change history
POST   /api/settings/sync               → Trigger manual sync
GET    /api/settings/defaults           → Get default settings

// Admin endpoints
GET    /api/admin/settings/:userId      → Get any user's settings
POST   /api/admin/settings/broadcast    → Broadcast settings to all users
```

### 5.2 Request/Response Types

```typescript
// GET /api/settings
interface GetSettingsResponse {
  success: true
  data: AllSettings
  meta: {
    lastSyncedAt: string
    version: number
  }
}

// PATCH /api/settings/:category
interface UpdateSettingsRequest {
  settings: Partial<AllSettings[Category]>
}

interface UpdateSettingsResponse {
  success: true
  data: AllSettings[Category]
  meta: {
    updatedAt: string
    changedKeys: string[]
  }
}

// GET /api/settings/history
interface SettingsHistoryResponse {
  success: true
  data: Array<{
    id: string
    category: string
    key: string
    oldValue: unknown
    newValue: unknown
    changedAt: string
    changedBy: string
    source: 'user' | 'sync' | 'default' | 'admin'
  }>
}
```

---

## 6. Database Schema

### 6.1 Tables

```sql
-- User settings storage (key-value per category)
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  settings_json TEXT NOT NULL,  -- JSON object for the category
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category)
);

-- Settings change history (audit log)
CREATE TABLE settings_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  old_value TEXT,  -- JSON
  new_value TEXT,  -- JSON
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT NOT NULL,
  source TEXT NOT NULL,  -- 'user', 'sync', 'default', 'admin'
  ip_address TEXT,
  user_agent TEXT
);

-- System-wide default settings
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL UNIQUE,
  default_json TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings sync status (for offline support)
CREATE TABLE settings_sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  operation TEXT NOT NULL,  -- 'update', 'delete'
  payload TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- Indexes
CREATE INDEX idx_user_settings_user ON user_settings(user_id);
CREATE INDEX idx_settings_history_user ON settings_history(user_id, changed_at);
CREATE INDEX idx_settings_history_category ON settings_history(category, setting_key);
CREATE INDEX idx_settings_sync_queue_user ON settings_sync_queue(user_id);
```

### 6.2 TypeScript Types

```typescript
// server/database/types/settings.ts
export interface UserSettingsRow {
  id: number
  user_id: string
  category: string
  settings_json: string
  version: number
  created_at: string
  updated_at: string
}

export interface SettingsHistoryRow {
  id: number
  user_id: string
  category: string
  setting_key: string
  old_value: string | null
  new_value: string | null
  changed_at: string
  changed_by: string
  source: 'user' | 'sync' | 'default' | 'admin'
  ip_address: string | null
  user_agent: string | null
}

export interface CreateUserSettings {
  userId: string
  category: string
  settings: Record<string, unknown>
}

export interface UpdateUserSettings {
  settings: Record<string, unknown>
  version?: number  // For optimistic locking
}
```

---

## 7. Component Architecture

### 7.1 Component Hierarchy

```
SettingsPage (container)
├── SettingsLayout
│   ├── SettingsSidebar (category navigation)
│   └── SettingsContent
│       ├── SettingsCategoryPanel
│       │   ├── CategoryHeader
│       │   └── SettingsFieldGroup
│       │       ├── SettingsField (generic wrapper)
│       │       │   ├── TextSetting
│       │       │   ├── NumberSetting
│       │       │   ├── SelectSetting
│       │       │   ├── BooleanSetting (switch)
│       │       │   ├── RangeSetting (slider)
│       │       │   ├── ColorSetting
│       │       │   └── ObjectSetting (nested)
│       │       └── SettingsFieldArray
│       └── SettingsActionBar
│           ├── SaveButton
│           ├── ResetButton
│           └── RevertButton
```

### 7.2 Key Components

```typescript
// SettingsCategoryPanel - Renders one category
interface SettingsCategoryPanelProps {
  category: SettingsCategory
  title: string
  description?: string
  icon: LucideIcon
  fields: SettingsFieldConfig[]
}

// SettingsField - Generic field renderer
interface SettingsFieldProps {
  path: string           // Dot-notation path: 'generation.text.temperature'
  type: 'text' | 'number' | 'select' | 'boolean' | 'range' | 'color' | 'object'
  label: string
  description?: string
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  validate?: (value: unknown) => string | undefined
}

// SettingsFieldGroup - Groups related fields
interface SettingsFieldGroupProps {
  title: string
  description?: string
  fields: SettingsFieldConfig[]
  collapsible?: boolean
  defaultOpen?: boolean
}
```

### 7.3 Settings Category Registry

```typescript
// settings/registry.ts
export interface CategoryConfig {
  id: SettingsCategory
  title: string
  description: string
  icon: LucideIcon
  scope: StorageScope
  fields: SettingsFieldConfig[]
  order: number
}

export const SETTINGS_CATEGORIES: CategoryConfig[] = [
  {
    id: 'account',
    title: 'Account',
    description: 'Manage your profile and security settings',
    icon: UserIcon,
    scope: 'backend',
    order: 1,
    fields: [
      { path: 'account.username', type: 'text', label: 'Username', disabled: true },
      { path: 'account.email', type: 'text', label: 'Email' },
      { path: 'account.locale', type: 'select', label: 'Language', options: LOCALES },
      { path: 'account.timezone', type: 'select', label: 'Timezone', options: TIMEZONES },
      { path: 'account.sessionTimeout', type: 'range', label: 'Session Timeout', min: 0, max: 1440, step: 15 },
    ],
  },
  {
    id: 'api',
    title: 'API Configuration',
    description: 'Configure MiniMax API access',
    icon: ZapIcon,
    scope: 'hybrid',
    order: 2,
    fields: [
      { path: 'api.minimaxKey', type: 'password', label: 'API Key' },
      { path: 'api.region', type: 'select', label: 'Region', options: [{ value: 'cn', label: 'China' }, { value: 'intl', label: 'International' }] },
      { path: 'api.mode', type: 'select', label: 'Connection Mode', options: [{ value: 'direct', label: 'Direct' }, { value: 'proxy', label: 'Proxy' }] },
      { path: 'api.timeout', type: 'number', label: 'Timeout (ms)', min: 1000, max: 120000 },
      { path: 'api.retryAttempts', type: 'number', label: 'Retry Attempts', min: 0, max: 10 },
    ],
  },
  // ... more categories
]
```

---

## 8. Migration Strategy

### 8.1 Current State Analysis

```typescript
// Current fragmented stores:
// 1. AppStore: apiKey, region, theme, apiMode, wsStatus, hasCompletedOnboarding
// 2. AuthStore: user.minimax_api_key, user.minimax_region
// 3. Settings page: Simple form state

// Migration mapping:
const MIGRATION_MAP = {
  // AppStore → New Settings
  'apiKey': 'api.minimaxKey',
  'region': 'api.region',
  'theme': 'ui.theme',
  'apiMode': 'api.mode',
  'hasCompletedOnboarding': 'account.onboardingCompleted',
  
  // AuthStore → New Settings  
  'user.minimax_api_key': 'api.minimaxKey',
  'user.minimax_region': 'api.region',
}
```

### 8.2 Migration Steps

1. **Phase 1: Backend Setup** (No breaking changes)
   - Create new database tables
   - Create settings service layer
   - Create API endpoints
   - Write migration script for existing users

2. **Phase 2: Frontend Store** (Parallel implementation)
   - Create new settings store alongside existing stores
   - Implement sync logic between stores
   - Add feature flag for new settings

3. **Phase 3: UI Migration** (Gradual rollout)
   - Update Settings page to use new store
   - Update individual components to read from new store
   - Deprecate old store methods

4. **Phase 4: Cleanup** (After validation)
   - Remove old store properties
   - Remove migration code
   - Update documentation

---

## 9. Implementation Task Breakdown

See companion plan document: `plans/2026-04-05-settings-system-implementation.md`

---

## 10. Success Criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
| Type Safety | Settings access | 100% TypeScript coverage |
| Validation | Runtime errors | Zero uncaught setting errors |
| Performance | Settings load time | <100ms |
| Persistence | Data consistency | 99.9% sync success |
| Extensibility | New category time | <2 hours |
| UX | Settings save feedback | <500ms optimistic update |

---

## 11. References

- [Zustand Slices Pattern](https://docs.pmnd.rs/zustand/guides/slices-pattern)
- [Zod Validation](https://zod.dev/)
- [Interface Segregation Principle](https://en.wikipedia.org/wiki/Interface_segregation_principle)
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
