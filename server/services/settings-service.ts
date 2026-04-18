import { DatabaseConnection } from '../database/connection.js'
import { SettingsRepository, type UserSettingsRow, type CreateUserSettings } from '../repositories/settings-repository.js'
import { SettingsHistoryRepository } from '../repositories/settings-history-repository.js'
import type { AllSettings, SettingsCategory } from '../../src/settings/types/index.js'
import { allSettingsSchema } from '../../src/settings/validation/index.js'

export interface GetSettingsResult {
  success: true
  settings: Partial<AllSettings>
}

export interface UpdateSettingsResult {
  success: true
  settings: Record<string, unknown>
  changedKeys: string[]
}

export interface SettingsError {
  success: false
	error: string
  validationErrors?: Record<string, string[]>
}

// Default settings for each category
const DEFAULT_SETTINGS: Record<SettingsCategory, Record<string, unknown>> = {
  account: {
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
      optimizeLyrics: false,
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

// Encrypted database fields (flat names matching columns)
const ENCRYPTED_FIELDS = ['minimaxKey', 'webhookSecret']

export class SettingsService {
  private settingsRepo: SettingsRepository
  private historyRepo: SettingsHistoryRepository
  private conn: DatabaseConnection

  constructor(conn: DatabaseConnection) {
    this.conn = conn
    this.settingsRepo = new SettingsRepository(conn)
    this.historyRepo = new SettingsHistoryRepository(conn)
  }

  // Get all settings for a user
  async getAllSettings(userId: string): Promise<GetSettingsResult | SettingsError> {
    const rows = await this.settingsRepo.getAllSettings(userId)
    
    const settings: Record<string, Record<string, unknown>> = { ...DEFAULT_SETTINGS }
    
    for (const row of rows) {
      settings[row.category] = row.settings_json as Record<string, unknown>
    }

    return { success: true, settings: settings as Partial<AllSettings> }
  }

  // Get settings for a specific category
  async getSettingsByCategory(userId: string, category: SettingsCategory): Promise<Record<string, unknown>> {
    const row = await this.settingsRepo.getSettings(userId, category)
    if (row) {
      return row.settings_json as Record<string, unknown>
    }
    return DEFAULT_SETTINGS[category] || {}
  }

  // Update settings for a category
  async updateSettings(
    userId: string,
    category: SettingsCategory,
    settings: Record<string, unknown>,
    changedBy: string,
    source: 'user' | 'sync' | 'default' | 'admin' = 'user',
    ipAddress?: string,
    userAgent?: string
  ): Promise<UpdateSettingsResult | SettingsError> {
    // Get current settings for comparison
    const currentRow = await this.settingsRepo.getSettings(userId, category)
    const currentSettings = currentRow?.settings_json as Record<string, unknown> || {}

    // Track changed keys
    const changedKeys: string[] = []
    for (const [key, value] of Object.entries(settings)) {
      if (JSON.stringify(currentSettings[key]) !== JSON.stringify(value)) {
        changedKeys.push(key)
      }
    }

    if (changedKeys.length === 0) {
      return { success: true, settings: currentSettings, changedKeys: [] }
    }

    // Encrypt sensitive fields (in production, use proper encryption)
    const processedSettings = { ...settings }
    // TODO: Add encryption for ENCRYPTED_FIELDS

    // Upsert settings
    await this.settingsRepo.upsertSettings({
      userId,
      category,
      settings: processedSettings,
    })

    // Log changes
    for (const key of changedKeys) {
      await this.historyRepo.logChange({
        userId,
        category,
        settingKey: key,
        oldValue: currentSettings[key],
        newValue: processedSettings[key],
        changedBy,
        source,
        ipAddress,
        userAgent,
      })
    }

    return { success: true, settings: processedSettings, changedKeys }
  }

  // Reset a category to defaults
  async resetCategory(userId: string, category: SettingsCategory, changedBy: string): Promise<Record<string, unknown>> {
    const defaults = DEFAULT_SETTINGS[category] || {}
    await this.settingsRepo.deleteSettings(userId, category)
    
    // Log the reset
    await this.historyRepo.logChange({
      userId,
      category,
      settingKey: '_reset',
      oldValue: null,
      newValue: 'reset_to_defaults',
      changedBy,
      source: 'user',
    })

    return defaults
  }

  // Get default settings for a category
  getDefaults(category: SettingsCategory): Record<string, unknown> {
    return DEFAULT_SETTINGS[category] || {}
  }

  // Migrate legacy settings from users table
  async migrateLegacySettings(userId: string, legacyApiKey: string | null, legacyRegion: string): Promise<void> {
    if (legacyApiKey || legacyRegion) {
      await this.updateSettings(userId, 'api', {
        minimaxKey: legacyApiKey || '',
        region: legacyRegion || 'cn',
      }, userId, 'sync')
    }
  }

  // Get settings history
  async getSettingsHistory(userId: string, category?: SettingsCategory, page = 1, limit = 50) {
    return this.historyRepo.getHistory({ userId, category, page, limit })
  }
}