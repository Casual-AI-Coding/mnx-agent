import { describe, it, expect } from 'vitest'
import { buildMediaListQuery, type MediaListQueryInput } from '../media/media-list-query-builder.js'

function baseInput(overrides: Partial<MediaListQueryInput> = {}): MediaListQueryInput {
  return {
    limit: 20,
    offset: 0,
    isPostgres: true,
    ...overrides,
  }
}

describe('buildMediaListQuery', () => {
  describe('core query structure', () => {
    it('builds empty WHERE when no filters are provided and includeDeleted is true', () => {
      const result = buildMediaListQuery(baseInput({ includeDeleted: true }))
      expect(result.whereClause).toBe('')
      expect(result.selectClause).toBe('m.*')
      expect(result.orderByClause).toBe('m.created_at DESC')
      expect(result.pagination.clause).toBe('LIMIT $1 OFFSET $2')
      expect(result.pagination.params).toEqual([20, 0])
    })

    it('builds WHERE clause when filters are applied', () => {
      const result = buildMediaListQuery(baseInput({ type: 'image', source: 'upload' }))
      expect(result.whereClause).toContain('m.type =')
      expect(result.whereClause).toContain('m.source =')
      expect(result.whereClause).toContain('WHERE')
    })
  })

  describe('deleted clause', () => {
    it('uses sqlite syntax when isPostgres is false', () => {
      const result = buildMediaListQuery(baseInput({ isPostgres: false }))
      expect(result.whereClause).toContain('m.is_deleted = 0')
      expect(result.whereClause).not.toContain('m.is_deleted = false')
    })

    it('uses postgres syntax when isPostgres is true', () => {
      const result = buildMediaListQuery(baseInput({ isPostgres: true }))
      expect(result.whereClause).toContain('m.is_deleted = false')
    })

    it('skips deleted filter when includeDeleted is true', () => {
      const result = buildMediaListQuery(baseInput({ includeDeleted: true }))
      expect(result.whereClause).toBe('')
    })
  })

  describe('search clause', () => {
    it('adds LIKE search on filename and original_name', () => {
      const result = buildMediaListQuery(baseInput({ search: 'cat' }))
      expect(result.whereClause).toContain('m.filename LIKE')
      expect(result.whereClause).toContain('m.original_name LIKE')
      expect(result.params).toContain('%cat%')
    })

    it('ignores whitespace-only search', () => {
      const result = buildMediaListQuery(baseInput({ search: '   ', includeDeleted: true }))
      expect(result.whereClause).toBe('')
    })
  })

  describe('favorite clause', () => {
    it('adds INNER JOIN for favorite-only filter', () => {
      const result = buildMediaListQuery(
        baseInput({ favoriteUserId: 'user-1', favoriteFilter: ['favorite'] })
      )
      expect(result.joinClause).toContain('INNER JOIN user_media_favorites')
      expect(result.selectClause).toContain('is_favorite')
    })

    it('adds LEFT JOIN + non-favorite condition for non-favorite-only filter', () => {
      const result = buildMediaListQuery(
        baseInput({ favoriteUserId: 'user-1', favoriteFilter: ['non-favorite'] })
      )
      expect(result.joinClause).toContain('LEFT JOIN user_media_favorites')
      expect(result.whereClause).toContain('f.id IS NULL')
    })

    it('adds LEFT JOIN without condition when both favorite and non-favorite are requested', () => {
      const result = buildMediaListQuery(
        baseInput({ favoriteUserId: 'user-1', favoriteFilter: ['favorite', 'non-favorite'] })
      )
      expect(result.joinClause).toContain('LEFT JOIN user_media_favorites')
      expect(result.whereClause).not.toContain('f.id IS NULL')
    })
  })

  describe('pin clause', () => {
    it('adds pin join and reorders by is_pinned DESC', () => {
      const result = buildMediaListQuery(baseInput({ pinnedUserId: 'user-1' }))
      expect(result.selectClause).toContain('is_pinned')
      expect(result.joinClause).toContain('user_media_pins')
      expect(result.orderByClause).toBe('is_pinned DESC, m.created_at DESC')
    })
  })

  describe('visibility clause', () => {
    it('adds owner_id OR is_public filter for non-admin users', () => {
      const result = buildMediaListQuery(
        baseInput({ visibilityOwnerId: 'user-1', role: 'user' })
      )
      expect(result.whereClause).toContain('m.owner_id =')
      expect(result.whereClause).toContain('m.is_public = true')
    })

    it('skips visibility filter for admin role', () => {
      const result = buildMediaListQuery(
        baseInput({ visibilityOwnerId: 'admin-1', role: 'admin' })
      )
      expect(result.whereClause).not.toContain('m.owner_id = $')
    })

    it('skips visibility filter when visibilityOwnerId is absent', () => {
      const result = buildMediaListQuery(baseInput({ role: 'user', includeDeleted: true }))
      expect(result.whereClause).toBe('')
    })
  })

  describe('public filter clause', () => {
    it('builds private-only filter for regular user', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'user-1',
          role: 'user',
          publicFilter: ['private'],
        })
      )
      expect(result.whereClause).toContain('m.is_public = false')
      expect(result.whereClause).not.toContain('m.owner_id IS NULL')
    })

    it('builds private-only filter for admin (includes null owner)', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'admin-1',
          role: 'admin',
          publicFilter: ['private'],
        })
      )
      expect(result.whereClause).toContain('m.is_public = false')
      expect(result.whereClause).toContain('m.owner_id IS NULL')
    })

    it('builds public-only filter for admin', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'admin-1',
          role: 'admin',
          publicFilter: ['public'],
        })
      )
      expect(result.whereClause).toContain('m.is_public = true')
      expect(result.whereClause).toContain('m.owner_id IS NULL')
    })

    it('builds public-only filter for regular user', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'user-1',
          role: 'user',
          publicFilter: ['public'],
        })
      )
      expect(result.whereClause).toContain('m.is_public = true')
      expect(result.whereClause).not.toContain('m.owner_id IS NULL')
    })

    it('builds others-public filter for admin with visibilityOwnerId', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'admin-1',
          role: 'admin',
          publicFilter: ['others-public'],
        })
      )
      expect(result.whereClause).toContain('m.owner_id !=')
      expect(result.whereClause).toContain('m.owner_id IS NOT NULL')
      expect(result.whereClause).toContain('m.is_public = true')
    })

    it('builds others-public filter for regular user with visibilityOwnerId', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'user-1',
          role: 'user',
          publicFilter: ['others-public'],
        })
      )
      expect(result.whereClause).toContain('m.owner_id IS NULL OR')
      expect(result.whereClause).toContain('m.is_public = true')
    })

    it('builds others-public filter without visibilityOwnerId (admin skipped, falls to generic)', () => {
      const result = buildMediaListQuery(
        baseInput({
          role: 'admin',
          publicFilter: ['others-public'],
        })
      )
      expect(result.whereClause).toContain('m.is_public = true')
      expect(result.whereClause).not.toContain('m.owner_id !=')
    })

    it('builds private+public filter for admin (owner_or_null condition)', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'admin-1',
          role: 'admin',
          publicFilter: ['private', 'public'],
        })
      )
      expect(result.whereClause).toContain('m.owner_id IS NULL')
    })

    it('builds private+public filter for regular user', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'user-1',
          role: 'user',
          publicFilter: ['private', 'public'],
        })
      )
      expect(result.whereClause).toContain('m.owner_id = $')
      expect(result.whereClause).not.toContain('m.owner_id IS NULL')
    })

    it('builds private+others-public filter for admin with visibilityOwnerId', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'admin-1',
          role: 'admin',
          publicFilter: ['private', 'others-public'],
        })
      )
      expect(result.whereClause).toContain('m.is_public = false')
      expect(result.whereClause).toContain('m.owner_id IS NOT NULL')
    })

    it('builds private+others-public filter for regular user with visibilityOwnerId', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'user-1',
          role: 'user',
          publicFilter: ['private', 'others-public'],
        })
      )
      expect(result.whereClause).toContain('m.owner_id IS NULL OR')
    })

    it('skips private+others-public condition when no visibilityOwnerId for admin', () => {
      const result = buildMediaListQuery(
        baseInput({
          role: 'admin',
          publicFilter: ['private', 'others-public'],
          includeDeleted: true,
        })
      )
      expect(result.whereClause).toBe('')
    })

    it('builds public+others-public filter', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'user-1',
          role: 'user',
          publicFilter: ['public', 'others-public'],
        })
      )
      expect(result.whereClause).toContain('m.is_public = true')
    })

    it('builds all-three public filter (private+public+others-public)', () => {
      const result = buildMediaListQuery(
        baseInput({
          visibilityOwnerId: 'user-1',
          role: 'admin',
          publicFilter: ['private', 'public', 'others-public'],
          includeDeleted: true,
        })
      )
      expect(result.whereClause).toBe('')
    })

    it('skips public filter when array is empty', () => {
      const result = buildMediaListQuery(
        baseInput({ publicFilter: [], includeDeleted: true })
      )
      expect(result.whereClause).toBe('')
    })

    it('skips public filter when undefined', () => {
      const result = buildMediaListQuery(baseInput({ includeDeleted: true }))
      expect(result.whereClause).toBe('')
    })
  })

  describe('super role', () => {
    it('treats super role same as admin for visibility', () => {
      const result = buildMediaListQuery(
        baseInput({ visibilityOwnerId: 'super-1', role: 'super' })
      )
      expect(result.whereClause).not.toContain('m.is_public = true')
    })
  })
})
