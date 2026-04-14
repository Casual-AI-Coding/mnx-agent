import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsRepository } from '../settings-repository'
import { DatabaseConnection } from '../../database/connection'

describe('SettingsRepository', () => {
  let mockDb: DatabaseConnection

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      transaction: vi.fn(async (fn) => {
        const txConnection = {
          query: mockDb.query,
          execute: mockDb.execute,
          isPostgres: mockDb.isPostgres,
        }
        return await fn(txConnection as unknown as DatabaseConnection)
      }),
      isPostgres: vi.fn().mockReturnValue(true),
    } as unknown as DatabaseConnection
  })

  describe('getSettings', () => {
    it('should return settings for user and category', async () => {
      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'ui',
        settings_json: JSON.stringify({ theme: 'dark', fontSize: 14 }),
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.getSettings('user-1', 'ui')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM user_settings WHERE user_id = $1 AND category = $2',
        ['user-1', 'ui']
      )
      expect(result).toBeDefined()
      expect(result?.settings_json).toEqual({ theme: 'dark', fontSize: 14 })
    })

    it('should return null when settings not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.getSettings('user-1', 'nonexistent')

      expect(result).toBeNull()
    })

    it('should parse settings_json from string', async () => {
      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'api',
        settings_json: '{"region":"domestic","timeout":30000}',
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.getSettings('user-1', 'api')

      expect(result?.settings_json).toEqual({ region: 'domestic', timeout: 30000 })
    })
  })

  describe('getAllSettings', () => {
    it('should return all settings for a user', async () => {
      const mockRows = [
        {
          id: 'settings-1',
          user_id: 'user-1',
          category: 'ui',
          settings_json: JSON.stringify({ theme: 'dark' }),
          version: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'settings-2',
          user_id: 'user-1',
          category: 'api',
          settings_json: JSON.stringify({ region: 'domestic' }),
          version: 2,
          created_at: '2026-01-02T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.getAllSettings('user-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM user_settings WHERE user_id = $1',
        ['user-1']
      )
      expect(result).toHaveLength(2)
      expect(result[0].settings_json).toEqual({ theme: 'dark' })
      expect(result[1].settings_json).toEqual({ region: 'domestic' })
    })

    it('should return empty array when no settings found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.getAllSettings('user-with-no-settings')

      expect(result).toHaveLength(0)
    })
  })

  describe('upsertSettings', () => {
    it('should upsert settings for postgres', async () => {
      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'ui',
        settings_json: JSON.stringify({ theme: 'light' }),
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.upsertSettings({
        userId: 'user-1',
        category: 'ui',
        settings: { theme: 'light' },
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining(['user-1', 'ui', JSON.stringify({ theme: 'light' })])
      )
      expect(result).toBeDefined()
      expect(result.settings_json).toEqual({ theme: 'light' })
    })

    it('should upsert settings for sqlite', async () => {
      mockDb.isPostgres = vi.fn().mockReturnValue(false)
      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'api',
        settings_json: JSON.stringify({ apiKey: 'test' }),
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.upsertSettings({
        userId: 'user-1',
        category: 'api',
        settings: { apiKey: 'test' },
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(user_id, category)'),
        expect.any(Array)
      )
      expect(result.settings_json).toEqual({ apiKey: 'test' })
    })

    it('should handle complex settings objects', async () => {
      const complexSettings = {
        nested: {
          value: 'test',
          array: [1, 2, 3],
        },
        boolean: true,
        number: 42,
      }

      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'generation',
        settings_json: JSON.stringify(complexSettings),
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.upsertSettings({
        userId: 'user-1',
        category: 'generation',
        settings: complexSettings,
      })

      expect(result.settings_json).toEqual(complexSettings)
    })
  })

  describe('updateSettings', () => {
    it('should update settings and increment version', async () => {
      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'ui',
        settings_json: JSON.stringify({ theme: 'system' }),
        version: 2,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.updateSettings('user-1', 'ui', { theme: 'system' })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_settings SET settings_json = $1, version = version + 1'),
        expect.arrayContaining([JSON.stringify({ theme: 'system' })])
      )
      expect(result).toBeDefined()
      expect(result?.version).toBe(2)
    })

    it('should return settings after update', async () => {
      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'notification',
        settings_json: JSON.stringify({ enabled: true }),
        version: 3,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-03T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.updateSettings('user-1', 'notification', { enabled: true })

      expect(result?.settings_json).toEqual({ enabled: true })
    })
  })

  describe('deleteSettings', () => {
    it('should delete settings for user and category', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.deleteSettings('user-1', 'ui')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM user_settings WHERE user_id = $1 AND category = $2',
        ['user-1', 'ui']
      )
      expect(result).toBe(true)
    })

    it('should return false when settings not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 0 } as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.deleteSettings('user-1', 'nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('getById (base class)', () => {
    it('should return settings by id', async () => {
      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'ui',
        settings_json: JSON.stringify({ theme: 'dark' }),
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.getById('settings-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM user_settings WHERE id = $1',
        ['settings-1']
      )
      expect(result).toBeDefined()
      expect(result?.id).toBe('settings-1')
    })

    it('should return null when not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.getById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('rowToEntity', () => {
    it('should parse settings_json from string', async () => {
      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'cron',
        settings_json: '{"timezone":"UTC","maxConcurrent":5}',
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.getById('settings-1')

      expect(result?.settings_json).toEqual({ timezone: 'UTC', maxConcurrent: 5 })
    })

    it('should handle object settings_json', async () => {
      const mockRow = {
        id: 'settings-1',
        user_id: 'user-1',
        category: 'workflow',
        settings_json: { maxNodes: 50 },
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.getById('settings-1')

      expect(result?.settings_json).toEqual({ maxNodes: 50 })
    })
  })

  describe('list (base class)', () => {
    it('should return paginated settings', async () => {
      const mockRows = [
        {
          id: 'settings-1',
          user_id: 'user-1',
          category: 'ui',
          settings_json: JSON.stringify({}),
          version: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.list({ limit: 10, offset: 0 })

      expect(result.total).toBe(10)
      expect(result.items).toHaveLength(1)
    })

    it('should filter by ownerId', async () => {
      const mockRows = [
        {
          id: 'settings-1',
          user_id: 'user-1',
          category: 'ui',
          settings_json: JSON.stringify({}),
          version: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const repo = new SettingsRepository(mockDb)
      const result = await repo.list({ ownerId: 'owner-1' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $'),
        expect.arrayContaining(['owner-1'])
      )
      expect(result.total).toBe(1)
    })
  })
})