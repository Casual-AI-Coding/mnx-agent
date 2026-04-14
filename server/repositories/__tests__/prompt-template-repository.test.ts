import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PromptTemplateRepository, PromptTemplateListOptions } from '../prompt-template-repository'
import { DatabaseConnection } from '../../database/connection'

describe('PromptTemplateRepository', () => {
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

  describe('list', () => {
    it('should return all templates without filters', async () => {
      const mockRows = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: 'Description 1',
          content: 'Hello {{name}}',
          category: 'general',
          variables: JSON.stringify([{ name: 'name', type: 'string' }]),
          is_builtin: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          owner_id: null,
        },
        {
          id: 'template-2',
          name: 'Template 2',
          description: 'Description 2',
          content: 'Goodbye {{name}}',
          category: 'greeting',
          variables: null,
          is_builtin: true,
          created_at: '2026-01-02T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          owner_id: null,
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.list()

      expect(result.total).toBe(2)
      expect(result.items).toHaveLength(2)
      expect(result.items[0].variables).toEqual([{ name: 'name', type: 'string' }])
    })

    it('should filter by category', async () => {
      const mockRows = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: null,
          content: 'Content',
          category: 'greeting',
          variables: null,
          is_builtin: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          owner_id: null,
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.list({ category: 'greeting' })

      expect(result.total).toBe(1)
      expect(result.items[0].category).toBe('greeting')
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('category = $'),
        expect.arrayContaining(['greeting'])
      )
    })

    it('should filter by owner', async () => {
      const mockRows = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: null,
          content: 'Content',
          category: null,
          variables: null,
          is_builtin: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          owner_id: 'owner-1',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.list({ ownerId: 'owner-1' })

      expect(result.total).toBe(1)
      expect(result.items[0].owner_id).toBe('owner-1')
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $'),
        expect.arrayContaining(['owner-1'])
      )
    })

    it('should filter by both category and owner', async () => {
      const mockRows = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: null,
          content: 'Content',
          category: 'greeting',
          variables: null,
          is_builtin: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          owner_id: 'owner-1',
        },
      ]

      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce(mockRows as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.list({ category: 'greeting', ownerId: 'owner-1' })

      expect(result.total).toBe(1)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_id = $'),
        expect.arrayContaining(['owner-1', 'greeting'])
      )
    })

    it('should apply limit and offset', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.list({ limit: 10, offset: 20 })

      expect(result.total).toBe(100)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([10, 20])
      )
    })

    it('should use default limit and offset', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '50' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new PromptTemplateRepository(mockDb)
      await repo.list()

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[1]).toContain(50)
      expect(queryCall[1]).toContain(0)
    })

    it('should handle empty results', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '0' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.list()

      expect(result.total).toBe(0)
      expect(result.items).toHaveLength(0)
    })
  })

  describe('create', () => {
    it('should create template for postgres', async () => {
      const mockRow = {
        id: 'template-1',
        name: 'New Template',
        description: 'A new template',
        content: 'Hello {{name}}!',
        category: 'greeting',
        variables: JSON.stringify([{ name: 'name', type: 'string', required: true }]),
        is_builtin: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        owner_id: 'owner-1',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.create({
        name: 'New Template',
        description: 'A new template',
        content: 'Hello {{name}}!',
        category: 'greeting',
        variables: [{ name: 'name', type: 'string', required: true }],
      }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO prompt_templates'),
        expect.arrayContaining(['New Template', 'A new template', 'Hello {{name}}!', 'greeting'])
      )
      expect(result).toBeDefined()
      expect(result.variables).toEqual([{ name: 'name', type: 'string', required: true }])
    })

    it('should create template for sqlite', async () => {
      mockDb.isPostgres = vi.fn().mockReturnValue(false)
      const mockRow = {
        id: 'template-1',
        name: 'New Template',
        description: null,
        content: 'Content',
        category: null,
        variables: null,
        is_builtin: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        owner_id: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.create({
        name: 'New Template',
        content: 'Content',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
        expect.any(Array)
      )
      expect(result.is_builtin).toBe(false)
    })

    it('should create builtin template', async () => {
      const mockRow = {
        id: 'template-1',
        name: 'Builtin Template',
        description: null,
        content: 'Content',
        category: null,
        variables: null,
        is_builtin: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        owner_id: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.create({
        name: 'Builtin Template',
        content: 'Content',
        is_builtin: true,
      })

      expect(result.is_builtin).toBe(true)
    })

    it('should create template without variables', async () => {
      const mockRow = {
        id: 'template-1',
        name: 'No Variables',
        description: null,
        content: 'Static content',
        category: null,
        variables: null,
        is_builtin: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        owner_id: null,
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.create({
        name: 'No Variables',
        content: 'Static content',
      })

      expect(result.variables).toEqual([])
    })
  })

  describe('update', () => {
    const existingTemplate = {
      id: 'template-1',
      name: 'Original Name',
      description: 'Original description',
      content: 'Original content',
      category: 'general',
      variables: JSON.stringify([{ name: 'var1' }]),
      is_builtin: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      owner_id: 'owner-1',
    }

    it('should update name field', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingTemplate] as any)
        .mockResolvedValueOnce([{ ...existingTemplate, name: 'New Name' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.update('template-1', { name: 'New Name' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('name = $1'),
        expect.arrayContaining(['New Name'])
      )
      expect(result?.name).toBe('New Name')
    })

    it('should update description field', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingTemplate] as any)
        .mockResolvedValueOnce([{ ...existingTemplate, description: 'New description' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      await repo.update('template-1', { description: 'New description' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('description = $1'),
        expect.arrayContaining(['New description'])
      )
    })

    it('should update content field', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingTemplate] as any)
        .mockResolvedValueOnce([{ ...existingTemplate, content: 'New content' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      await repo.update('template-1', { content: 'New content' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('content = $1'),
        expect.arrayContaining(['New content'])
      )
    })

    it('should update category field', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingTemplate] as any)
        .mockResolvedValueOnce([{ ...existingTemplate, category: 'new-category' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      await repo.update('template-1', { category: 'new-category' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('category = $1'),
        expect.arrayContaining(['new-category'])
      )
    })

    it('should update variables field (JSON stringify)', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingTemplate] as any)
        .mockResolvedValueOnce([{ ...existingTemplate, variables: JSON.stringify([{ name: 'var2' }]) }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      await repo.update('template-1', { variables: [{ name: 'var2' }] }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('variables = $1'),
        expect.arrayContaining([JSON.stringify([{ name: 'var2' }])])
      )
    })

    it('should return null when template not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.update('non-existent', { name: 'New Name' })

      expect(result).toBeNull()
      expect(mockDb.execute).not.toHaveBeenCalled()
    })

    it('should return existing template when no fields to update', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([existingTemplate] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.update('template-1', {}, 'owner-1')

      expect(mockDb.execute).not.toHaveBeenCalled()
      expect(result?.name).toBe('Original Name')
    })

    it('should update multiple fields at once', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingTemplate] as any)
        .mockResolvedValueOnce([{ ...existingTemplate, name: 'New Name', description: 'New description' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      await repo.update('template-1', {
        name: 'New Name',
        description: 'New description',
        content: 'New content',
      }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('name = $1'),
        expect.arrayContaining(['New Name', 'New description', 'New content'])
      )
    })

    it('should apply owner filter in where clause', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingTemplate] as any)
        .mockResolvedValueOnce([existingTemplate] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      await repo.update('template-1', { name: 'New Name' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $'),
        expect.arrayContaining(['owner-1'])
      )
    })

    it('should update without owner filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingTemplate] as any)
        .mockResolvedValueOnce([existingTemplate] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      await repo.update('template-1', { name: 'New Name' })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $'),
        expect.not.arrayContaining(['owner-1'])
      )
    })
  })

  describe('getById', () => {
    it('should return template by id', async () => {
      const mockRow = {
        id: 'template-1',
        name: 'Template',
        description: null,
        content: 'Content',
        category: 'general',
        variables: JSON.stringify([{ name: 'var1' }]),
        is_builtin: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        owner_id: 'owner-1',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.getById('template-1', 'owner-1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('template-1')
      expect(result?.variables).toEqual([{ name: 'var1' }])
    })

    it('should return null when not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete template by id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.delete('template-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM prompt_templates WHERE id = $1',
        ['template-1']
      )
      expect(result).toBe(true)
    })

    it('should delete template with owner filter', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.delete('template-1', 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM prompt_templates WHERE id = $1 AND owner_id = $2',
        ['template-1', 'owner-1']
      )
      expect(result).toBe(true)
    })

    it('should return false when template not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 0 } as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.delete('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('rowToPromptTemplate parsing', () => {
    it('should parse variables from JSON string', async () => {
      const mockRow = {
        id: 'template-1',
        name: 'Template',
        description: null,
        content: 'Content',
        category: null,
        variables: JSON.stringify([
          { name: 'name', type: 'string', required: true },
          { name: 'age', type: 'number' },
        ]),
        is_builtin: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        owner_id: null,
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.getById('template-1')

      expect(result?.variables).toEqual([
        { name: 'name', type: 'string', required: true },
        { name: 'age', type: 'number' },
      ])
    })

    it('should handle null variables', async () => {
      const mockRow = {
        id: 'template-1',
        name: 'Template',
        description: null,
        content: 'Content',
        category: null,
        variables: null,
        is_builtin: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        owner_id: null,
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.getById('template-1')

      expect(result?.variables).toEqual([])
    })

    it('should convert is_builtin from number (sqlite)', async () => {
      const mockRow = {
        id: 'template-1',
        name: 'Template',
        description: null,
        content: 'Content',
        category: null,
        variables: null,
        is_builtin: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        owner_id: null,
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.getById('template-1')

      expect(result?.is_builtin).toBe(true)
    })

    it('should convert is_builtin from 0 to false', async () => {
      const mockRow = {
        id: 'template-1',
        name: 'Template',
        description: null,
        content: 'Content',
        category: null,
        variables: null,
        is_builtin: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        owner_id: null,
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new PromptTemplateRepository(mockDb)
      const result = await repo.getById('template-1')

      expect(result?.is_builtin).toBe(false)
    })
  })
})