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
})