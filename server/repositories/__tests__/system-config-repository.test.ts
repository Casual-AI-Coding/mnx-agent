import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SystemConfigRepository } from '../system-config-repository'
import { DatabaseConnection } from '../../database/connection'

describe('SystemConfigRepository', () => {
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

  describe('getByKey', () => {
    it('should return config by key', async () => {
      const mockRow = {
        id: 'config-1',
        key: 'max_upload_size',
        value: '10485760',
        description: 'Maximum upload size in bytes',
        value_type: 'number',
        updated_at: '2026-01-01T00:00:00Z',
        updated_by: 'admin-1',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.getByKey('max_upload_size')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM system_config WHERE key = $1',
        ['max_upload_size']
      )
      expect(result).toBeDefined()
      expect(result?.key).toBe('max_upload_size')
      expect(result?.value).toBe('10485760')
    })

    it('should return null when config not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.getByKey('nonexistent_key')

      expect(result).toBeNull()
    })
  })

  describe('getById', () => {
    it('should return config by id via getByKey', async () => {
      const mockRow = {
        id: 'config-1',
        key: 'api_timeout',
        value: '30000',
        description: 'API timeout in ms',
        value_type: 'number',
        updated_at: '2026-01-01T00:00:00Z',
        updated_by: null,
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.getById('api_timeout')

      expect(result).toBeDefined()
      expect(result?.key).toBe('api_timeout')
    })
  })

  describe('list', () => {
    it('should return all configs with total count', async () => {
      const mockRows = [
        {
          id: 'config-1',
          key: 'max_upload_size',
          value: '10485760',
          description: 'Max upload size',
          value_type: 'number',
          updated_at: '2026-01-01T00:00:00Z',
          updated_by: 'admin-1',
        },
        {
          id: 'config-2',
          key: 'enable_registration',
          value: 'true',
          description: 'Enable user registration',
          value_type: 'boolean',
          updated_at: '2026-01-02T00:00:00Z',
          updated_by: 'admin-1',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce(mockRows as any)
        .mockResolvedValueOnce([{ count: '2' }] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.list()

      expect(result.total).toBe(2)
      expect(result.items).toHaveLength(2)
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM system_config ORDER BY key'
      )
    })

    it('should return empty list when no configs', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([{ count: '0' }] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.list()

      expect(result.total).toBe(0)
      expect(result.items).toHaveLength(0)
    })

    it('should order configs by key', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([{ count: '0' }] as any)

      const repo = new SystemConfigRepository(mockDb)
      await repo.list()

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM system_config ORDER BY key'
      )
    })
  })

  describe('create', () => {
    it('should create new config', async () => {
      const mockRow = {
        id: 'config-1',
        key: 'new_config',
        value: 'value123',
        description: 'A new config',
        value_type: 'string',
        updated_at: '2026-01-01T00:00:00Z',
        updated_by: 'admin-1',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.create({
        key: 'new_config',
        value: 'value123',
        description: 'A new config',
        value_type: 'string',
      }, 'admin-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_config'),
        expect.arrayContaining(['new_config', 'value123', 'A new config', 'string', 'admin-1'])
      )
      expect(result).toBeDefined()
      expect(result.key).toBe('new_config')
    })

    it('should create config without updatedBy', async () => {
      const mockRow = {
        id: 'config-1',
        key: 'auto_config',
        value: '100',
        description: null,
        value_type: 'number',
        updated_at: '2026-01-01T00:00:00Z',
        updated_by: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.create({
        key: 'auto_config',
        value: '100',
        value_type: 'number',
      })

      expect(result.updated_by).toBeNull()
    })

    it('should create config with different value types', async () => {
      const mockRow = {
        id: 'config-1',
        key: 'json_config',
        value: '{"nested":true}',
        description: 'JSON config',
        value_type: 'json',
        updated_at: '2026-01-01T00:00:00Z',
        updated_by: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.create({
        key: 'json_config',
        value: '{"nested":true}',
        description: 'JSON config',
        value_type: 'json',
      })

      expect(result.value_type).toBe('json')
    })
  })

  describe('update', () => {
    const existingConfig = {
      id: 'config-1',
      key: 'max_upload_size',
      value: '10485760',
      description: 'Maximum upload size in bytes',
      value_type: 'number',
      updated_at: '2026-01-01T00:00:00Z',
      updated_by: 'admin-1',
    }

    it('should update value field', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingConfig] as any)
        .mockResolvedValueOnce([{ ...existingConfig, value: '20971520' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.update('max_upload_size', { value: '20971520' }, 'admin-2')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('value = $1'),
        expect.arrayContaining(['20971520'])
      )
      expect(result?.value).toBe('20971520')
    })

    it('should update description field', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingConfig] as any)
        .mockResolvedValueOnce([{ ...existingConfig, description: 'New description' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.update('max_upload_size', { description: 'New description' }, 'admin-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('description = $1'),
        expect.arrayContaining(['New description'])
      )
      expect(result?.description).toBe('New description')
    })

    it('should update both value and description', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingConfig] as any)
        .mockResolvedValueOnce([{ ...existingConfig, value: '5242880', description: '5MB limit' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new SystemConfigRepository(mockDb)
      await repo.update('max_upload_size', {
        value: '5242880',
        description: '5MB limit',
      }, 'admin-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('value = $1'),
        expect.arrayContaining(['5242880', '5MB limit'])
      )
    })

    it('should return null when config not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.update('nonexistent', { value: 'new_value' })

      expect(result).toBeNull()
      expect(mockDb.execute).not.toHaveBeenCalled()
    })

    it('should return existing config when no fields to update', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([existingConfig] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.update('max_upload_size', {})

      expect(mockDb.execute).not.toHaveBeenCalled()
      expect(result?.value).toBe('10485760')
    })

    it('should set updated_by when provided', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingConfig] as any)
        .mockResolvedValueOnce([existingConfig] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new SystemConfigRepository(mockDb)
      await repo.update('max_upload_size', { value: 'new_value' }, 'admin-2')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['admin-2'])
      )
    })

    it('should set updated_by to null when not provided', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingConfig] as any)
        .mockResolvedValueOnce([existingConfig] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new SystemConfigRepository(mockDb)
      await repo.update('max_upload_size', { value: 'new_value' })

      const executeCall = mockDb.execute.mock.calls[0]
      expect(executeCall[1]).toContain(null)
    })
  })

  describe('delete', () => {
    it('should delete config by key', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.delete('max_upload_size')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM system_config WHERE key = $1',
        ['max_upload_size']
      )
      expect(result).toBe(true)
    })

    it('should return false when config not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 0 } as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.delete('nonexistent_key')

      expect(result).toBe(false)
    })
  })

  describe('getIdColumn', () => {
    it('should return key as id column', async () => {
      const mockRow = {
        id: 'config-1',
        key: 'test_key',
        value: 'test',
        description: null,
        value_type: 'string',
        updated_at: '2026-01-01T00:00:00Z',
        updated_by: null,
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.getById('test_key')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE key = $1'),
        ['test_key']
      )
    })
  })

  describe('rowToEntity', () => {
    it('should map value_type correctly', async () => {
      const mockRow = {
        id: 'config-1',
        key: 'boolean_config',
        value: 'true',
        description: null,
        value_type: 'boolean',
        updated_at: '2026-01-01T00:00:00Z',
        updated_by: null,
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new SystemConfigRepository(mockDb)
      const result = await repo.getByKey('boolean_config')

      expect(result?.value_type).toBe('boolean')
    })

    it('should handle different value types', async () => {
      const types = ['string', 'number', 'boolean', 'json', 'array']

      for (const type of types) {
        const mockRow = {
          id: 'config-1',
          key: `config_${type}`,
          value: type === 'json' ? '{}' : 'test',
          description: null,
          value_type: type,
          updated_at: '2026-01-01T00:00:00Z',
          updated_by: null,
        }

        vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

        const repo = new SystemConfigRepository(mockDb)
        const result = await repo.getByKey(`config_${type}`)

        expect(result?.value_type).toBe(type)
      }
    })
  })
})