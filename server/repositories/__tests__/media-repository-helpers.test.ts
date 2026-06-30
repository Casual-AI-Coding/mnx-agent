import { describe, expect, it } from 'vitest'
import { buildMediaListQuery } from '../media/media-list-query-builder'
import { mapMediaListRow, mapMediaRecordRow } from '../media/media-row-mapper'

const baseRow = {
  id: 'media-1',
  filename: 'image.png',
  original_name: '原始图片.png',
  filepath: '/data/image.png',
  type: 'image',
  mime_type: 'image/png',
  size_bytes: 1024,
  source: 'image_generation',
  task_id: 'task-1',
  metadata: null,
  is_deleted: false,
  is_public: false,
  owner_id: 'owner-1',
  created_at: '2026-06-30T10:00:00',
  updated_at: '2026-06-30T10:00:00',
  deleted_at: null,
}

describe('media repository helpers', () => {
  it('buildMediaListQuery uses inner favorite join when only favorites are requested', () => {
    const query = buildMediaListQuery({
      favoriteUserId: 'user-1',
      favoriteFilter: ['favorite'],
      limit: 20,
      offset: 40,
      isPostgres: true,
    })

    expect(query.selectClause).toContain('is_favorite')
    expect(query.joinClause).toContain('INNER JOIN user_media_favorites')
    expect(query.whereClause).toBe('WHERE m.is_deleted = false')
    expect(query.params).toEqual(['user-1'])
    expect(query.pagination.clause).toBe('LIMIT $2 OFFSET $3')
    expect(query.pagination.params).toEqual([20, 40])
  })

  it('buildMediaListQuery applies user visibility and deleted filters by default', () => {
    const query = buildMediaListQuery({
      visibilityOwnerId: 'owner-1',
      role: 'user',
      limit: 10,
      offset: 0,
      isPostgres: true,
    })

    expect(query.whereClause).toContain('(m.owner_id = $1 OR m.is_public = true)')
    expect(query.whereClause).toContain('m.is_deleted = false')
    expect(query.params).toEqual(['owner-1'])
  })

  it('buildMediaListQuery expresses others-public filter for non-admin visibility', () => {
    const query = buildMediaListQuery({
      visibilityOwnerId: 'owner-1',
      role: 'user',
      publicFilter: ['others-public'],
      limit: 10,
      offset: 0,
      isPostgres: true,
    })

    expect(query.whereClause).toContain('(m.owner_id IS NULL OR m.owner_id != $2) AND m.is_public = true')
    expect(query.params).toEqual(['owner-1', 'owner-1'])
  })

  it('buildMediaListQuery trims search and matches filename or original name', () => {
    const query = buildMediaListQuery({
      search: '  vacation  ',
      limit: 10,
      offset: 0,
      isPostgres: true,
    })

    expect(query.whereClause).toContain('(m.filename LIKE $1 OR m.original_name LIKE $1)')
    expect(query.params).toEqual(['%vacation%'])
  })

  it('mapMediaRecordRow parses database row types at the repository boundary', () => {
    const record = mapMediaRecordRow({
      ...baseRow,
      size_bytes: '2048',
      metadata: '{"prompt":"山水"}',
      is_deleted: 1,
    })

    expect(record.size_bytes).toBe(2048)
    expect(record.metadata).toEqual({ prompt: '山水' })
    expect(record.is_deleted).toBe(true)
    expect(record.type).toBe('image')
    expect(record.source).toBe('image_generation')
  })

  it('mapMediaListRow adds favorite flag only when requested', () => {
    const favoriteRecord = mapMediaListRow({ ...baseRow, is_favorite: true }, true)
    const plainRecord = mapMediaListRow({ ...baseRow, is_favorite: true }, false)

    expect(favoriteRecord.is_favorite).toBe(true)
    expect(plainRecord.is_favorite).toBeUndefined()
  })
})
