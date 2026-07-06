import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MediaService } from './media.service.js'
import type { MediaRepository } from '../../repositories/media-repository.js'
import type { MediaRecord, CreateMediaRecord } from '../../database/types.js'

describe('MediaService', () => {
  let service: MediaService
  let mockRepo: {
    getById: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    softDelete: ReturnType<typeof vi.fn>
    hardDelete: ReturnType<typeof vi.fn>
    getByIds: ReturnType<typeof vi.fn>
    toggleFavorite: ReturnType<typeof vi.fn>
    togglePublic: ReturnType<typeof vi.fn>
  }

  const mockMediaRecord: MediaRecord = {
    id: 'media-1',
    filename: 'test.mp3',
    original_name: 'original.mp3',
    filepath: '/data/media/test.mp3',
    type: 'audio' as const,
    mime_type: 'audio/mpeg',
    size_bytes: 1024,
    source: 'voice_sync',
    owner_id: 'owner-1',
    is_public: false,
    is_deleted: false,
    metadata: null,
    task_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    mockRepo = {
      getById: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      hardDelete: vi.fn(),
      getByIds: vi.fn(),
      toggleFavorite: vi.fn(),
      togglePublic: vi.fn(),
    }
    service = new MediaService(mockRepo as unknown as MediaRepository)
  })

  describe('getById', () => {
    it('should return media record by id', async () => {
      mockRepo.getById.mockResolvedValue(mockMediaRecord)
      const result = await service.getById('media-1', 'owner-1')
      expect(mockRepo.getById).toHaveBeenCalledWith('media-1', 'owner-1', undefined)
      expect(result).toEqual(mockMediaRecord)
    })

    it('should return null if not found', async () => {
      mockRepo.getById.mockResolvedValue(null)
      const result = await service.getById('nonexistent')
      expect(result).toBeNull()
    })

    it('should pass includePublic flag', async () => {
      mockRepo.getById.mockResolvedValue(mockMediaRecord)
      await service.getById('media-1', 'owner-1', true)
      expect(mockRepo.getById).toHaveBeenCalledWith('media-1', 'owner-1', true)
    })
  })

  describe('getAll', () => {
    it('should return paginated media records', async () => {
      const mockResult = { items: [mockMediaRecord], total: 1 }
      mockRepo.list.mockResolvedValue(mockResult)
      const result = await service.getAll({ limit: 20, offset: 0 })
      expect(result).toEqual({ records: [mockMediaRecord], total: 1 })
    })

    it('should apply default pagination values', async () => {
      const mockResult = { items: [], total: 0 }
      mockRepo.list.mockResolvedValue(mockResult)
      await service.getAll({})
      expect(mockRepo.list).toHaveBeenCalledWith({
        type: undefined,
        source: undefined,
        search: undefined,
        limit: 20,
        offset: 0,
        includeDeleted: undefined,
        visibilityOwnerId: undefined,
        favoriteFilter: undefined,
        publicFilter: undefined,
        favoriteUserId: undefined,
        role: undefined,
      })
    })

    it('should pass all filter options', async () => {
      const mockResult = { items: [], total: 0 }
      mockRepo.list.mockResolvedValue(mockResult)
      const filter = {
        type: 'audio',
        source: 'voice_sync',
        search: 'test',
        limit: 10,
        offset: 5,
        includeDeleted: true,
        visibilityOwnerId: 'owner-1',
        favoriteFilter: ['favorite'] as ('favorite' | 'non-favorite')[],
        publicFilter: ['public'] as ('private' | 'public' | 'others-public')[],
        favoriteUserId: 'user-1',
        role: 'admin' as const,
      }
      await service.getAll(filter)
      expect(mockRepo.list).toHaveBeenCalledWith(filter)
    })

    it('should handle pagination with different limit/offset', async () => {
      const page1Result = { items: [mockMediaRecord], total: 50 }
      const page2Result = { items: [{ ...mockMediaRecord, id: 'media-2' }], total: 50 }
      mockRepo.list
        .mockResolvedValueOnce(page1Result)
        .mockResolvedValueOnce(page2Result)

      const result1 = await service.getAll({ limit: 10, offset: 0 })
      const result2 = await service.getAll({ limit: 10, offset: 10 })

      expect(result1.records).toHaveLength(1)
      expect(result2.records).toHaveLength(1)
      expect(result1.records[0].id).toBe('media-1')
      expect(result2.records[0].id).toBe('media-2')
    })
  })

  describe('create', () => {
    it('should create a new media record', async () => {
      mockRepo.create.mockResolvedValue(mockMediaRecord)
      const createData: CreateMediaRecord = {
        filename: 'test.mp3',
        filepath: '/data/media/test.mp3',
        type: 'audio',
        size_bytes: 1024,
      }
      const result = await service.create(createData, 'owner-1')
      expect(mockRepo.create).toHaveBeenCalledWith(createData, 'owner-1')
      expect(result).toEqual(mockMediaRecord)
    })

    it('should create media record without ownerId', async () => {
      mockRepo.create.mockResolvedValue({ ...mockMediaRecord, owner_id: null })
      const createData: CreateMediaRecord = {
        filename: 'test.mp3',
        filepath: '/data/media/test.mp3',
        type: 'audio',
        size_bytes: 1024,
      }
      const result = await service.create(createData)
      expect(mockRepo.create).toHaveBeenCalledWith(createData, undefined)
      expect(result.owner_id).toBeNull()
    })

    it('should propagate database errors when creating with invalid data', async () => {
      mockRepo.create.mockRejectedValue(new Error('Database constraint violation'))
      const createData: CreateMediaRecord = {
        filename: '',
        filepath: '/data/media/test.mp3',
        type: 'audio',
        size_bytes: 1024,
      }
      await expect(service.create(createData)).rejects.toThrow('Database constraint violation')
    })

    it('should propagate database errors for invalid type', async () => {
      mockRepo.create.mockRejectedValue(new Error('Invalid media type'))
      const createData = {
        filename: 'test.mp3',
        filepath: '/data/media/test.mp3',
        type: 'invalid_type' as any,
        size_bytes: 1024,
      }
      await expect(service.create(createData)).rejects.toThrow('Invalid media type')
    })
  })

  describe('update', () => {
    it('should update original_name', async () => {
      const updatedRecord = { ...mockMediaRecord, original_name: 'updated.mp3' }
      mockRepo.update.mockResolvedValue(updatedRecord)
      const result = await service.update('media-1', { original_name: 'updated.mp3' })
      expect(mockRepo.update).toHaveBeenCalledWith(
        'media-1',
        { original_name: 'updated.mp3' },
        undefined
      )
      expect(result?.original_name).toBe('updated.mp3')
    })

    it('should update metadata', async () => {
      const newMetadata = { key: 'value' }
      const updatedRecord = { ...mockMediaRecord, metadata: newMetadata }
      mockRepo.update.mockResolvedValue(updatedRecord)
      const result = await service.update('media-1', { metadata: newMetadata })
      expect(mockRepo.update).toHaveBeenCalledWith(
        'media-1',
        { metadata: newMetadata },
        undefined
      )
      expect(result?.metadata).toEqual(newMetadata)
    })

    it('should update with ownerId', async () => {
      const updatedRecord = { ...mockMediaRecord, original_name: 'updated.mp3' }
      mockRepo.update.mockResolvedValue(updatedRecord)
      await service.update('media-1', { original_name: 'updated.mp3' }, 'owner-1')
      expect(mockRepo.update).toHaveBeenCalledWith(
        'media-1',
        { original_name: 'updated.mp3' },
        'owner-1'
      )
    })

    it('should return null when updating non-existent record', async () => {
      mockRepo.update.mockResolvedValue(null)
      const result = await service.update('nonexistent', { original_name: 'updated.mp3' })
      expect(result).toBeNull()
    })

    it('should propagate database errors when updating non-existent', async () => {
      mockRepo.update.mockRejectedValue(new Error('Record not found'))
      await expect(service.update('nonexistent', { original_name: 'test' })).rejects.toThrow('Record not found')
    })

    it('should not send undefined fields to database', async () => {
      mockRepo.update.mockResolvedValue(mockMediaRecord)
      await service.update('media-1', {})
      expect(mockRepo.update).toHaveBeenCalledWith('media-1', {}, undefined)
    })
  })

  describe('softDelete', () => {
    it('should soft delete a media record', async () => {
      mockRepo.softDelete.mockResolvedValue(true)
      const result = await service.softDelete('media-1', 'owner-1')
      expect(mockRepo.softDelete).toHaveBeenCalledWith('media-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('should return false when record not found', async () => {
      mockRepo.softDelete.mockResolvedValue(false)
      const result = await service.softDelete('nonexistent')
      expect(result).toBe(false)
    })

    it('should propagate database errors during soft delete', async () => {
      mockRepo.softDelete.mockRejectedValue(new Error('Database error'))
      await expect(service.softDelete('media-1')).rejects.toThrow('Database error')
    })
  })

  describe('hardDelete', () => {
    it('should hard delete a media record', async () => {
      mockRepo.hardDelete.mockResolvedValue(true)
      const result = await service.hardDelete('media-1', 'owner-1')
      expect(mockRepo.hardDelete).toHaveBeenCalledWith('media-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('should return false when record not found', async () => {
      mockRepo.hardDelete.mockResolvedValue(false)
      const result = await service.hardDelete('nonexistent')
      expect(result).toBe(false)
    })

    it('should propagate database errors during hard delete', async () => {
      mockRepo.hardDelete.mockRejectedValue(new Error('Database error'))
      await expect(service.hardDelete('media-1')).rejects.toThrow('Database error')
    })
  })

  describe('getByIds', () => {
    it('should return media records by ids', async () => {
      const records = [mockMediaRecord, { ...mockMediaRecord, id: 'media-2' }]
      mockRepo.getByIds.mockResolvedValue(records)
      const result = await service.getByIds(['media-1', 'media-2'])
      expect(mockRepo.getByIds).toHaveBeenCalledWith(['media-1', 'media-2'], undefined)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no ids match', async () => {
      mockRepo.getByIds.mockResolvedValue([])
      const result = await service.getByIds(['nonexistent'])
      expect(result).toEqual([])
    })

    it('should pass ownerId', async () => {
      mockRepo.getByIds.mockResolvedValue([])
      await service.getByIds(['media-1'], 'owner-1')
      expect(mockRepo.getByIds).toHaveBeenCalledWith(['media-1'], 'owner-1')
    })
  })

  describe('toggleFavorite', () => {
    it('should toggle favorite and return added action', async () => {
      const mockResult = { isFavorite: true, action: 'added' as const }
      mockRepo.toggleFavorite.mockResolvedValue(mockResult)
      const result = await service.toggleFavorite('user-1', 'media-1')
      expect(mockRepo.toggleFavorite).toHaveBeenCalledWith('user-1', 'media-1')
      expect(result).toEqual(mockResult)
    })

    it('should toggle favorite and return removed action', async () => {
      const mockResult = { isFavorite: false, action: 'removed' as const }
      mockRepo.toggleFavorite.mockResolvedValue(mockResult)
      const result = await service.toggleFavorite('user-1', 'media-1')
      expect(result.action).toBe('removed')
    })
  })

  describe('togglePublic', () => {
    it('should toggle public visibility to true', async () => {
      const updatedRecord = { ...mockMediaRecord, is_public: true }
      mockRepo.togglePublic.mockResolvedValue(updatedRecord)
      const result = await service.togglePublic('media-1', true)
      expect(mockRepo.togglePublic).toHaveBeenCalledWith('media-1', true, undefined)
      expect(result?.is_public).toBe(true)
    })

    it('should toggle public visibility to false', async () => {
      const updatedRecord = { ...mockMediaRecord, is_public: false }
      mockRepo.togglePublic.mockResolvedValue(updatedRecord)
      const result = await service.togglePublic('media-1', false)
      expect(result?.is_public).toBe(false)
    })

    it('should return null when toggling non-existent record', async () => {
      mockRepo.togglePublic.mockResolvedValue(null)
      const result = await service.togglePublic('nonexistent', true)
      expect(result).toBeNull()
    })
  })
})
