// src/settings/store/defaults.ts
import type { AllSettings, SettingsCategory } from '@/settings/types'
import { TIMEOUTS } from '@/lib/config'
import { DEFAULT_MODELS } from '@/models'

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
    timeout: TIMEOUTS.API_REQUEST,
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
      model: DEFAULT_MODELS.text,
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,
      promptCaching: true,
      streamOutput: true,
    },
    voice: {
      model: DEFAULT_MODELS.voice,
      voiceId: 'male-qn-qingse',
      emotion: 'neutral',
      speed: 1.0,
      pitch: 0,
      volume: 1.0,
    },
    image: {
      model: DEFAULT_MODELS.image,
      aspectRatio: '1:1',
      numImages: 1,
      promptOptimizer: true,
      style: '',
    },
    music: {
      model: DEFAULT_MODELS.music,
      optimizeLyrics: false,
      duration: 30,
    },
    video: {
      model: DEFAULT_MODELS.video,
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