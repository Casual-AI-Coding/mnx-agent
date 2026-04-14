import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MediaRepository } from '../media-repository'
import { DatabaseConnection } from '../../database/connection'
import { MediaType, MediaSource } from '../../database/types'

describe('MediaRepository', () => {
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

  describe('list() visibility filters', () => {
    it('should filter by visibilityOwnerId for user/pro roles', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'test.png', type: 'image' as MediaType, is_public: true, owner_id: 'owner-1' },
          { id: 'media-2', filename: 'private.png', type: 'image' as MediaType, is_public: false, owner_id: 'owner-1' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.owner_id = $'),
        expect.arrayContaining(['owner-1'])
      )
      expect(result.items).toHaveLength(2)
    })

    it('should not filter visibility for admin/super roles', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'admin',
      })

      const countCall = mockDb.query.mock.calls[0]
      expect(countCall[0]).not.toContain('m.owner_id = $')
    })

    it('should filter private only for user/pro roles', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'private.png', type: 'image' as MediaType, is_public: false, owner_id: 'owner-1' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
        publicFilter: ['private'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.is_public = false'),
        expect.arrayContaining(['owner-1'])
      )
      expect(result.items).toHaveLength(1)
    })
  })

  describe('list() favorite filters', () => {
    it('should filter favorites only', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'fav1.png', type: 'image' as MediaType, is_favorite: true },
          { id: 'media-2', filename: 'fav2.png', type: 'image' as MediaType, is_favorite: true },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        favoriteUserId: 'user-1',
        favoriteFilter: ['favorite'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN user_media_favorites'),
        expect.arrayContaining(['user-1'])
      )
      expect(result.items).toHaveLength(2)
    })

    it('should filter non-favorites only', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'non-fav.png', type: 'image' as MediaType, is_favorite: false },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        favoriteUserId: 'user-1',
        favoriteFilter: ['non-favorite'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('f.id IS NULL OR f.is_deleted = true'),
        expect.arrayContaining(['user-1'])
      )
      expect(result.items).toHaveLength(1)
    })

    it('should not filter when both favorite and non-favorite specified', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '10' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({
        favoriteUserId: 'user-1',
        favoriteFilter: ['favorite', 'non-favorite'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN user_media_favorites'),
        expect.arrayContaining(['user-1'])
      )
    })
  })

  describe('list() public filters', () => {
    it('should filter public only', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '4' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'public.png', type: 'image' as MediaType, is_public: true, owner_id: 'owner-1' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
        publicFilter: ['public'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.owner_id = $'),
        expect.arrayContaining(['owner-1'])
      )
      expect(result.items).toHaveLength(1)
    })

    it('should filter others-public only', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'others-public.png', type: 'image' as MediaType, is_public: true, owner_id: 'other-owner' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
        publicFilter: ['others-public'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.owner_id IS NULL OR m.owner_id != $'),
        expect.arrayContaining(['owner-1'])
      )
      expect(result.items).toHaveLength(1)
    })

    it('should combine private and public filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'private.png', type: 'image' as MediaType, is_public: false, owner_id: 'owner-1' },
          { id: 'media-2', filename: 'public.png', type: 'image' as MediaType, is_public: true, owner_id: 'owner-1' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
        publicFilter: ['private', 'public'],
      })

      expect(result.items).toHaveLength(2)
    })

    it('should combine private and others-public filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '4' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'private.png', type: 'image' as MediaType, is_public: false, owner_id: 'owner-1' },
          { id: 'media-2', filename: 'others-public.png', type: 'image' as MediaType, is_public: true, owner_id: 'other-owner' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
        publicFilter: ['private', 'others-public'],
      })

      expect(result.items).toHaveLength(2)
    })

    it('should combine public and others-public filters', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '6' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'public.png', type: 'image' as MediaType, is_public: true, owner_id: 'owner-1' },
          { id: 'media-2', filename: 'others-public.png', type: 'image' as MediaType, is_public: true, owner_id: 'other-owner' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
        publicFilter: ['public', 'others-public'],
      })

      expect(result.items).toHaveLength(2)
    })
  })

  describe('list() with admin/super role', () => {
    it('should allow admin to see owner-null records for private filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'private.png', type: 'image' as MediaType, is_public: false, owner_id: 'owner-1' },
          { id: 'media-2', filename: 'null-owner.png', type: 'image' as MediaType, is_public: false, owner_id: null },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'admin',
        publicFilter: ['private'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.owner_id IS NULL'),
        expect.any(Array)
      )
      expect(result.items).toHaveLength(2)
    })

    it('should allow admin to see owner-null records for public filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'admin',
        publicFilter: ['public'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.owner_id IS NULL'),
        expect.any(Array)
      )
    })

    it('should allow admin to see others records for others-public filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '4' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'super',
        publicFilter: ['others-public'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.owner_id != $'),
        expect.arrayContaining(['owner-1'])
      )
    })
  })

  describe('list() combined filters', () => {
    it('should combine visibility with favorite filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'fav.png', type: 'image' as MediaType, is_favorite: true, owner_id: 'owner-1' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
        favoriteUserId: 'user-1',
        favoriteFilter: ['favorite'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN user_media_favorites'),
        expect.arrayContaining(['user-1'])
      )
      expect(result.items).toHaveLength(1)
    })

    it('should combine visibility with public filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '3' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'public.png', type: 'image' as MediaType, is_public: true, owner_id: 'owner-1' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
        publicFilter: ['public'],
      })

      expect(result.items).toHaveLength(1)
    })

    it('should combine favorite with public filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'fav-public.png', type: 'image' as MediaType, is_favorite: true, is_public: true, owner_id: 'owner-1' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        favoriteUserId: 'user-1',
        favoriteFilter: ['favorite'],
        visibilityOwnerId: 'owner-1',
        role: 'user',
        publicFilter: ['public'],
      })

      expect(result.items).toHaveLength(1)
    })

    it('should combine visibility + favorite + public filters together', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'combined.png', type: 'image' as MediaType, is_favorite: true, is_public: true, owner_id: 'owner-1' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        visibilityOwnerId: 'owner-1',
        role: 'user',
        favoriteUserId: 'user-1',
        favoriteFilter: ['favorite'],
        publicFilter: ['public'],
      })

      expect(result.items).toHaveLength(1)
    })

    it('should combine type filter with favorite filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'audio.mp3', type: 'audio' as MediaType, is_favorite: true },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        type: 'audio',
        favoriteUserId: 'user-1',
        favoriteFilter: ['favorite'],
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.type = $'),
        expect.arrayContaining(['audio'])
      )
      expect(result.items).toHaveLength(1)
    })

    it('should combine source filter with visibility filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'generated.png', type: 'image' as MediaType, source: 'generation' as MediaSource, owner_id: 'owner-1' },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({
        source: 'generation',
        visibilityOwnerId: 'owner-1',
        role: 'user',
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.source = $'),
        expect.arrayContaining(['generation'])
      )
      expect(result.items).toHaveLength(1)
    })
  })

  describe('list() search functionality', () => {
    it('should search by filename', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'vacation_photo.png', original_name: 'IMG_001.png', type: 'image' as MediaType },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({ search: 'vacation' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.filename LIKE $'),
        expect.arrayContaining(['%vacation%'])
      )
      expect(result.items).toHaveLength(1)
    })

    it('should search by original_name', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'renamed.png', original_name: 'original_vacation.jpg', type: 'image' as MediaType },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({ search: 'original_vacation' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m.original_name LIKE $'),
        expect.arrayContaining(['%original_vacation%'])
      )
      expect(result.items).toHaveLength(1)
    })

    it('should search in both filename and original_name', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '2' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({ search: 'test' })

      const queryCall = mockDb.query.mock.calls[0]
      expect(queryCall[0]).toContain('m.filename LIKE $')
      expect(queryCall[0]).toContain('m.original_name LIKE $')
    })

    it('should handle search with whitespace', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'my document.pdf', type: 'document' as MediaType },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({ search: '  my document  ' })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIKE $'),
        expect.arrayContaining(['%my document%'])
      )
      expect(result.items).toHaveLength(1)
    })

    it('should handle empty search string', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({ search: '' })

      const queryCall = mockDb.query.mock.calls[0]
      expect(queryCall[0]).not.toContain('LIKE')
    })

    it('should handle search with only whitespace', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '5' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({ search: '   ' })

      const queryCall = mockDb.query.mock.calls[0]
      expect(queryCall[0]).not.toContain('LIKE')
    })

    it('should combine search with type filter', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'photo.png', type: 'image' as MediaType },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({ search: 'photo', type: 'image' })

      const queryCall = mockDb.query.mock.calls[0]
      expect(queryCall[0]).toContain('m.filename LIKE $')
      expect(queryCall[0]).toContain('m.type = $')
      expect(result.items).toHaveLength(1)
    })
  })

  describe('list() pagination edge cases', () => {
    it('should use default limit of 50', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({})

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[1]).toContain(50)
    })

    it('should use default offset of 0', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({})

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[1]).toContain(0)
    })

    it('should handle custom limit', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '200' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({ limit: 25 })

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[1]).toContain(25)
    })

    it('should handle custom offset', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '100' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      await repo.list({ offset: 50 })

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[1]).toContain(50)
    })

    it('should handle both limit and offset', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '1000' }] as any)
        .mockResolvedValueOnce([
          { id: 'media-1', filename: 'result.png', type: 'image' as MediaType },
        ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({ limit: 10, offset: 50 })

      const queryCall = mockDb.query.mock.calls[1]
      expect(queryCall[1]).toContain(10)
      expect(queryCall[1]).toContain(50)
      expect(result.total).toBe(1000)
    })

    it('should return correct total from count query', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '999' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({})

      expect(result.total).toBe(999)
    })

    it('should handle zero total', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ count: '0' }] as any)
        .mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.list({})

      expect(result.total).toBe(0)
      expect(result.items).toHaveLength(0)
    })
  })

  describe('getById', () => {
    it('should return media by id without owner', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'media-1', filename: 'test.png', type: 'image' as MediaType, is_public: false, owner_id: 'owner-1' },
      ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.getById('media-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM media_records WHERE id = $1',
        ['media-1']
      )
      expect(result).not.toBeNull()
      expect(result?.id).toBe('media-1')
    })

    it('should return media by id with owner', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'media-1', filename: 'test.png', type: 'image' as MediaType, is_public: false, owner_id: 'owner-1' },
      ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.getById('media-1', 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM media_records WHERE id = $1 AND owner_id = $2',
        ['media-1', 'owner-1']
      )
      expect(result).not.toBeNull()
    })

    it('should return null when not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.getById('non-existent')

      expect(result).toBeNull()
    })

    it('should include public records when includePublic is true with owner', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'media-1', filename: 'public.png', type: 'image' as MediaType, is_public: true, owner_id: 'other-owner' },
      ] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.getById('media-1', 'owner-1', true)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('OR is_public = true'),
        ['media-1', 'owner-1']
      )
      expect(result).not.toBeNull()
    })
  })

  describe('softDelete', () => {
    it('should soft delete with owner filter', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([
        { id: 'media-1', filename: 'test.png', type: 'image' as MediaType, is_deleted: false, owner_id: 'owner-1' },
      ] as any)
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.softDelete('media-1', 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE media_records SET is_deleted'),
        expect.arrayContaining(['owner-1'])
      )
      expect(result).toBe(true)
    })

    it('should return false when media not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.softDelete('non-existent', 'owner-1')

      expect(result).toBe(false)
    })
  })

  describe('toggleFavorite', () => {
    it('should add favorite when not exists', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([{ id: 'fav-1', user_id: 'user-1', media_id: 'media-1', is_deleted: false }] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.toggleFavorite('user-1', 'media-1')

      expect(result.isFavorite).toBe(true)
      expect(result.action).toBe('added')
    })

    it('should remove favorite when exists', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ id: 'fav-1', user_id: 'user-1', media_id: 'media-1', is_deleted: false }] as any)
        .mockResolvedValueOnce([{ id: 'fav-1', user_id: 'user-1', media_id: 'media-1', is_deleted: true }] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.toggleFavorite('user-1', 'media-1')

      expect(result.isFavorite).toBe(false)
      expect(result.action).toBe('removed')
    })

    it('should re-add favorite when previously deleted', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ id: 'fav-1', user_id: 'user-1', media_id: 'media-1', is_deleted: true }] as any)
        .mockResolvedValueOnce([{ id: 'fav-1', user_id: 'user-1', media_id: 'media-1', is_deleted: true }] as any)
        .mockResolvedValueOnce([{ id: 'fav-1', user_id: 'user-1', media_id: 'media-1', is_deleted: false }] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.toggleFavorite('user-1', 'media-1')

      expect(result.isFavorite).toBe(true)
      expect(result.action).toBe('added')
    })
  })

  describe('togglePublic', () => {
    it('should set is_public to true', async () => {
      mockDb.query = vi.fn()
        .mockResolvedValueOnce([{ id: 'media-1', filename: 'test.png', type: 'image' as MediaType, is_public: false }] as any)
        .mockResolvedValueOnce([{ id: 'media-1', filename: 'test.png', type: 'image' as MediaType, is_public: true }] as any)
      mockDb.execute = vi.fn()

      const repo = new MediaRepository(mockDb)
      const result = await repo.togglePublic('media-1', true)

      expect(mockDb.query).toHaveBeenCalled()
      expect(result?.is_public).toBe(true)
    })

    it('should set is_public to false', async () => {
      mockDb.query = vi.fn()
        .mockResolvedValueOnce([{ id: 'media-1', filename: 'test.png', type: 'image' as MediaType, is_public: true }] as any)
        .mockResolvedValueOnce([{ id: 'media-1', filename: 'test.png', type: 'image' as MediaType, is_public: false }] as any)
      mockDb.execute = vi.fn()

      const repo = new MediaRepository(mockDb)
      const result = await repo.togglePublic('media-1', false)

      expect(mockDb.query).toHaveBeenCalled()
      expect(result?.is_public).toBe(false)
    })

    it('should return null when media not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new MediaRepository(mockDb)
      const result = await repo.togglePublic('non-existent', true)

      expect(result).toBeNull()
    })
  })
})