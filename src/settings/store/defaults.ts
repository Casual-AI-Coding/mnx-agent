// src/settings/store/defaults.ts
import type { AllSettings, SettingsCategory } from '@/settings/types'

export const DEFAULT_SETTINGS: AllSettings = {
  account: {
    username: '',
    email: null,
    role: 'user',
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    sessionTimeout: 30,
  },
  api: {
    minimaxKey: '',
    region: 'cn',
    mode: 'direct',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  ui: {
    theme: 'system',
    sidebarCollapsed: false,
    sidebarWidth: 280,
    showAnimations: true,
    reducedMotion: false,
    toastPosition: 'bottom-right',
    density: 'comfortable',
    fontSize: 'medium',
  },
  generation: {
    text: {
      model: 'MiniMax-Text-01',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,
      promptCaching: true,
      streamOutput: true,
    },
    voice: {
      model: 'speech-01-turbo',
      voiceId: 'male-qn-qingse',
      emotion: 'neutral',
      speed: 1.0,
      pitch: 0,
      volume: 1.0,
    },
    image: {
      model: 'image-01',
      aspectRatio: '1:1',
      numImages: 1,
      promptOptimizer: true,
      style: '',
    },
    music: {
      model: 'music-01',
      optimizeLyrics: true,
      duration: 30,
    },
    video: {
      model: 'video-01',
      quality: 'standard',
      duration: 5,
    },
  },
  cron: {
    defaultTimezone: 'Asia/Shanghai',
    timeoutSeconds: 300,
    maxRetries: 3,
    retryBackoff: 'exponential',
    concurrency: 5,
    misfirePolicy: 'fire_once',
  },
  workflow: {
    autoLayout: true,
    snapToGrid: true,
    gridSize: 20,
    showMinimap: true,
    defaultZoom: 1,
    confirmDelete: true,
  },
  notification: {
    webhookEnabled: false,
    webhookUrl: '',
    webhookSecret: '',
    emailEnabled: false,
    desktopEnabled: true,
    soundEnabled: false,
    events: ['failure'],
  },
  media: {
    storagePath: './data/media',
    autoSave: true,
    namingPattern: '{timestamp}_{type}',
    maxFileSize: 100,
    allowedTypes: ['*'],
    retentionDays: 0,
    thumbnailSize: 200,
  },
  privacy: {
    shareUsageData: false,
    autoRefreshToken: true,
    secureExport: true,
    auditLogRetention: 90,
  },
  accessibility: {
    highContrast: false,
    screenReader: false,
    keyboardShortcuts: true,
    focusIndicators: true,
  },
}

export function getDefaultForCategory<C extends SettingsCategory>(
  category: C
): AllSettings[C] {
  return DEFAULT_SETTINGS[category]
}