import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MaterialService } from '../material.service.js'
import type { DatabaseService } from '../../../database/service-async.js'
import type { MaterialQueryResult } from '../interfaces/material.interface.js'
import type {
  Material,
  CreateMaterial,
  CreateMaterialItem,
  CreatePromptRecord,
  MaterialItem,
  PromptRecord,
} from '../../../database/types.js'

describe('MaterialService', () => {
  let service: MaterialService
  let mockDb: {
    getMaterialById: ReturnType<typeof vi.fn>
    getMaterials: ReturnType<typeof vi.fn>
    createMaterial: ReturnType<typeof vi.fn>
    updateMaterial: ReturnType<typeof vi.fn>
    softDeleteMaterial: ReturnType<typeof vi.fn>
    getMaterialDetail: ReturnType<typeof vi.fn>
    createMaterialItem: ReturnType<typeof vi.fn>
    updateMaterialItem: ReturnType<typeof vi.fn>
    softDeleteMaterialItem: ReturnType<typeof vi.fn>
    createPrompt: ReturnType<typeof vi.fn>
    updatePrompt: ReturnType<typeof vi.fn>
    softDeletePrompt: ReturnType<typeof vi.fn>
    setDefaultPrompt: ReturnType<typeof vi.fn>
    reorderMaterialItems: ReturnType<typeof vi.fn>
    reorderPrompts: ReturnType<typeof vi.fn>
  }

  const mockMaterial: Material = {
    id: 'mat-1',
    name: 'Test Artist',
    material_type: 'artist',
    owner_id: 'owner-1',
    is_deleted: false,
    metadata: { description: 'Test' },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    description: null,
    deleted_at: null,
    sort_order: 0,
  }

  const mockMaterialItem: MaterialItem = {
    id: 'item-1',
    material_id: 'mat-1',
    item_type: 'song',
    name: 'Song A',
    lyrics: null,
    remark: null,
    metadata: null,
    owner_id: 'owner-1',
    sort_order: 0,
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
  }

  const mockPrompt: PromptRecord = {
    id: 'prompt-1',
    target_type: 'material-main',
    target_id: 'mat-1',
    slot_type: 'artist-style',
    name: 'Prompt A',
    content: 'test prompt',
    sort_order: 0,
    is_default: true,
    owner_id: 'owner-1',
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
  }

  beforeEach(() => {
    mockDb = {
      getMaterialById: vi.fn(),
      getMaterials: vi.fn(),
      createMaterial: vi.fn(),
      updateMaterial: vi.fn(),
      softDeleteMaterial: vi.fn(),
      getMaterialDetail: vi.fn(),
      createMaterialItem: vi.fn(),
      updateMaterialItem: vi.fn(),
      softDeleteMaterialItem: vi.fn(),
      createPrompt: vi.fn(),
      updatePrompt: vi.fn(),
      softDeletePrompt: vi.fn(),
      setDefaultPrompt: vi.fn(),
      reorderMaterialItems: vi.fn(),
      reorderPrompts: vi.fn(),
    }
    service = new MaterialService(mockDb as unknown as DatabaseService)
  })

  describe('getById', () => {
    it('returns material by id', async () => {
      mockDb.getMaterialById.mockResolvedValue(mockMaterial)
      const result = await service.getById('mat-1', 'owner-1')
      expect(mockDb.getMaterialById).toHaveBeenCalledWith('mat-1', 'owner-1')
      expect(result).toEqual(mockMaterial)
    })

    it('returns null for non-existent id', async () => {
      mockDb.getMaterialById.mockResolvedValue(null)
      const result = await service.getById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    it('returns paginated materials', async () => {
      const mockResult: MaterialQueryResult = { records: [mockMaterial], total: 1 }
      mockDb.getMaterials.mockResolvedValue(mockResult)
      const result = await service.list({ ownerId: 'owner-1', limit: 10, offset: 0 })
      expect(result.total).toBe(1)
      expect(result.records[0].name).toBe('Test Artist')
    })

    it('applies default pagination', async () => {
      mockDb.getMaterials.mockResolvedValue({ records: [], total: 0 })
      await service.list({ ownerId: 'owner-1' })
      expect(mockDb.getMaterials).toHaveBeenCalledWith({
        ownerId: 'owner-1',
        materialType: undefined,
        limit: 20,
        offset: 0,
      })
    })
  })

  describe('create', () => {
    it('creates a material record', async () => {
      mockDb.createMaterial.mockResolvedValue(mockMaterial)
      const createData: CreateMaterial = { name: 'Test Artist', material_type: 'artist' }
      const result = await service.create(createData, 'owner-1')
      expect(mockDb.createMaterial).toHaveBeenCalledWith(createData, 'owner-1')
      expect(result).toEqual(mockMaterial)
    })
  })

  describe('update', () => {
    it('updates material fields', async () => {
      const updated = { ...mockMaterial, name: 'Updated Name' }
      mockDb.updateMaterial.mockResolvedValue(updated)
      const result = await service.update('mat-1', { name: 'Updated Name' }, 'owner-1')
      expect(result!.name).toBe('Updated Name')
    })

    it('returns null when updating non-existent', async () => {
      mockDb.updateMaterial.mockResolvedValue(null)
      const result = await service.update('non-existent', { name: 'Updated' })
      expect(result).toBeNull()
    })
  })

  describe('softDelete', () => {
    it('soft deletes a material', async () => {
      mockDb.softDeleteMaterial.mockResolvedValue(true)
      const result = await service.softDelete('mat-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('returns false when record not found', async () => {
      mockDb.softDeleteMaterial.mockResolvedValue(false)
      const result = await service.softDelete('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('getMaterialDetail', () => {
    it('returns aggregated detail', async () => {
      const mockDetail = {
        material: mockMaterial,
        materialPrompts: [],
        items: [],
      }
      mockDb.getMaterialDetail.mockResolvedValue(mockDetail)
      const result = await service.getMaterialDetail('mat-1', 'owner-1')
      expect(result).toEqual(mockDetail)
      expect(result.items).toEqual([])
    })
  })

  describe('material item methods', () => {
    it('creates a material item', async () => {
      const createData: CreateMaterialItem = {
        material_id: 'mat-1',
        item_type: 'song',
        name: 'Song A',
      }
      mockDb.createMaterialItem.mockResolvedValue(mockMaterialItem)
      mockDb.getMaterialById.mockResolvedValue(mockMaterial)

      const result = await service.createMaterialItem(createData, 'owner-1')

      expect(mockDb.createMaterialItem).toHaveBeenCalledWith(createData, 'owner-1')
      expect(result).toEqual(mockMaterialItem)
    })

    it('updates a material item', async () => {
      mockDb.updateMaterialItem.mockResolvedValue({ ...mockMaterialItem, name: 'Song B' })

      const result = await service.updateMaterialItem('item-1', { name: 'Song B' }, 'owner-1')

      expect(mockDb.updateMaterialItem).toHaveBeenCalledWith('item-1', { name: 'Song B' }, 'owner-1')
      expect(result?.name).toBe('Song B')
    })

    it('soft deletes a material item', async () => {
      mockDb.softDeleteMaterialItem.mockResolvedValue(true)

      const result = await service.softDeleteMaterialItem('item-1', 'owner-1')

      expect(mockDb.softDeleteMaterialItem).toHaveBeenCalledWith('item-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('reorders material items', async () => {
      mockDb.reorderMaterialItems.mockResolvedValue(undefined)

      await service.reorderMaterialItems('mat-1', [
        { id: 'item-2', sort_order: 0 },
        { id: 'item-1', sort_order: 1 },
      ], 'owner-1')

      expect(mockDb.reorderMaterialItems).toHaveBeenCalledWith('mat-1', [
        { id: 'item-2', sort_order: 0 },
        { id: 'item-1', sort_order: 1 },
      ], 'owner-1')
    })
  })

  describe('prompt methods', () => {
    it('creates a prompt', async () => {
      const createData: CreatePromptRecord = {
        target_type: 'material-main',
        target_id: 'mat-1',
        slot_type: 'artist-style',
        name: 'Prompt A',
        content: 'test prompt',
        is_default: true,
      }
      mockDb.createPrompt.mockResolvedValue(mockPrompt)

      const result = await service.createPrompt(createData, 'owner-1')

      expect(mockDb.createPrompt).toHaveBeenCalledWith(createData, 'owner-1')
      expect(result).toEqual(mockPrompt)
    })

    it('updates a prompt', async () => {
      mockDb.updatePrompt.mockResolvedValue({ ...mockPrompt, name: 'Prompt B' })

      const result = await service.updatePrompt('prompt-1', { name: 'Prompt B' }, 'owner-1')

      expect(mockDb.updatePrompt).toHaveBeenCalledWith('prompt-1', { name: 'Prompt B' }, 'owner-1')
      expect(result?.name).toBe('Prompt B')
    })

    it('soft deletes a prompt', async () => {
      mockDb.softDeletePrompt.mockResolvedValue(true)

      const result = await service.softDeletePrompt('prompt-1', 'owner-1')

      expect(mockDb.softDeletePrompt).toHaveBeenCalledWith('prompt-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('sets a prompt as default', async () => {
      mockDb.setDefaultPrompt.mockResolvedValue(mockPrompt)

      const result = await service.setDefaultPrompt('prompt-1', 'owner-1')

      expect(mockDb.setDefaultPrompt).toHaveBeenCalledWith('prompt-1', 'owner-1')
      expect(result).toEqual(mockPrompt)
    })

    it('reorders prompts', async () => {
      mockDb.reorderPrompts.mockResolvedValue(undefined)

      await service.reorderPrompts({
        target_type: 'material-main',
        target_id: 'mat-1',
        slot_type: 'artist-style',
        items: [
          { id: 'prompt-2', sort_order: 0 },
          { id: 'prompt-1', sort_order: 1 },
        ],
      }, 'owner-1')

      expect(mockDb.reorderPrompts).toHaveBeenCalledWith({
        target_type: 'material-main',
        target_id: 'mat-1',
        slot_type: 'artist-style',
        items: [
          { id: 'prompt-2', sort_order: 0 },
          { id: 'prompt-1', sort_order: 1 },
        ],
      }, 'owner-1')
    })
  })
})
