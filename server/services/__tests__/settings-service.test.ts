import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsService } from '../settings-service'
import type { SettingsCategory } from '../../../src/settings/types'

describe('SettingsService', () => {
  const mockSettingsRepo = {
    getSettings: vi.fn(),
    getAllSettings: vi.fn(),
    upsertSettings: vi.fn(),
    deleteSettings: vi.fn(),
  }

  const mockHistoryRepo = {
    logChange: vi.fn(),
    getHistory: vi.fn(),
  }

  const mockDb = {
    query: vi.fn(),
    execute: vi.fn(),
    isPostgres: vi.fn().mockReturnValue(true),
  }

  const service = new SettingsService(mockDb as any)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(service as any, 'settingsRepo', 'get').mockReturnValue(mockSettingsRepo)
    vi.spyOn(service as any, 'historyRepo', 'get').mockReturnValue(mockHistoryRepo)
  })

  describe('getAllSettings', () => {
    it('should return defaults when no user settings exist', async () => {
      mockSettingsRepo.getAllSettings.mockResolvedValue([])

      const result = await service.getAllSettings('user-123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.settings.account).toBeDefined()
        expect(result.settings.api).toBeDefined()
        expect(result.settings.ui).toBeDefined()
        expect((result.settings.api as any).region).toBe('cn')
        expect((result.settings.api as any).mode).toBe('direct')
      }
    })

    it('should merge user settings with defaults', async () => {
      mockSettingsRepo.getAllSettings.mockResolvedValue([
        {
          id: '1',
          user_id: 'user-123',
          category: 'api',
          settings_json: { region: 'intl', mode: 'proxy' },
          version: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ])

      const result = await service.getAllSettings('user-123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect((result.settings.api as any).region).toBe('intl')
        expect((result.settings.api as any).mode).toBe('proxy')
        expect(result.settings.account).toBeDefined()
      }
    })
  })

  describe('getSettingsByCategory', () => {
    it('should return category settings when they exist', async () => {
      mockSettingsRepo.getSettings.mockResolvedValue({
        id: '1',
        user_id: 'user-123',
        category: 'ui',
        settings_json: { theme: 'dark', fontSize: 'large' },
        version: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await service.getSettingsByCategory('user-123', 'ui')

      expect(result).toEqual({ theme: 'dark', fontSize: 'large' })
    })

    it('should return defaults when category settings do not exist', async () => {
      mockSettingsRepo.getSettings.mockResolvedValue(null)

      const result = await service.getSettingsByCategory('user-123', 'ui')

      expect(result).toBeDefined()
      expect((result as any).theme).toBe('system')
    })
  })

  describe('updateSettings', () => {
    it('should detect changed keys correctly', async () => {
      mockSettingsRepo.getSettings.mockResolvedValue({
        id: '1',
        user_id: 'user-123',
        category: 'api',
        settings_json: { region: 'cn', mode: 'direct' },
        version: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })
      mockSettingsRepo.upsertSettings.mockResolvedValue({} as any)
      mockHistoryRepo.logChange.mockResolvedValue({} as any)

      const result = await service.updateSettings(
        'user-123',
        'api',
        { region: 'intl' },
        'user-123'
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.changedKeys).toContain('region')
      }
    })

    it('should return early when no changes detected', async () => {
      mockSettingsRepo.getSettings.mockResolvedValue({
        id: '1',
        user_id: 'user-123',
        category: 'api',
        settings_json: { region: 'cn' },
        version: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await service.updateSettings(
        'user-123',
        'api',
        { region: 'cn' },
        'user-123'
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.changedKeys).toEqual([])
      }
      expect(mockSettingsRepo.upsertSettings).not.toHaveBeenCalled()
    })
  })

  describe('resetCategory', () => {
    it('should delete settings and return defaults', async () => {
      mockSettingsRepo.deleteSettings.mockResolvedValue({} as any)
      mockHistoryRepo.logChange.mockResolvedValue({} as any)

      const result = await service.resetCategory('user-123', 'api', 'user-123')

      expect(mockSettingsRepo.deleteSettings).toHaveBeenCalledWith('user-123', 'api')
      expect(mockHistoryRepo.logChange).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect((result as any).region).toBe('cn')
    })
  })

  describe('getDefaults', () => {
    it('should return default settings for api category', () => {
      const defaults = service.getDefaults('api')

      expect(defaults).toBeDefined()
      expect((defaults as any).region).toBe('cn')
      expect((defaults as any).mode).toBe('direct')
      expect((defaults as any).timeout).toBe(30000)
    })

    it('should return empty object for unknown category', () => {
      const defaults = service.getDefaults('account')

      expect(defaults).toBeDefined()
      expect(Object.keys(defaults).length).toBeGreaterThan(0)
    })
  })

  describe('sensitive field encryption', () => {
    beforeEach(() => {
      process.env.SETTINGS_ENCRYPTION_KEY =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    })

    it('updateSettings should encrypt minimaxKey before storing', async () => {
      mockSettingsRepo.getSettings.mockResolvedValue(null)
      mockSettingsRepo.upsertSettings.mockResolvedValue({} as any)
      mockHistoryRepo.logChange.mockResolvedValue({} as any)

      await service.updateSettings(
        'user-123', 'api',
        { minimaxKey: 'sk-secret-123', region: 'cn' },
        'user-123'
      )

      const upsertCall = mockSettingsRepo.upsertSettings.mock.calls[0][0]
      const storedKey = upsertCall.settings.minimaxKey
      expect(storedKey).toMatch(/^enc:/)
      expect(storedKey).not.toContain('sk-secret-123')
    })

    it('updateSettings should encrypt webhookSecret before storing', async () => {
      mockSettingsRepo.getSettings.mockResolvedValue(null)
      mockSettingsRepo.upsertSettings.mockResolvedValue({} as any)
      mockHistoryRepo.logChange.mockResolvedValue({} as any)

      await service.updateSettings(
        'user-123', 'notification',
        { webhookSecret: 'wh-secret-456', webhookEnabled: true },
        'user-123'
      )

      const upsertCall = mockSettingsRepo.upsertSettings.mock.calls[0][0]
      const storedKey = upsertCall.settings.webhookSecret
      expect(storedKey).toMatch(/^enc:/)
      expect(storedKey).not.toContain('wh-secret-456')
    })

    it('getAllSettings should decrypt encrypted values on read', async () => {
      mockSettingsRepo.getAllSettings.mockResolvedValue([
        {
          id: '1', user_id: 'user-123', category: 'api',
          settings_json: { minimaxKey: '[will be replaced by mock]', region: 'intl' },
          version: 1, created_at: '2024-01-01', updated_at: '2024-01-01',
        },
      ])

      const { encrypt } = await import('../../lib/crypto.js')
      const encryptedKey = encrypt('sk-decrypt-test')

      mockSettingsRepo.getAllSettings.mockReset()
      mockSettingsRepo.getAllSettings.mockResolvedValue([
        {
          id: '1', user_id: 'user-123', category: 'api',
          settings_json: { minimaxKey: encryptedKey, region: 'intl' },
          version: 1, created_at: '2024-01-01', updated_at: '2024-01-01',
        },
      ])

      const result = await service.getAllSettings('user-123')
      expect(result.success).toBe(true)
      if (result.success) {
        expect((result.settings.api as any).minimaxKey).toBe('sk-decrypt-test')
      }
    })
  })

  describe('migrateLegacySettings', () => {
    it('should migrate legacy api key and region', async () => {
      mockSettingsRepo.getSettings.mockResolvedValue(null)
      mockSettingsRepo.upsertSettings.mockResolvedValue({} as any)
      mockHistoryRepo.logChange.mockResolvedValue({} as any)

      await service.migrateLegacySettings('user-123', 'test-api-key', 'intl')

      expect(mockSettingsRepo.upsertSettings).toHaveBeenCalledWith({
        userId: 'user-123',
        category: 'api',
        settings: {
          minimaxKey: expect.stringMatching(/^enc:/),
          region: 'intl',
        },
      })
    })

    it('should not migrate when both legacy data are empty/falsy', async () => {
      await service.migrateLegacySettings('user-123', null, '')

      expect(mockSettingsRepo.upsertSettings).not.toHaveBeenCalled()
    })
  })
})