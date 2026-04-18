// src/settings/store/persistence.ts
// Defines which settings are stored where

// Settings stored only in localStorage (UI preferences, instant access)
export const LOCAL_SETTINGS_KEYS = [
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
]

// Settings stored only on backend (secure data)
export const BACKEND_SETTINGS_KEYS = [
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
]

// Settings stored both locally and on backend (hybrid)
export const HYBRID_SETTINGS_KEYS = [
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
]

// Encrypted backend fields (nested paths matching settings object structure)
export const ENCRYPTED_FIELDS = [
  'api.minimaxKey',
  'notification.webhookSecret',
]

export function getStorageScope(key: string): 'local' | 'backend' | 'hybrid' {
  if (LOCAL_SETTINGS_KEYS.includes(key)) return 'local'
  if (BACKEND_SETTINGS_KEYS.includes(key)) return 'backend'
  if (HYBRID_SETTINGS_KEYS.includes(key)) return 'hybrid'
  return 'hybrid' // default to hybrid
}