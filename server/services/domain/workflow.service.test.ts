import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowService } from './workflow.service.js'
import type { DatabaseService } from '../../database/service-async.js'
import type {
  WorkflowTemplate,
  WorkflowVersion,
  CreateWorkflowTemplate,
  UpdateWorkflowTemplate,
  CreateWorkflowVersion,
} from '../../database/types.js'

describe('WorkflowService', () => {
  let service: WorkflowService
  let mockDb: {
    getWorkflowTemplateById: ReturnType<typeof vi.fn>
    getAllWorkflowTemplates: ReturnType<typeof vi.fn>
    getWorkflowTemplatesPaginated: ReturnType<typeof vi.fn>
    getMarkedWorkflowTemplates: ReturnType<typeof vi.fn>
    createWorkflowTemplate: ReturnType<typeof vi.fn>
    updateWorkflowTemplate: ReturnType<typeof vi.fn>
    deleteWorkflowTemplate: ReturnType<typeof vi.fn>
    getWorkflowVersionsByTemplate: ReturnType<typeof vi.fn>
    getActiveWorkflowVersion: ReturnType<typeof vi.fn>
    createWorkflowVersion: ReturnType<typeof vi.fn>
    activateWorkflowVersion: ReturnType<typeof vi.fn>
    deleteWorkflowVersion: ReturnType<typeof vi.fn>
    getWorkflowVersionById: ReturnType<typeof vi.fn>
  }

  const mockTemplate: WorkflowTemplate = {
    id: 'template-1',
    name: 'Test Workflow',
    description: 'A test workflow template',
    nodes_json: '{"nodes":[]}',
    edges_json: '{"edges":[]}',
    owner_id: 'owner-1',
    is_public: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockVersion: WorkflowVersion = {
    id: 'version-1',
    template_id: 'template-1',
    version_number: 1,
    name: 'Version 1',
    description: 'First version',
    nodes_json: '{"nodes":[]}',
    edges_json: '{"edges":[]}',
    change_summary: 'Initial version',
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    is_active: true,
  }

  beforeEach(() => {
    mockDb = {
      getWorkflowTemplateById: vi.fn(),
      getAllWorkflowTemplates: vi.fn(),
      getWorkflowTemplatesPaginated: vi.fn(),
      getMarkedWorkflowTemplates: vi.fn(),
      createWorkflowTemplate: vi.fn(),
      updateWorkflowTemplate: vi.fn(),
      deleteWorkflowTemplate: vi.fn(),
      getWorkflowVersionsByTemplate: vi.fn(),
      getActiveWorkflowVersion: vi.fn(),
      createWorkflowVersion: vi.fn(),
      activateWorkflowVersion: vi.fn(),
      deleteWorkflowVersion: vi.fn(),
      getWorkflowVersionById: vi.fn(),
    }
    service = new WorkflowService(mockDb as unknown as DatabaseService)
  })

  describe('getById', () => {
    it('should return template by id', async () => {
      mockDb.getWorkflowTemplateById.mockResolvedValue(mockTemplate)
      const result = await service.getById('template-1', 'owner-1')
      expect(mockDb.getWorkflowTemplateById).toHaveBeenCalledWith('template-1', 'owner-1')
      expect(result).toEqual(mockTemplate)
    })

    it('should return null if not found', async () => {
      mockDb.getWorkflowTemplateById.mockResolvedValue(null)
      const result = await service.getById('nonexistent')
      expect(result).toBeNull()
    })

    it('should call db without ownerId when not provided', async () => {
      mockDb.getWorkflowTemplateById.mockResolvedValue(mockTemplate)
      await service.getById('template-1')
      expect(mockDb.getWorkflowTemplateById).toHaveBeenCalledWith('template-1', undefined)
    })
  })

  describe('getAll', () => {
    it('should return all templates with ownerId filter', async () => {
      mockDb.getAllWorkflowTemplates.mockResolvedValue([mockTemplate])
      const result = await service.getAll('owner-1')
      expect(mockDb.getAllWorkflowTemplates).toHaveBeenCalledWith('owner-1')
      expect(result).toEqual([mockTemplate])
    })

    it('should return all templates without ownerId filter', async () => {
      mockDb.getAllWorkflowTemplates.mockResolvedValue([mockTemplate])
      const result = await service.getAll()
      expect(mockDb.getAllWorkflowTemplates).toHaveBeenCalledWith(undefined)
      expect(result).toEqual([mockTemplate])
    })

    it('should return empty array when no templates', async () => {
      mockDb.getAllWorkflowTemplates.mockResolvedValue([])
      const result = await service.getAll('owner-1')
      expect(result).toEqual([])
    })

    it('should return multiple templates', async () => {
      const templates = [
        mockTemplate,
        { ...mockTemplate, id: 'template-2', name: 'Second Workflow' },
      ]
      mockDb.getAllWorkflowTemplates.mockResolvedValue(templates)
      const result = await service.getAll('owner-1')
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('template-1')
      expect(result[1].id).toBe('template-2')
    })
  })

  describe('getPaginated', () => {
    it('should return paginated templates with correct offset calculation', async () => {
      const paginatedResult = { templates: [mockTemplate], total: 10 }
      mockDb.getWorkflowTemplatesPaginated.mockResolvedValue(paginatedResult)

      const result = await service.getPaginated(2, 5, 'owner-1')

      // offset = (page - 1) * limit = (2 - 1) * 5 = 5
      expect(mockDb.getWorkflowTemplatesPaginated).toHaveBeenCalledWith({
        ownerId: 'owner-1',
        limit: 5,
        offset: 5,
      })
      expect(result).toEqual(paginatedResult)
    })

    it('should calculate offset for first page', async () => {
      const paginatedResult = { templates: [mockTemplate], total: 1 }
      mockDb.getWorkflowTemplatesPaginated.mockResolvedValue(paginatedResult)

      const result = await service.getPaginated(1, 10, 'owner-1')

      // offset = (1 - 1) * 10 = 0
      expect(mockDb.getWorkflowTemplatesPaginated).toHaveBeenCalledWith({
        ownerId: 'owner-1',
        limit: 10,
        offset: 0,
      })
      expect(result).toEqual(paginatedResult)
    })

    it('should work without ownerId', async () => {
      const paginatedResult = { templates: [], total: 0 }
      mockDb.getWorkflowTemplatesPaginated.mockResolvedValue(paginatedResult)

      const result = await service.getPaginated(1, 20)

      expect(mockDb.getWorkflowTemplatesPaginated).toHaveBeenCalledWith({
        ownerId: undefined,
        limit: 20,
        offset: 0,
      })
      expect(result.templates).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should handle large page numbers', async () => {
      const paginatedResult = { templates: [], total: 100 }
      mockDb.getWorkflowTemplatesPaginated.mockResolvedValue(paginatedResult)

      await service.getPaginated(10, 10)

      // offset = (10 - 1) * 10 = 90
      expect(mockDb.getWorkflowTemplatesPaginated).toHaveBeenCalledWith({
        ownerId: undefined,
        limit: 10,
        offset: 90,
      })
    })
  })

  describe('getMarked', () => {
    it('should return marked templates with ownerId', async () => {
      mockDb.getMarkedWorkflowTemplates.mockResolvedValue([mockTemplate])
      const result = await service.getMarked('owner-1')
      expect(mockDb.getMarkedWorkflowTemplates).toHaveBeenCalledWith('owner-1')
      expect(result).toEqual([mockTemplate])
    })

    it('should return marked templates without ownerId', async () => {
      mockDb.getMarkedWorkflowTemplates.mockResolvedValue([])
      const result = await service.getMarked()
      expect(mockDb.getMarkedWorkflowTemplates).toHaveBeenCalledWith(undefined)
      expect(result).toEqual([])
    })
  })

  describe('create', () => {
    it('should create a new template', async () => {
      const createData: CreateWorkflowTemplate = {
        name: 'New Workflow',
        description: 'Description',
        nodes_json: '{"nodes":["node1"]}',
        edges_json: '{"edges":["edge1"]}',
        is_public: false,
      }
      mockDb.createWorkflowTemplate.mockResolvedValue({
        ...mockTemplate,
        name: 'New Workflow',
      })

      const result = await service.create(createData, 'owner-1')

      expect(mockDb.createWorkflowTemplate).toHaveBeenCalledWith(
        {
          name: 'New Workflow',
          description: 'Description',
          nodes_json: '{"nodes":["node1"]}',
          edges_json: '{"edges":["edge1"]}',
          is_public: false,
        },
        'owner-1'
      )
      expect(result.name).toBe('New Workflow')
    })

    it('should create template without ownerId', async () => {
      const createData: CreateWorkflowTemplate = {
        name: 'Public Workflow',
        nodes_json: '{}',
        edges_json: '{}',
        is_public: true,
      }
      mockDb.createWorkflowTemplate.mockResolvedValue({
        ...mockTemplate,
        name: 'Public Workflow',
        is_public: true,
        owner_id: null,
      })

      const result = await service.create(createData)

      expect(mockDb.createWorkflowTemplate).toHaveBeenCalledWith(
        {
          name: 'Public Workflow',
          nodes_json: '{}',
          edges_json: '{}',
          is_public: true,
        },
        undefined
      )
      expect(result.is_public).toBe(true)
    })

    it('should propagate database errors', async () => {
      const createData: CreateWorkflowTemplate = {
        name: '',
        nodes_json: '{}',
        edges_json: '{}',
      }
      mockDb.createWorkflowTemplate.mockRejectedValue(new Error('Name required'))

      await expect(service.create(createData)).rejects.toThrow('Name required')
    })

    it('should create template with all optional fields', async () => {
      const createData: CreateWorkflowTemplate = {
        name: 'Full Workflow',
        description: 'Full description',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
        is_public: true,
      }
      mockDb.createWorkflowTemplate.mockResolvedValue({
        ...mockTemplate,
        ...createData,
      })

      const result = await service.create(createData, 'owner-1')

      expect(result.name).toBe('Full Workflow')
      expect(result.description).toBe('Full description')
      expect(result.is_public).toBe(true)
    })
  })

  describe('update', () => {
    it('should update template', async () => {
      const updateData: UpdateWorkflowTemplate = { name: 'Updated Name' }
      mockDb.updateWorkflowTemplate.mockResolvedValue({
        ...mockTemplate,
        name: 'Updated Name',
      })

      const result = await service.update('template-1', updateData, 'owner-1')

      expect(mockDb.updateWorkflowTemplate).toHaveBeenCalledWith(
        'template-1',
        updateData,
        'owner-1'
      )
      expect(result?.name).toBe('Updated Name')
    })

    it('should return null when updating non-existent template', async () => {
      mockDb.updateWorkflowTemplate.mockResolvedValue(null)
      const result = await service.update('nonexistent', { name: 'Updated' })
      expect(result).toBeNull()
    })

    it('should update without ownerId', async () => {
      mockDb.updateWorkflowTemplate.mockResolvedValue(mockTemplate)
      await service.update('template-1', { description: 'New desc' })
      expect(mockDb.updateWorkflowTemplate).toHaveBeenCalledWith(
        'template-1',
        { description: 'New desc' },
        undefined
      )
    })

    it('should update multiple fields', async () => {
      const updateData: UpdateWorkflowTemplate = {
        name: 'Updated',
        description: 'New description',
        is_public: true,
      }
      mockDb.updateWorkflowTemplate.mockResolvedValue({
        ...mockTemplate,
        ...updateData,
      })

      const result = await service.update('template-1', updateData)

      expect(result?.name).toBe('Updated')
      expect(result?.description).toBe('New description')
      expect(result?.is_public).toBe(true)
    })
  })

  describe('delete', () => {
    it('should delete template', async () => {
      mockDb.deleteWorkflowTemplate.mockResolvedValue(true)
      await service.delete('template-1', 'owner-1')
      expect(mockDb.deleteWorkflowTemplate).toHaveBeenCalledWith('template-1', 'owner-1')
    })

    it('should throw if template not found', async () => {
      mockDb.deleteWorkflowTemplate.mockResolvedValue(false)
      await expect(service.delete('nonexistent')).rejects.toThrow(
        'WorkflowTemplate not found: nonexistent'
      )
    })

    it('should delete without ownerId', async () => {
      mockDb.deleteWorkflowTemplate.mockResolvedValue(true)
      await service.delete('template-1')
      expect(mockDb.deleteWorkflowTemplate).toHaveBeenCalledWith('template-1', undefined)
    })

    it('should throw with correct id in error message', async () => {
      mockDb.deleteWorkflowTemplate.mockResolvedValue(false)
      await expect(service.delete('missing-123')).rejects.toThrow(
        'WorkflowTemplate not found: missing-123'
      )
    })
  })

  describe('getVersions', () => {
    it('should return all versions for a template', async () => {
      const versions = [mockVersion, { ...mockVersion, id: 'version-2', version_number: 2 }]
      mockDb.getWorkflowVersionsByTemplate.mockResolvedValue(versions)

      const result = await service.getVersions('template-1')

      expect(mockDb.getWorkflowVersionsByTemplate).toHaveBeenCalledWith('template-1')
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no versions', async () => {
      mockDb.getWorkflowVersionsByTemplate.mockResolvedValue([])
      const result = await service.getVersions('template-1')
      expect(result).toEqual([])
    })
  })

  describe('getActiveVersion', () => {
    it('should return active version', async () => {
      mockDb.getActiveWorkflowVersion.mockResolvedValue(mockVersion)
      const result = await service.getActiveVersion('template-1')
      expect(mockDb.getActiveWorkflowVersion).toHaveBeenCalledWith('template-1')
      expect(result).toEqual(mockVersion)
    })

    it('should return null when no active version', async () => {
      mockDb.getActiveWorkflowVersion.mockResolvedValue(null)
      const result = await service.getActiveVersion('template-1')
      expect(result).toBeNull()
    })

    it('should return null when db returns undefined', async () => {
      mockDb.getActiveWorkflowVersion.mockResolvedValue(undefined)
      const result = await service.getActiveVersion('template-1')
      expect(result).toBeNull()
    })
  })

  describe('createVersion', () => {
    it('should create a new version', async () => {
      const createData: CreateWorkflowVersion = {
        template_id: 'template-1',
        version_number: 2,
        name: 'Version 2',
        nodes_json: '{"nodes":[]}',
        edges_json: '{"edges":[]}',
      }
      mockDb.createWorkflowVersion.mockResolvedValue({
        ...mockVersion,
        id: 'version-2',
        version_number: 2,
        name: 'Version 2',
      })

      const result = await service.createVersion(createData)

      expect(mockDb.createWorkflowVersion).toHaveBeenCalledWith(createData)
      expect(result.version_number).toBe(2)
    })

    it('should create version with all optional fields', async () => {
      const createData: CreateWorkflowVersion = {
        template_id: 'template-1',
        version_number: 3,
        name: 'Version 3',
        description: 'Third version',
        nodes_json: '{}',
        edges_json: '{}',
        change_summary: 'Major update',
        created_by: 'user-2',
        is_active: false,
      }
      mockDb.createWorkflowVersion.mockResolvedValue({
        ...mockVersion,
        ...createData,
        id: 'version-3',
      })

      const result = await service.createVersion(createData)

      expect(result.description).toBe('Third version')
      expect(result.change_summary).toBe('Major update')
      expect(result.created_by).toBe('user-2')
    })
  })

  describe('activateVersion', () => {
    it('should activate version and return updated version', async () => {
      mockDb.getWorkflowVersionById.mockResolvedValue(mockVersion)
      mockDb.activateWorkflowVersion.mockResolvedValue(undefined)
      mockDb.getWorkflowVersionById.mockResolvedValue({
        ...mockVersion,
        is_active: true,
      })

      const result = await service.activateVersion('version-1')

      expect(mockDb.getWorkflowVersionById).toHaveBeenCalledWith('version-1')
      expect(mockDb.activateWorkflowVersion).toHaveBeenCalledWith('version-1', 'template-1')
      expect(result?.is_active).toBe(true)
    })

    it('should return null if version not found', async () => {
      mockDb.getWorkflowVersionById.mockResolvedValue(null)
      const result = await service.activateVersion('nonexistent')
      expect(result).toBeNull()
      expect(mockDb.activateWorkflowVersion).not.toHaveBeenCalled()
    })

    it('should call getWorkflowVersionById twice', async () => {
      mockDb.getWorkflowVersionById.mockResolvedValueOnce(mockVersion)
      mockDb.activateWorkflowVersion.mockResolvedValue(undefined)
      mockDb.getWorkflowVersionById.mockResolvedValueOnce({
        ...mockVersion,
        is_active: true,
      })

      await service.activateVersion('version-1')

      expect(mockDb.getWorkflowVersionById).toHaveBeenCalledTimes(2)
    })

    it('should return null if updated version not found after activation', async () => {
      mockDb.getWorkflowVersionById.mockResolvedValueOnce(mockVersion)
      mockDb.activateWorkflowVersion.mockResolvedValue(undefined)
      mockDb.getWorkflowVersionById.mockResolvedValueOnce(null)

      const result = await service.activateVersion('version-1')

      expect(result).toBeNull()
    })
  })

  describe('deleteVersion', () => {
    it('should delete version', async () => {
      mockDb.getWorkflowVersionById.mockResolvedValue(mockVersion)
      mockDb.deleteWorkflowVersion.mockResolvedValue(undefined)

      await service.deleteVersion('version-1')

      expect(mockDb.getWorkflowVersionById).toHaveBeenCalledWith('version-1')
      expect(mockDb.deleteWorkflowVersion).toHaveBeenCalledWith('version-1')
    })

    it('should throw if version not found', async () => {
      mockDb.getWorkflowVersionById.mockResolvedValue(null)
      await expect(service.deleteVersion('nonexistent')).rejects.toThrow(
        'WorkflowVersion not found: nonexistent'
      )
      expect(mockDb.deleteWorkflowVersion).not.toHaveBeenCalled()
    })

    it('should throw with correct id in error message', async () => {
      mockDb.getWorkflowVersionById.mockResolvedValue(null)
      await expect(service.deleteVersion('missing-456')).rejects.toThrow(
        'WorkflowVersion not found: missing-456'
      )
    })
  })
})