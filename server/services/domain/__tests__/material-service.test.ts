import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MaterialService } from '../material.service.js'
import type { MaterialRepository } from '../../../repositories/material-repository.js'
import type { MaterialItemRepository } from '../../../repositories/material-item-repository.js'
import type { PromptRepository } from '../../../repositories/prompt-repository.js'
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
  let mockMatRepo: {
    getById: ReturnType<typeof vi.fn>
    listWithItemCount: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    softDelete: ReturnType<typeof vi.fn>
  }
  let mockItemRepo: {
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    softDelete: ReturnType<typeof vi.fn>
    reorder: ReturnType<typeof vi.fn>
    listByMaterial: ReturnType<typeof vi.fn>
  }
  let mockPromptRepo: {
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    softDelete: ReturnType<typeof vi.fn>
    setDefault: ReturnType<typeof vi.fn>
    reorder: ReturnType<typeof vi.fn>
    listByTarget: ReturnType<typeof vi.fn>
    listByTargetIds: ReturnType<typeof vi.fn>
  }

  const mockMaterial: Material = {
    id: 'mat-1', name: 'Test Artist', material_type: 'artist',
    owner_id: 'owner-1', is_deleted: false, metadata: { description: 'Test' },
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    description: null, deleted_at: null, sort_order: 0,
  }

  const mockMaterialItem: MaterialItem = {
    id: 'item-1', material_id: 'mat-1', item_type: 'song', name: 'Song A',
    lyrics: null, remark: null, metadata: null, owner_id: 'owner-1',
    sort_order: 0, is_deleted: false, created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z', deleted_at: null,
  }

  const mockPrompt: PromptRecord = {
    id: 'prompt-1', target_type: 'material-main', target_id: 'mat-1',
    slot_type: 'artist-style', name: 'Prompt A', content: 'test prompt',
    sort_order: 0, is_default: true, owner_id: 'owner-1', is_deleted: false,
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
  }

  beforeEach(() => {
    mockMatRepo = {
      getById: vi.fn(), listWithItemCount: vi.fn(),
      create: vi.fn(), update: vi.fn(), softDelete: vi.fn(),
    }
    mockItemRepo = {
      create: vi.fn(), update: vi.fn(), softDelete: vi.fn(),
      reorder: vi.fn(), listByMaterial: vi.fn(),
    }
    mockPromptRepo = {
      create: vi.fn(), update: vi.fn(), softDelete: vi.fn(),
      setDefault: vi.fn(), reorder: vi.fn(),
      listByTarget: vi.fn(), listByTargetIds: vi.fn(),
    }
    service = new MaterialService(
      mockMatRepo as unknown as MaterialRepository,
      mockItemRepo as unknown as MaterialItemRepository,
      mockPromptRepo as unknown as PromptRepository,
    )
  })

  describe('getById', () => {
    it('returns material by id', async () => {
      mockMatRepo.getById.mockResolvedValue(mockMaterial)
      const result = await service.getById('mat-1', 'owner-1')
      expect(mockMatRepo.getById).toHaveBeenCalledWith('mat-1', 'owner-1')
      expect(result).toEqual(mockMaterial)
    })

    it('returns null for non-existent id', async () => {
      mockMatRepo.getById.mockResolvedValue(null)
      const result = await service.getById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    it('returns paginated materials', async () => {
      mockMatRepo.listWithItemCount.mockResolvedValue({ items: [mockMaterial], total: 1 })
      const result = await service.list({ ownerId: 'owner-1', limit: 10, offset: 0 })
      expect(result.total).toBe(1)
      expect(result.records[0].name).toBe('Test Artist')
    })

    it('applies default pagination', async () => {
      mockMatRepo.listWithItemCount.mockResolvedValue({ items: [], total: 0 })
      await service.list({ ownerId: 'owner-1' })
      expect(mockMatRepo.listWithItemCount).toHaveBeenCalledWith({
        ownerId: 'owner-1', materialType: undefined, limit: 20, offset: 0,
      })
    })
  })

  describe('create', () => {
    it('creates a material record', async () => {
      mockMatRepo.create.mockResolvedValue(mockMaterial)
      const createData: CreateMaterial = { name: 'Test Artist', material_type: 'artist' }
      const result = await service.create(createData, 'owner-1')
      expect(mockMatRepo.create).toHaveBeenCalledWith({ ...createData, ownerId: 'owner-1' })
      expect(result).toEqual(mockMaterial)
    })
  })

  describe('update', () => {
    it('updates material fields', async () => {
      const updated = { ...mockMaterial, name: 'Updated Name' }
      mockMatRepo.update.mockResolvedValue(updated)
      const result = await service.update('mat-1', { name: 'Updated Name' }, 'owner-1')
      expect(result!.name).toBe('Updated Name')
    })

    it('throws when ownerId is missing', async () => {
      await expect(service.update('mat-1', { name: 'Updated' }))
        .rejects.toThrow('ownerId is required for updateMaterial')
    })
  })

  describe('softDelete', () => {
    it('soft deletes a material', async () => {
      mockMatRepo.softDelete.mockResolvedValue(true)
      const result = await service.softDelete('mat-1', 'owner-1')
      expect(mockMatRepo.softDelete).toHaveBeenCalledWith('mat-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('throws when ownerId is missing', async () => {
      await expect(service.softDelete('mat-1'))
        .rejects.toThrow('ownerId is required for softDeleteMaterial')
    })
  })

  describe('getMaterialDetail', () => {
    it('returns aggregated detail', async () => {
      mockMatRepo.getById.mockResolvedValue(mockMaterial)
      mockItemRepo.listByMaterial.mockResolvedValue([])
      mockPromptRepo.listByTarget.mockResolvedValue([])
      mockPromptRepo.listByTargetIds.mockResolvedValue([])

      const result = await service.getMaterialDetail('mat-1', 'owner-1')
      expect(result!.material).toEqual(mockMaterial)
      expect(result!.items).toEqual([])
    })

    it('returns null when material not found', async () => {
      mockMatRepo.getById.mockResolvedValue(null)
      const result = await service.getMaterialDetail('non-existent', 'owner-1')
      expect(result).toBeNull()
    })
  })

  describe('material item methods', () => {
    it('creates a material item', async () => {
      mockMatRepo.getById.mockResolvedValue(mockMaterial)
      mockItemRepo.create.mockResolvedValue(mockMaterialItem)
      const createData: CreateMaterialItem = { material_id: 'mat-1', item_type: 'song', name: 'Song A' }
      const result = await service.createMaterialItem(createData, 'owner-1')
      expect(mockItemRepo.create).toHaveBeenCalledWith({ ...createData, ownerId: 'owner-1' })
      expect(result).toEqual(mockMaterialItem)
    })

    it('updates a material item', async () => {
      mockItemRepo.update.mockResolvedValue({ ...mockMaterialItem, name: 'Song B' })
      const result = await service.updateMaterialItem('item-1', { name: 'Song B' }, 'owner-1')
      expect(mockItemRepo.update).toHaveBeenCalledWith('item-1', { name: 'Song B' }, 'owner-1')
      expect(result?.name).toBe('Song B')
    })

    it('soft deletes a material item', async () => {
      mockItemRepo.softDelete.mockResolvedValue(true)
      const result = await service.softDeleteMaterialItem('item-1', 'owner-1')
      expect(mockItemRepo.softDelete).toHaveBeenCalledWith('item-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('reorders material items', async () => {
      mockItemRepo.reorder.mockResolvedValue(undefined)
      await service.reorderMaterialItems('mat-1', [
        { id: 'item-2', sort_order: 0 }, { id: 'item-1', sort_order: 1 },
      ], 'owner-1')
      expect(mockItemRepo.reorder).toHaveBeenCalledWith('mat-1', [
        { id: 'item-2', sort_order: 0 }, { id: 'item-1', sort_order: 1 },
      ], 'owner-1')
    })
  })

  describe('prompt methods', () => {
    it('creates a prompt', async () => {
      mockPromptRepo.create.mockResolvedValue(mockPrompt)
      const createData: CreatePromptRecord = {
        target_type: 'material-main', target_id: 'mat-1', slot_type: 'artist-style',
        name: 'Prompt A', content: 'test prompt', is_default: true,
      }
      const result = await service.createPrompt(createData, 'owner-1')
      expect(mockPromptRepo.create).toHaveBeenCalledWith({
        targetType: 'material-main', targetId: 'mat-1', slotType: 'artist-style',
        name: 'Prompt A', content: 'test prompt', ownerId: 'owner-1',
        sortOrder: undefined, isDefault: true,
      })
      expect(result).toEqual(mockPrompt)
    })

    it('updates a prompt', async () => {
      mockPromptRepo.update.mockResolvedValue({ ...mockPrompt, name: 'Prompt B' })
      const result = await service.updatePrompt('prompt-1', { name: 'Prompt B' }, 'owner-1')
      expect(mockPromptRepo.update).toHaveBeenCalledWith('prompt-1', { name: 'Prompt B' }, 'owner-1')
      expect(result?.name).toBe('Prompt B')
    })

    it('soft deletes a prompt', async () => {
      mockPromptRepo.softDelete.mockResolvedValue(true)
      const result = await service.softDeletePrompt('prompt-1', 'owner-1')
      expect(mockPromptRepo.softDelete).toHaveBeenCalledWith('prompt-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('sets a prompt as default', async () => {
      mockPromptRepo.setDefault.mockResolvedValue(mockPrompt)
      const result = await service.setDefaultPrompt('prompt-1', 'owner-1')
      expect(mockPromptRepo.setDefault).toHaveBeenCalledWith('prompt-1', 'owner-1')
      expect(result).toEqual(mockPrompt)
    })

    it('reorders prompts', async () => {
      mockPromptRepo.reorder.mockResolvedValue(undefined)
      await service.reorderPrompts({
        target_type: 'material-main', target_id: 'mat-1', slot_type: 'artist-style',
        items: [{ id: 'prompt-2', sort_order: 0 }, { id: 'prompt-1', sort_order: 1 }],
      }, 'owner-1')
      expect(mockPromptRepo.reorder).toHaveBeenCalledWith({
        targetType: 'material-main', targetId: 'mat-1', slotType: 'artist-style', ownerId: 'owner-1',
      }, [{ id: 'prompt-2', sort_order: 0 }, { id: 'prompt-1', sort_order: 1 }])
    })
  })
})
