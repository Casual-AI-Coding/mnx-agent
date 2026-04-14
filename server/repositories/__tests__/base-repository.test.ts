import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseRepository } from '../base-repository'
import { DatabaseConnection } from '../../database/connection'

interface TestEntity {
  id: string
  name: string
  owner_id?: string
  created_at: string
  updated_at: string
}

interface CreateTestEntity {
  name: string
  owner_id?: string
}

interface UpdateTestEntity {
  name?: string
  description?: string | null
  displayName?: string
  active?: boolean
  verified?: boolean
  count?: number
  status?: string | number
  priority?: number
  optional?: undefined
}

class TestRepository extends BaseRepository<TestEntity, CreateTestEntity, UpdateTestEntity> {
  protected readonly tableName = 'test_table'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): TestEntity {
    return row as TestEntity
  }

  async create(data: CreateTestEntity, ownerId?: string): Promise<TestEntity> {
    const id = this.generateId()
    const now = this.toISODate()
    await this.conn.execute(
      `INSERT INTO test_table (id, name, owner_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
      [id, data.name, ownerId ?? null, now, now]
    )
    return (await this.getById(id))!
  }
}

describe('BaseRepository', () => {
  let mockDb: DatabaseConnection
  let repo: TestRepository

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
    repo = new TestRepository(mockDb)
  })

  describe('getById', () => {
    it('should return entity by id without owner filter', async () => {
      const mockRow = {
        id: 'entity-1',
        name: 'Test Entity',
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const result = await repo.getById('entity-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE id = $1',
        ['entity-1']
      )
      expect(result).toBeDefined()
      expect(result?.id).toBe('entity-1')
    })

    it('should return entity by id with owner filter', async () => {
      const mockRow = {
        id: 'entity-1',
        name: 'Test Entity',
        owner_id: 'owner-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const result = await repo.getById('entity-1', 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE id = $1 AND owner_id = $2',
        ['entity-1', 'owner-1']
      )
      expect(result).toBeDefined()
      expect(result?.owner_id).toBe('owner-1')
    })

    it('should return null when entity not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const result = await repo.getById('nonexistent')

      expect(result).toBeNull()
    })

    it('should return null when entity not found with owner filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const result = await repo.getById('entity-1', 'wrong-owner')

      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    it('should return all entities with default pagination', async () => {
      const mockRows = [
        {
          id: 'entity-1',
          name: 'Entity 1',
          owner_id: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'entity-2',
          name: 'Entity 2',
          owner_id: null,
          created_at: '2026-01-02T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const result = await repo.list()

      expect(result.total).toBe(2)
      expect(result.items).toHaveLength(2)
    })

    it('should filter by owner_id', async () => {
      const mockRows = [
        {
          id: 'entity-1',
          name: 'Entity 1',
          owner_id: 'owner-1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const result = await repo.list({ ownerId: 'owner-1' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $1'),
        expect.arrayContaining(['owner-1'])
      )
      expect(result.total).toBe(1)
      expect(result.items[0].owner_id).toBe('owner-1')
    })

    it('should apply custom limit and offset', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)

      const result = await repo.list({ limit: 25, offset: 50 })

      expect(result.total).toBe(100)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([25, 50])
      )
    })

    it('should filter by additional conditions', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)

      const result = await repo.list({ ownerId: 'owner-1', status: 'active', type: 'standard' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_id = $1 AND status = $2 AND type = $3'),
        expect.arrayContaining(['owner-1', 'active', 'standard'])
      )
      expect(result.total).toBe(5)
    })

    it('should handle empty results', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '0' }] as any)
        .mockResolvedValueOnce([] as any)

      const result = await repo.list()

      expect(result.total).toBe(0)
      expect(result.items).toHaveLength(0)
    })

    it('should order by created_at DESC', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce([] as any)

      await repo.list()

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      )
    })

    it('should skip null and undefined values in conditions', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce([] as any)

      await repo.list({ ownerId: 'owner-1', nullableField: null, undefinedField: undefined })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_id = $1'),
        expect.arrayContaining(['owner-1'])
      )
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.not.stringContaining('nullableField'),
        expect.any(Array)
      )
    })

    it('should include boolean conditions', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([] as any)

      await repo.list({ is_active: true, is_published: false })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = $1 AND is_published = $2'),
        expect.arrayContaining([true, false])
      )
    })

    it('should include numeric conditions', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([] as any)

      await repo.list({ status: 1, priority: 5 })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1 AND priority = $2'),
        expect.arrayContaining([1, 5])
      )
    })

    it('should handle only limit without offset', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '50' }] as any)
        .mockResolvedValueOnce([] as any)

      await repo.list({ limit: 10 })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        expect.arrayContaining([10, 0])
      )
    })

    it('should handle only offset without custom limit', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)

      await repo.list({ offset: 25 })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([50, 25])
      )
    })
  })

  describe('delete', () => {
    it('should delete entity by id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const result = await repo.delete('entity-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE id = $1',
        ['entity-1']
      )
      expect(result).toBe(true)
    })

    it('should delete entity with owner filter', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const result = await repo.delete('entity-1', 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE id = $1 AND owner_id = $2',
        ['entity-1', 'owner-1']
      )
      expect(result).toBe(true)
    })

    it('should return false when entity not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 0 } as any)

      const result = await repo.delete('nonexistent')

      expect(result).toBe(false)
    })

    it('should return false when wrong owner', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 0 } as any)

      const result = await repo.delete('entity-1', 'wrong-owner')

      expect(result).toBe(false)
    })

    it('should handle delete result without changes property', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({} as any)

      const result = await repo.delete('entity-1')

      expect(result).toBe(false)
    })
  })

  describe('buildUpdateFields', () => {
    it('should build update fields from object', async () => {
      const updates = { name: 'New Name', status: 'active' }
      const { fields, values, paramIndex } = repo['buildUpdateFields'](updates)

      expect(fields).toContain('name = $1')
      expect(fields).toContain('status = $2')
      expect(values).toEqual(['New Name', 'active'])
      expect(paramIndex).toBe(3)
    })

    it('should use field mapping when provided', async () => {
      const updates = { displayName: 'New Name' }
      const fieldMapping = { displayName: 'display_name' }
      const { fields, values } = repo['buildUpdateFields'](updates, fieldMapping)

      expect(fields).toContain('display_name = $1')
      expect(values).toEqual(['New Name'])
    })

    it('should skip undefined values', async () => {
      const updates = { name: 'New Name', optional: undefined }
      const { fields, values } = repo['buildUpdateFields'](updates)

      expect(fields).toHaveLength(1)
      expect(fields).toContain('name = $1')
      expect(values).toEqual(['New Name'])
    })

    it('should handle empty updates', async () => {
      const updates = {}
      const { fields, values, paramIndex } = repo['buildUpdateFields'](updates)

      expect(fields).toHaveLength(0)
      expect(values).toHaveLength(0)
      expect(paramIndex).toBe(1)
    })

    it('should include null values (not skip them)', async () => {
      const updates = { name: 'New Name', description: null }
      const { fields, values } = repo['buildUpdateFields'](updates)

      expect(fields).toHaveLength(2)
      expect(fields).toContain('name = $1')
      expect(fields).toContain('description = $2')
      expect(values).toEqual(['New Name', null])
    })

    it('should handle boolean values', async () => {
      const updates = { active: true, verified: false }
      const { fields, values } = repo['buildUpdateFields'](updates)

      expect(fields).toHaveLength(2)
      expect(fields).toContain('active = $1')
      expect(fields).toContain('verified = $2')
      expect(values).toEqual([true, false])
    })

    it('should handle mixed types including null, boolean, string, number', async () => {
      const updates = { name: 'Test', count: 5, active: true, description: null }
      const { fields, values } = repo['buildUpdateFields'](updates)

      expect(fields).toHaveLength(4)
      expect(values).toEqual(['Test', 5, true, null])
    })
  })

  describe('executeUpdate', () => {
    const existingEntity = {
      id: 'entity-1',
      name: 'Original Name',
      owner_id: 'owner-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    it('should execute update and return entity', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ ...existingEntity, name: 'New Name' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const result = await repo['executeUpdate']({ name: 'New Name' }, 'entity-1', 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE test_table SET name = $1'),
        expect.any(Array)
      )
      expect(result?.name).toBe('New Name')
    })

    it('should return existing entity when no updates', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([existingEntity] as any)

      const result = await repo['executeUpdate']({}, 'entity-1', 'owner-1')

      expect(mockDb.execute).not.toHaveBeenCalled()
      expect(result?.name).toBe('Original Name')
    })

    it('should include updated_at in update', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([existingEntity] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      await repo['executeUpdate']({ name: 'New Name' }, 'entity-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = $'),
        expect.any(Array)
      )
    })

    it('should apply owner filter in where clause', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([existingEntity] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      await repo['executeUpdate']({ name: 'New Name' }, 'entity-1', 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $'),
        expect.arrayContaining(['owner-1'])
      )
    })

    it('should return null when entity not found after update', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const result = await repo['executeUpdate']({ name: 'New Name' }, 'deleted-entity', 'owner-1')

      expect(result).toBeNull()
    })

    it('should handle update without owner filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([existingEntity] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      await repo['executeUpdate']({ name: 'New Name' }, 'entity-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $'),
        expect.not.arrayContaining(['owner-1'])
      )
    })
  })

  describe('generateId', () => {
    it('should generate UUID', () => {
      const id = repo['generateId']()

      expect(id).toMatch(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/)
    })

    it('should generate unique IDs', () => {
      const id1 = repo['generateId']()
      const id2 = repo['generateId']()

      expect(id1).not.toBe(id2)
    })
  })

  describe('toISODate', () => {
    it('should return ISO date string', () => {
      const date = repo['toISODate']()

      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('isPostgres', () => {
    it('should return true for postgres', () => {
      vi.mocked(mockDb.isPostgres).mockReturnValue(true)

      expect(repo['isPostgres']()).toBe(true)
    })

    it('should return false for sqlite', () => {
      vi.mocked(mockDb.isPostgres).mockReturnValue(false)

      expect(repo['isPostgres']()).toBe(false)
    })
  })

  describe('tableName', () => {
    it('should use correct table name in queries', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      await repo.getById('test-id')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('test_table'),
        expect.any(Array)
      )
    })
  })

  describe('getIdColumn', () => {
    it('should use correct id column in queries', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      await repo.getById('test-id')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        expect.any(Array)
      )
    })
  })
})