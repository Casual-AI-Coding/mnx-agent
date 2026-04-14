import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsHistoryRepository } from '../settings-history-repository'
import { DatabaseConnection } from '../../database/connection'

describe('SettingsHistoryRepository', () => {
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

  describe('logChange', () => {
    it('should log settings change with all fields', async () => {
      const mockRow = {
        id: 'history-1',
        user_id: 'user-1',
        category: 'ui',
        setting_key: 'theme',
        old_value: JSON.stringify('dark'),
        new_value: JSON.stringify('light'),
        changed_at: '2026-01-01T00:00:00Z',
        changed_by: 'user-1',
        source: 'user',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.logChange({
        userId: 'user-1',
        category: 'ui',
        settingKey: 'theme',
        oldValue: 'dark',
        newValue: 'light',
        changedBy: 'user-1',
        source: 'user',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO settings_history'),
        expect.arrayContaining([
          'user-1',
          'ui',
          'theme',
          JSON.stringify('dark'),
          JSON.stringify('light'),
          'user-1',
          'user',
          '192.168.1.1',
          'Mozilla/5.0',
        ])
      )
      expect(result).toBeDefined()
      expect(result.user_id).toBe('user-1')
      expect(result.setting_key).toBe('theme')
    })

    it('should log change with null old value', async () => {
      const mockRow = {
        id: 'history-1',
        user_id: 'user-1',
        category: 'api',
        setting_key: 'apiKey',
        old_value: null,
        new_value: JSON.stringify('new-key'),
        changed_at: '2026-01-01T00:00:00Z',
        changed_by: 'user-1',
        source: 'user',
        ip_address: null,
        user_agent: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.logChange({
        userId: 'user-1',
        category: 'api',
        settingKey: 'apiKey',
        oldValue: null,
        newValue: 'new-key',
        changedBy: 'user-1',
        source: 'user',
      })

      expect(result.old_value).toBeNull()
    })

    it('should log change with null new value (deletion)', async () => {
      const mockRow = {
        id: 'history-1',
        user_id: 'user-1',
        category: 'privacy',
        setting_key: 'dataSharing',
        old_value: JSON.stringify(true),
        new_value: null,
        changed_at: '2026-01-01T00:00:00Z',
        changed_by: 'user-1',
        source: 'user',
        ip_address: null,
        user_agent: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.logChange({
        userId: 'user-1',
        category: 'privacy',
        settingKey: 'dataSharing',
        oldValue: true,
        newValue: null,
        changedBy: 'user-1',
        source: 'user',
      })

      expect(result.new_value).toBeNull()
    })

    it('should log sync source', async () => {
      const mockRow = {
        id: 'history-1',
        user_id: 'user-1',
        category: 'ui',
        setting_key: 'fontSize',
        old_value: JSON.stringify(14),
        new_value: JSON.stringify(16),
        changed_at: '2026-01-01T00:00:00Z',
        changed_by: 'system',
        source: 'sync',
        ip_address: null,
        user_agent: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.logChange({
        userId: 'user-1',
        category: 'ui',
        settingKey: 'fontSize',
        oldValue: 14,
        newValue: 16,
        changedBy: 'system',
        source: 'sync',
      })

      expect(result.source).toBe('sync')
    })

    it('should log admin source', async () => {
      const mockRow = {
        id: 'history-1',
        user_id: 'user-1',
        category: 'account',
        setting_key: 'role',
        old_value: JSON.stringify('user'),
        new_value: JSON.stringify('pro'),
        changed_at: '2026-01-01T00:00:00Z',
        changed_by: 'admin-1',
        source: 'admin',
        ip_address: null,
        user_agent: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.logChange({
        userId: 'user-1',
        category: 'account',
        settingKey: 'role',
        oldValue: 'user',
        newValue: 'pro',
        changedBy: 'admin-1',
        source: 'admin',
      })

      expect(result.source).toBe('admin')
    })

    it('should log default source', async () => {
      const mockRow = {
        id: 'history-1',
        user_id: 'user-1',
        category: 'ui',
        setting_key: 'theme',
        old_value: null,
        new_value: JSON.stringify('system'),
        changed_at: '2026-01-01T00:00:00Z',
        changed_by: 'system',
        source: 'default',
        ip_address: null,
        user_agent: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.logChange({
        userId: 'user-1',
        category: 'ui',
        settingKey: 'theme',
        oldValue: null,
        newValue: 'system',
        changedBy: 'system',
        source: 'default',
      })

      expect(result.source).toBe('default')
    })

    it('should handle complex object values', async () => {
      const complexObject = {
        nested: { value: 'test' },
        array: [1, 2, 3],
      }

      const mockRow = {
        id: 'history-1',
        user_id: 'user-1',
        category: 'generation',
        setting_key: 'textDefaults',
        old_value: null,
        new_value: JSON.stringify(complexObject),
        changed_at: '2026-01-01T00:00:00Z',
        changed_by: 'user-1',
        source: 'user',
        ip_address: null,
        user_agent: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.logChange({
        userId: 'user-1',
        category: 'generation',
        settingKey: 'textDefaults',
        oldValue: null,
        newValue: complexObject,
        changedBy: 'user-1',
        source: 'user',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(complexObject)])
      )
    })
  })

  describe('getHistory', () => {
    it('should return history for user without category filter', async () => {
      const mockRows = [
        {
          id: 'history-1',
          user_id: 'user-1',
          category: 'ui',
          setting_key: 'theme',
          old_value: JSON.stringify('dark'),
          new_value: JSON.stringify('light'),
          changed_at: '2026-01-02T00:00:00Z',
          changed_by: 'user-1',
          source: 'user',
          ip_address: null,
          user_agent: null,
        },
        {
          id: 'history-2',
          user_id: 'user-1',
          category: 'api',
          setting_key: 'region',
          old_value: JSON.stringify('domestic'),
          new_value: JSON.stringify('international'),
          changed_at: '2026-01-01T00:00:00Z',
          changed_by: 'user-1',
          source: 'user',
          ip_address: null,
          user_agent: null,
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.getHistory({ userId: 'user-1' })

      expect(result.total).toBe(2)
      expect(result.items).toHaveLength(2)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        expect.arrayContaining(['user-1'])
      )
    })

    it('should filter by category', async () => {
      const mockRows = [
        {
          id: 'history-1',
          user_id: 'user-1',
          category: 'ui',
          setting_key: 'theme',
          old_value: null,
          new_value: JSON.stringify('dark'),
          changed_at: '2026-01-01T00:00:00Z',
          changed_by: 'user-1',
          source: 'user',
          ip_address: null,
          user_agent: null,
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.getHistory({ userId: 'user-1', category: 'ui' })

      expect(result.total).toBe(1)
      expect(result.items[0].category).toBe('ui')
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('category = $'),
        expect.arrayContaining(['ui'])
      )
    })

    it('should apply pagination', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.getHistory({ userId: 'user-1', page: 3, limit: 25 })

      expect(result.total).toBe(100)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([25, 50])
      )
    })

    it('should use default page and limit', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '50' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      await repo.getHistory({ userId: 'user-1' })

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[1]).toContain(50)
      expect(queryCall[1]).toContain(0)
    })

    it('should order by changed_at DESC', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      await repo.getHistory({ userId: 'user-1' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY changed_at DESC'),
        expect.any(Array)
      )
    })

    it('should handle empty results', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '0' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.getHistory({ userId: 'user-with-no-history' })

      expect(result.total).toBe(0)
      expect(result.items).toHaveLength(0)
    })

    it('should combine userId and category filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      await repo.getHistory({ userId: 'user-1', category: 'cron' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND category = $2'),
        expect.arrayContaining(['user-1', 'cron'])
      )
    })
  })

  describe('toISODate', () => {
    it('should return ISO date string', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        {
          id: 'history-1',
          user_id: 'user-1',
          category: 'ui',
          setting_key: 'test',
          old_value: null,
          new_value: null,
          changed_at: '2026-01-15T10:30:00.000Z',
          changed_by: 'user-1',
          source: 'user',
          ip_address: null,
          user_agent: null,
        },
      ] as any)

      const repo = new SettingsHistoryRepository(mockDb)
      const result = await repo.logChange({
        userId: 'user-1',
        category: 'ui',
        settingKey: 'test',
        oldValue: null,
        newValue: null,
        changedBy: 'user-1',
        source: 'user',
      })

      expect(result.changed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})