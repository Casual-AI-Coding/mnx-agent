import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MediaService } from './media.service.js'
import type { DatabaseService } from '../../database/service-async.js'
import type { MediaRecord, CreateMediaRecord } from '../../database/types.js'

describe('MediaService', () => {
  let service: MediaService
  let mockDb: {
    getMediaRecordById: ReturnType<typeof vi.fn>
    getMediaRecords: ReturnType<typeof vi.fn>
    createMediaRecord: ReturnType<typeof vi.fn>
    updateMediaRecord: ReturnType<typeof vi.fn>
    softDeleteMediaRecord: ReturnType<typeof vi.fn>
    hardDeleteMediaRecord: ReturnType<typeof vi.fn>
    getMediaRecordsByIds: ReturnType<typeof vi.fn>
    toggleFavorite: ReturnType<typeof vi.fn>
    togglePublicMediaRecord: ReturnType<typeof vi.fn>
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
    mockDb = {
      getMediaRecordById: vi.fn(),
      getMediaRecords: vi.fn(),
      createMediaRecord: vi.fn(),
      updateMediaRecord: vi.fn(),
      softDeleteMediaRecord: vi.fn(),
      hardDeleteMediaRecord: vi.fn(),
      getMediaRecordsByIds: vi.fn(),
      toggleFavorite: vi.fn(),
      togglePublicMediaRecord: vi.fn(),
    }
    service = new MediaService(mockDb as unknown as DatabaseService)
  })

  describe('getById', () => {
    it('should return media record by id', async () => {
      mockDb.getMediaRecordById.mockResolvedValue(mockMediaRecord)
      const result = await service.getById('media-1', 'owner-1')
      expect(mockDb.getMediaRecordById).toHaveBeenCalledWith('media-1', 'owner-1', undefined)
      expect(result).toEqual(mockMediaRecord)
    })

    it('should return null if not found', async () => {
      mockDb.getMediaRecordById.mockResolvedValue(null)
      const result = await service.getById('nonexistent')
      expect(result).toBeNull()
    })

    it('should pass includePublic flag to db', async () => {
      mockDb.getMediaRecordById.mockResolvedValue(mockMediaRecord)
      await service.getById('media-1', 'owner-1', true)
      expect(mockDb.getMediaRecordById).toHaveBeenCalledWith('media-1', 'owner-1', true)
    })
  })

  describe('getAll', () => {
    it('should return paginated media records', async () => {
      const mockResult = { records: [mockMediaRecord], total: 1 }
      mockDb.getMediaRecords.mockResolvedValue(mockResult)
      const result = await service.getAll({ limit: 20, offset: 0 })
      expect(result).toEqual(mockResult)
    })

    it('should apply default pagination values', async () => {
      const mockResult = { records: [], total: 0 }
      mockDb.getMediaRecords.mockResolvedValue(mockResult)
      await service.getAll({})
      expect(mockDb.getMediaRecords).toHaveBeenCalledWith({
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

    it('should pass all filter options to db', async () => {
      const mockResult = { records: [], total: 0 }
      mockDb.getMediaRecords.mockResolvedValue(mockResult)
      const filter = {
        type: 'audio',
        source: 'voice_sync',
        search: 'test',
        limit: 10,
        offset: 5,
        includeDeleted: true,
        visibilityOwnerId: 'owner-1',
        favoriteFilter: ['favorite'] as const,
        publicFilter: ['public'] as const,
        favoriteUserId: 'user-1',
        role: 'admin' as const,
      }
      await service.getAll(filter)
      expect(mockDb.getMediaRecords).toHaveBeenCalledWith(filter)
    })

    it('should handle pagination with different limit/offset', async () => {
      const page1Result = { records: [mockMediaRecord], total: 50 }
      const page2Result = { records: [{ ...mockMediaRecord, id: 'media-2' }], total: 50 }
      mockDb.getMediaRecords
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
      mockDb.createMediaRecord.mockResolvedValue(mockMediaRecord)
      const createData: CreateMediaRecord = {
        filename: 'test.mp3',
        filepath: '/data/media/test.mp3',
        type: 'audio',
        size_bytes: 1024,
      }
      const result = await service.create(createData, 'owner-1')
      expect(mockDb.createMediaRecord).toHaveBeenCalledWith(createData, 'owner-1')
      expect(result).toEqual(mockMediaRecord)
    })

    it('should create media record without ownerId', async () => {
      mockDb.createMediaRecord.mockResolvedValue({ ...mockMediaRecord, owner_id: null })
      const createData: CreateMediaRecord = {
        filename: 'test.mp3',
        filepath: '/data/media/test.mp3',
        type: 'audio',
        size_bytes: 1024,
      }
      const result = await service.create(createData)
      expect(mockDb.createMediaRecord).toHaveBeenCalledWith(createData, undefined)
      expect(result.owner_id).toBeNull()
    })

    it('should propagate database errors when creating with invalid data', async () => {
      mockDb.createMediaRecord.mockRejectedValue(new Error('Database constraint violation'))
      const createData: CreateMediaRecord = {
        filename: '',
        filepath: '/data/media/test.mp3',
        type: 'audio',
        size_bytes: 1024,
      }
      await expect(service.create(createData)).rejects.toThrow('Database constraint violation')
    })

    it('should propagate database errors for invalid type', async () => {
      mockDb.createMediaRecord.mockRejectedValue(new Error('Invalid media type'))
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
      mockDb.updateMediaRecord.mockResolvedValue(updatedRecord)
      const result = await service.update('media-1', { original_name: 'updated.mp3' })
      expect(mockDb.updateMediaRecord).toHaveBeenCalledWith(
        'media-1',
        { original_name: 'updated.mp3' },
        undefined
      )
      expect(result?.original_name).toBe('updated.mp3')
    })

    it('should update metadata', async () => {
      const newMetadata = { key: 'value' }
      const updatedRecord = { ...mockMediaRecord, metadata: newMetadata }
      mockDb.updateMediaRecord.mockResolvedValue(updatedRecord)
      const result = await service.update('media-1', { metadata: newMetadata })
      expect(mockDb.updateMediaRecord).toHaveBeenCalledWith(
        'media-1',
        { metadata: newMetadata },
        undefined
      )
      expect(result?.metadata).toEqual(newMetadata)
    })

    it('should update with ownerId', async () => {
      const updatedRecord = { ...mockMediaRecord, original_name: 'updated.mp3' }
      mockDb.updateMediaRecord.mockResolvedValue(updatedRecord)
      await service.update('media-1', { original_name: 'updated.mp3' }, 'owner-1')
      expect(mockDb.updateMediaRecord).toHaveBeenCalledWith(
        'media-1',
        { original_name: 'updated.mp3' },
        'owner-1'
      )
    })

    it('should return null when updating non-existent record', async () => {
      mockDb.updateMediaRecord.mockResolvedValue(null)
      const result = await service.update('nonexistent', { original_name: 'updated.mp3' })
      expect(result).toBeNull()
    })

    it('should propagate database errors when updating non-existent', async () => {
      mockDb.updateMediaRecord.mockRejectedValue(new Error('Record not found'))
      await expect(service.update('nonexistent', { original_name: 'test' })).rejects.toThrow('Record not found')
    })

    it('should not send undefined fields to database', async () => {
      mockDb.updateMediaRecord.mockResolvedValue(mockMediaRecord)
      await service.update('media-1', {})
      expect(mockDb.updateMediaRecord).toHaveBeenCalledWith('media-1', {}, undefined)
    })
  })

  describe('softDelete', () => {
    it('should soft delete a media record', async () => {
      mockDb.softDeleteMediaRecord.mockResolvedValue(true)
      const result = await service.softDelete('media-1', 'owner-1')
      expect(mockDb.softDeleteMediaRecord).toHaveBeenCalledWith('media-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('should return false when record not found', async () => {
      mockDb.softDeleteMediaRecord.mockResolvedValue(false)
      const result = await service.softDelete('nonexistent')
      expect(result).toBe(false)
    })

    it('should propagate database errors during soft delete', async () => {
      mockDb.softDeleteMediaRecord.mockRejectedValue(new Error('Database error'))
      await expect(service.softDelete('media-1')).rejects.toThrow('Database error')
    })
  })

  describe('hardDelete', () => {
    it('should hard delete a media record', async () => {
      mockDb.hardDeleteMediaRecord.mockResolvedValue(true)
      const result = await service.hardDelete('media-1', 'owner-1')
      expect(mockDb.hardDeleteMediaRecord).toHaveBeenCalledWith('media-1', 'owner-1')
      expect(result).toBe(true)
    })

    it('should return false when record not found', async () => {
      mockDb.hardDeleteMediaRecord.mockResolvedValue(false)
      const result = await service.hardDelete('nonexistent')
      expect(result).toBe(false)
    })

    it('should propagate database errors during hard delete', async () => {
      mockDb.hardDeleteMediaRecord.mockRejectedValue(new Error('Database error'))
      await expect(service.hardDelete('media-1')).rejects.toThrow('Database error')
    })
  })

  describe('getByIds', () => {
    it('should return media records by ids', async () => {
      const records = [mockMediaRecord, { ...mockMediaRecord, id: 'media-2' }]
      mockDb.getMediaRecordsByIds.mockResolvedValue(records)
      const result = await service.getByIds(['media-1', 'media-2'])
      expect(mockDb.getMediaRecordsByIds).toHaveBeenCalledWith(['media-1', 'media-2'])
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no ids match', async () => {
      mockDb.getMediaRecordsByIds.mockResolvedValue([])
      const result = await service.getByIds(['nonexistent'])
      expect(result).toEqual([])
    })

    it('should pass ownerId to db', async () => {
      mockDb.getMediaRecordsByIds.mockResolvedValue([])
      await service.getByIds(['media-1'], 'owner-1')
      expect(mockDb.getMediaRecordsByIds).toHaveBeenCalledWith(['media-1'])
    })
  })

  describe('toggleFavorite', () => {
    it('should toggle favorite and return added action', async () => {
      const mockResult = { isFavorite: true, action: 'added' as const }
      mockDb.toggleFavorite.mockResolvedValue(mockResult)
      const result = await service.toggleFavorite('user-1', 'media-1')
      expect(mockDb.toggleFavorite).toHaveBeenCalledWith('user-1', 'media-1')
      expect(result).toEqual(mockResult)
    })

    it('should toggle favorite and return removed action', async () => {
      const mockResult = { isFavorite: false, action: 'removed' as const }
      mockDb.toggleFavorite.mockResolvedValue(mockResult)
      const result = await service.toggleFavorite('user-1', 'media-1')
      expect(result.action).toBe('removed')
    })
  })

  describe('togglePublic', () => {
    it('should toggle public visibility to true', async () => {
      const updatedRecord = { ...mockMediaRecord, is_public: true }
      mockDb.togglePublicMediaRecord.mockResolvedValue(updatedRecord)
      const result = await service.togglePublic('media-1', true)
      expect(mockDb.togglePublicMediaRecord).toHaveBeenCalledWith('media-1', true)
      expect(result?.is_public).toBe(true)
    })

    it('should toggle public visibility to false', async () => {
      const updatedRecord = { ...mockMediaRecord, is_public: false }
      mockDb.togglePublicMediaRecord.mockResolvedValue(updatedRecord)
      const result = await service.togglePublic('media-1', false)
      expect(result?.is_public).toBe(false)
    })

    it('should return null when toggling non-existent record', async () => {
      mockDb.togglePublicMediaRecord.mockResolvedValue(null)
      const result = await service.togglePublic('nonexistent', true)
      expect(result).toBeNull()
    })
  })
})
