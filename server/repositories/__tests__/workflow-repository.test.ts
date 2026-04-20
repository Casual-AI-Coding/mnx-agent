import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowRepository } from '../workflow-repository'
import { DatabaseConnection } from '../../database/connection'
import type { WorkflowTemplateRow, WorkflowVersionRow, CreateWorkflowVersion } from '../../database/types'

describe('WorkflowRepository', () => {
  let mockDb: DatabaseConnection

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      isPostgres: vi.fn().mockReturnValue(true),
    } as unknown as DatabaseConnection
  })

  describe('getAllTemplates', () => {
    it('should return all templates without owner filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'wf-1', name: 'Template 1', nodes_json: '{}', edges_json: '[]', is_public: true, created_at: '2026-04-20' },
        { id: 'wf-2', name: 'Template 2', nodes_json: '{}', edges_json: '[]', is_public: false, created_at: '2026-04-19' },
      ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.getAllTemplates()

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM workflow_templates')
      )
      expect(result).toHaveLength(2)
    })

    it('should filter by ownerId when provided', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'wf-1', name: 'My Template', owner_id: 'user-123', nodes_json: '{}', edges_json: '[]', is_public: false, created_at: '2026-04-20' },
      ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.getAllTemplates('user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_id = $1'),
        ['user-123']
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('getTemplatesPaginated', () => {
    it('should return paginated templates with count', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '50' }] as any)
        .mockResolvedValueOnce([
          { id: 'wf-1', name: 'Template 1', nodes_json: '{}', edges_json: '[]', is_public: true, created_at: '2026-04-20' },
        ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.getTemplatesPaginated({ limit: 10, offset: 0 })

      expect(result.total).toBe(50)
      expect(result.templates).toHaveLength(1)
    })

    it('should filter by ownerId', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      await repo.getTemplatesPaginated({ ownerId: 'user-123' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $'),
        expect.arrayContaining(['user-123'])
      )
    })

    it('should filter by isPublic', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      await repo.getTemplatesPaginated({ isPublic: true })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_public = $'),
        expect.arrayContaining([true])
      )
    })

    it('should combine ownerId and isPublic filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      await repo.getTemplatesPaginated({ ownerId: 'user-123', isPublic: true })

      const queryCall = mockDb.query.mock.calls[0]
      expect(queryCall[0]).toContain('owner_id = $')
      expect(queryCall[0]).toContain('is_public = $')
    })
  })

  describe('getTemplateById', () => {
    it('should return template by id without owner', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'wf-1', name: 'Template 1', nodes_json: '{}', edges_json: '[]', is_public: true, created_at: '2026-04-20' },
      ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.getTemplateById('wf-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('wf-1')
    })

    it('should return template with owner filter and public check', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'wf-1', name: 'Template 1', owner_id: 'user-123', nodes_json: '{}', edges_json: '[]', is_public: true, created_at: '2026-04-20' },
      ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.getTemplateById('wf-1', 'user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $2 OR is_public = true'),
        expect.arrayContaining(['wf-1', 'user-123'])
      )
      expect(result).not.toBeNull()
    })

    it('should return null when not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.getTemplateById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('createTemplate', () => {
    it('should create template with all fields', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'wf-new', name: 'New Template', nodes_json: '{"nodes":[]}', edges_json: '[]', is_public: true, owner_id: 'user-123', created_at: '2026-04-20' },
      ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.createTemplate({
        name: 'New Template',
        description: 'A new template',
        nodes_json: '{"nodes":[]}',
        edges_json: '[]',
        is_public: true,
      }, 'user-123')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO workflow_templates'),
        expect.any(Array)
      )
      expect(result.name).toBe('New Template')
    })

    it('should default is_public to true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'wf-new', name: 'Template', nodes_json: '{}', edges_json: '[]', is_public: true, created_at: '2026-04-20' },
      ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      await repo.createTemplate({
        name: 'Template',
        nodes_json: '{}',
        edges_json: '[]',
      })

      const executeCall = mockDb.execute.mock.calls[0]
      expect(executeCall[1]).toContain(true) // is_public
    })
  })

  describe('updateTemplate', () => {
    it('should update template fields', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ id: 'wf-1', name: 'Old Name', nodes_json: '{}', edges_json: '[]', is_public: false, created_at: '2026-04-20' }] as WorkflowTemplateRow[])
        .mockResolvedValueOnce([{ id: 'wf-1', name: 'Updated Name', nodes_json: '{}', edges_json: '[]', is_public: false, created_at: '2026-04-20' }] as WorkflowTemplateRow[])
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.updateTemplate('wf-1', { name: 'Updated Name' })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE workflow_templates SET'),
        expect.arrayContaining(['Updated Name'])
      )
      expect(result?.name).toBe('Updated Name')
    })

    it('should return null when template not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.updateTemplate('non-existent', { name: 'Test' })

      expect(result).toBeNull()
    })

    it('should include owner filter in where clause when ownerId provided', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ id: 'wf-1', name: 'Template', nodes_json: '{}', edges_json: '[]', is_public: false, owner_id: 'user-123', created_at: '2026-04-20' }] as WorkflowTemplateRow[])
        .mockResolvedValueOnce([{ id: 'wf-1', name: 'Template', nodes_json: '{}', edges_json: '[]', is_public: false, owner_id: 'user-123', created_at: '2026-04-20' }] as WorkflowTemplateRow[])
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WorkflowRepository(mockDb)
      await repo.updateTemplate('wf-1', { name: 'Updated' }, 'user-123')

      const executeCall = mockDb.execute.mock.calls[0]
      expect(executeCall[0]).toContain('owner_id = $')
    })
  })

  describe('deleteTemplate', () => {
    it('should delete template by id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.deleteTemplate('wf-1')

      expect(result).toBe(true)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM workflow_templates'),
        ['wf-1']
      )
    })

    it('should delete with owner filter', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.deleteTemplate('wf-1', 'user-123')

      expect(result).toBe(true)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('owner_id = $2'),
        expect.arrayContaining(['wf-1', 'user-123'])
      )
    })

    it('should return false when not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 0 } as any)

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.deleteTemplate('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('getPublicTemplates', () => {
    it('should return all public templates', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'wf-1', name: 'Public 1', is_public: true, nodes_json: '{}', edges_json: '[]', created_at: '2026-04-20' },
        { id: 'wf-2', name: 'Public 2', is_public: true, nodes_json: '{}', edges_json: '[]', created_at: '2026-04-19' },
      ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.getPublicTemplates()

      expect(result).toHaveLength(2)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_public = true')
      )
    })

    it('should return public templates for specific owner', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'wf-1', name: 'My Public', owner_id: 'user-123', is_public: true, nodes_json: '{}', edges_json: '[]', created_at: '2026-04-20' },
      ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.getPublicTemplates('user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_public = true AND owner_id = $1'),
        ['user-123']
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('permissions', () => {
    describe('createPermission', () => {
      it('should create workflow permission', async () => {
        vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

        const repo = new WorkflowRepository(mockDb)
        await repo.createPermission({
          workflow_id: 'wf-1',
          user_id: 'user-456',
          granted_by: 'user-123',
        })

        expect(mockDb.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO workflow_permissions'),
          expect.arrayContaining(['wf-1', 'user-456', 'user-123'])
        )
      })
    })

    describe('deletePermission', () => {
      it('should delete workflow permission', async () => {
        vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

        const repo = new WorkflowRepository(mockDb)
        await repo.deletePermission('wf-1', 'user-456')

        expect(mockDb.execute).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM workflow_permissions'),
          ['wf-1', 'user-456']
        )
      })
    })

    describe('hasPermission', () => {
      it('should return true when permission exists', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([{ id: 'perm-1' }] as any)

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.hasPermission('wf-1', 'user-456')

        expect(result).toBe(true)
      })

      it('should return false when permission does not exist', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.hasPermission('wf-1', 'user-456')

        expect(result).toBe(false)
      })
    })

    describe('getPermissions', () => {
      it('should return permissions with user details', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([
          { id: 'perm-1', workflow_id: 'wf-1', user_id: 'user-456', granted_by: 'user-123', created_at: '2026-04-20', username: 'testuser', email: 'test@example.com' },
        ] as any)

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.getPermissions('wf-1')

        expect(result).toHaveLength(1)
        expect(result[0].username).toBe('testuser')
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('JOIN users u ON wp.user_id = u.id'),
          ['wf-1']
        )
      })
    })
  })

  describe('getAvailableWorkflows', () => {
    it('should return workflows owned by, shared with, or public to user', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'wf-1', name: 'My Workflow', owner_id: 'user-123', nodes_json: '{}', edges_json: '[]', is_public: false, created_at: '2026-04-20' },
        { id: 'wf-2', name: 'Shared Workflow', owner_id: 'other', nodes_json: '{}', edges_json: '[]', is_public: false, created_at: '2026-04-19' },
        { id: 'wf-3', name: 'Public Workflow', owner_id: 'other', nodes_json: '{}', edges_json: '[]', is_public: true, created_at: '2026-04-18' },
      ] as WorkflowTemplateRow[])

      const repo = new WorkflowRepository(mockDb)
      const result = await repo.getAvailableWorkflows('user-123')

      expect(result).toHaveLength(3)
      const queryCall = mockDb.query.mock.calls[0]
      expect(queryCall[0]).toContain('wt.owner_id = $1')
      expect(queryCall[0]).toContain('wp.user_id = $1')
      expect(queryCall[0]).toContain('wt.is_public = true')
    })
  })

  describe('versions', () => {
    describe('createVersion', () => {
      it('should create workflow version', async () => {
        vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
        vi.mocked(mockDb.query).mockResolvedValueOnce([
          { id: 'ver-abc123', template_id: 'wf-1', version_number: 1, name: 'Template', nodes_json: '{}', edges_json: '[]', is_active: true, created_at: '2026-04-20' },
        ] as WorkflowVersionRow[])

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.createVersion({
          template_id: 'wf-1',
          version_number: 1,
          name: 'Version 1',
          description: 'Initial version',
          nodes_json: '{}',
          edges_json: '[]',
        })

        expect(mockDb.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO workflow_versions'),
          expect.any(Array)
        )
        expect(result.version_number).toBe(1)
      })

      it('should default is_active to true', async () => {
        vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
        vi.mocked(mockDb.query).mockResolvedValueOnce([
          { id: 'ver-abc', template_id: 'wf-1', version_number: 1, is_active: true, nodes_json: '{}', edges_json: '[]', created_at: '2026-04-20' },
        ] as WorkflowVersionRow[])

        const repo = new WorkflowRepository(mockDb)
        await repo.createVersion({
          template_id: 'wf-1',
          version_number: 1,
          name: 'Version',
          nodes_json: '{}',
          edges_json: '[]',
        })

        const executeCall = mockDb.execute.mock.calls[0]
        expect(executeCall[1]).toContain(true)
      })
    })

    describe('getVersionById', () => {
      it('should return version by id', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([
          { id: 'ver-abc', template_id: 'wf-1', version_number: 1, is_active: true, nodes_json: '{}', edges_json: '[]', created_at: '2026-04-20' },
        ] as WorkflowVersionRow[])

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.getVersionById('ver-abc')

        expect(result).not.toBeUndefined()
        expect(result?.id).toBe('ver-abc')
      })

      it('should return undefined when not found', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.getVersionById('non-existent')

        expect(result).toBeUndefined()
      })
    })

    describe('getVersionsByTemplate', () => {
      it('should return all versions for template ordered by version desc', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([
          { id: 'ver-2', template_id: 'wf-1', version_number: 2, is_active: false, nodes_json: '{}', edges_json: '[]', created_at: '2026-04-20' },
          { id: 'ver-1', template_id: 'wf-1', version_number: 1, is_active: true, nodes_json: '{}', edges_json: '[]', created_at: '2026-04-19' },
        ] as WorkflowVersionRow[])

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.getVersionsByTemplate('wf-1')

        expect(result).toHaveLength(2)
        expect(result[0].version_number).toBe(2)
      })
    })

    describe('getActiveVersion', () => {
      it('should return active version for template', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([
          { id: 'ver-2', template_id: 'wf-1', version_number: 2, is_active: true, nodes_json: '{}', edges_json: '[]', created_at: '2026-04-20' },
        ] as WorkflowVersionRow[])

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.getActiveVersion('wf-1')

        expect(result).not.toBeUndefined()
        expect(result?.is_active).toBe(true)
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('is_active = true'),
          ['wf-1']
        )
      })
    })

    describe('getLatestVersionNumber', () => {
      it('should return max version number', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([{ max: 5 }] as any)

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.getLatestVersionNumber('wf-1')

        expect(result).toBe(5)
      })

      it('should return 0 when no versions exist', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([{ max: null }] as any)

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.getLatestVersionNumber('wf-1')

        expect(result).toBe(0)
      })
    })

    describe('activateVersion', () => {
      it('should deactivate all versions then activate target', async () => {
        vi.mocked(mockDb.execute)
          .mockResolvedValueOnce({ changes: 3 } as any)
          .mockResolvedValueOnce({ changes: 1 } as any)

        const repo = new WorkflowRepository(mockDb)
        await repo.activateVersion('ver-2', 'wf-1')

        expect(mockDb.execute).toHaveBeenCalledTimes(2)
      })
    })

    describe('deleteVersion', () => {
      it('should delete version by id', async () => {
        vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

        const repo = new WorkflowRepository(mockDb)
        await repo.deleteVersion('ver-abc')

        expect(mockDb.execute).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM workflow_versions'),
          ['ver-abc']
        )
      })
    })

    describe('saveTemplateVersion', () => {
      it('should create new version with incremented number', async () => {
        vi.mocked(mockDb.query)
          .mockResolvedValueOnce([{ id: 'wf-1', name: 'Template', nodes_json: '{}', edges_json: '[]', is_public: true, created_at: '2026-04-20' }] as WorkflowTemplateRow[])
          .mockResolvedValueOnce([{ max: 2 }] as any)
        vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
        vi.mocked(mockDb.query).mockResolvedValueOnce([
          { id: 'ver-new', template_id: 'wf-1', version_number: 3, is_active: true, nodes_json: '{}', edges_json: '[]', created_at: '2026-04-20' },
        ] as WorkflowVersionRow[])

        const repo = new WorkflowRepository(mockDb)
        const result = await repo.saveTemplateVersion('wf-1', '{}', '[]', 'Updated nodes', 'user-123')

        expect(result.version_number).toBe(3)
      })

      it('should throw error when template not found', async () => {
        vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

        const repo = new WorkflowRepository(mockDb)
        await expect(
          repo.saveTemplateVersion('non-existent', '{}', '[]', null, null)
        ).rejects.toThrow('Template non-existent not found')
      })
    })
  })
})