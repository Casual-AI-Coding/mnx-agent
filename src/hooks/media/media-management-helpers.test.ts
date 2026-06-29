import { describe, expect, it } from 'vitest'
import type { MediaRecord } from '@/types/media'
import {
  applyMediaPatch,
  applyMediaPatchByIds,
  buildPaginationItems,
  buildMediaListParams,
  collectUnfetchedPlayableRecords,
  isPlayableMedia,
  mergeSignedUrlResults,
  toggleAllSelectedIds,
  toggleSelectedId,
  toggleSetValueWithFallback,
} from './media-management-helpers'

const makeRecord = (id: string, type: MediaRecord['type']): MediaRecord => ({
  id,
  filename: `${id}.${type}`,
  original_name: `${id}.${type}`,
  filepath: `/tmp/${id}.${type}`,
  type,
  mime_type: null,
  size_bytes: 1024,
  source: null,
  task_id: null,
  metadata: null,
  is_deleted: false,
  is_public: false,
  is_favorite: false,
  owner_id: 'user-1',
  created_at: '2026-06-30T00:00:00',
  updated_at: '2026-06-30T00:00:00',
  deleted_at: null,
})

describe('media-management-helpers', () => {
  it('buildMediaListParams trims search and only accepts media type tabs', () => {
    const params = buildMediaListParams({
      activeTab: 'music',
      searchQuery: '  demo  ',
      page: 2,
      limit: 20,
      favoriteFilters: new Set(['favorite']),
      publicFilters: new Set(['private', 'public']),
    })

    expect(params).toEqual({
      type: 'music',
      search: 'demo',
      page: 2,
      limit: 20,
      favoriteFilter: ['favorite'],
      publicFilter: ['private', 'public'],
    })
  })

  it('buildMediaListParams omits type and empty search for non-media tab', () => {
    const params = buildMediaListParams({
      activeTab: 'all',
      searchQuery: '   ',
      page: 1,
      limit: 20,
      favoriteFilters: new Set(['favorite', 'non-favorite']),
      publicFilters: new Set(['private', 'public', 'others-public']),
    })

    expect(params).toEqual({
      page: 1,
      limit: 20,
      favoriteFilter: ['favorite', 'non-favorite'],
      publicFilter: ['private', 'public', 'others-public'],
    })
  })

  it('collectUnfetchedPlayableRecords returns only image/audio/music not already fetched', () => {
    const records = [
      makeRecord('image-1', 'image'),
      makeRecord('audio-1', 'audio'),
      makeRecord('music-1', 'music'),
      makeRecord('video-1', 'video'),
      makeRecord('lyrics-1', 'lyrics'),
    ]
    const fetchedIds = new Set(['audio-1'])

    expect(records.map(isPlayableMedia)).toEqual([true, true, true, false, false])
    expect(collectUnfetchedPlayableRecords(records, fetchedIds).map(record => record.id)).toEqual([
      'image-1',
      'music-1',
    ])
  })

  it('mergeSignedUrlResults keeps existing urls and ignores failed empty results', () => {
    const merged = mergeSignedUrlResults(
      { existing: 'https://cdn/existing' },
      [
        { id: 'image-1', url: 'https://cdn/image-1' },
        { id: 'audio-1', url: '' },
      ]
    )

    expect(merged).toEqual({
      existing: 'https://cdn/existing',
      'image-1': 'https://cdn/image-1',
    })
  })

  it('applyMediaPatch updates only the matching record', () => {
    const records = [makeRecord('keep', 'image'), makeRecord('rename', 'music')]

    expect(applyMediaPatch(records, 'rename', { original_name: '新名称.mp3', is_favorite: true })).toEqual([
      records[0],
      { ...records[1], original_name: '新名称.mp3', is_favorite: true },
    ])
  })

  it('applyMediaPatchByIds updates only records in the id set', () => {
    const records = [makeRecord('private-1', 'image'), makeRecord('public-1', 'music')]

    expect(applyMediaPatchByIds(records, new Set(['private-1']), { is_public: true })).toEqual([
      { ...records[0], is_public: true },
      records[1],
    ])
  })

  it('buildPaginationItems keeps compact pagination windows with ellipsis', () => {
    expect(buildPaginationItems({ currentPage: 1, totalPages: 3 })).toEqual([1, 2, 3])
    expect(buildPaginationItems({ currentPage: 2, totalPages: 10 })).toEqual([1, 2, 3, 4, '...', 10])
    expect(buildPaginationItems({ currentPage: 5, totalPages: 10 })).toEqual([1, '...', 4, 5, 6, '...', 10])
    expect(buildPaginationItems({ currentPage: 9, totalPages: 10 })).toEqual([1, '...', 7, 8, 9, 10])
  })

  it('toggleAllSelectedIds clears when all visible records are selected otherwise selects visible records', () => {
    const records = [makeRecord('image-1', 'image'), makeRecord('music-1', 'music')]

    expect(Array.from(toggleAllSelectedIds(new Set(['image-1']), records))).toEqual(['image-1', 'music-1'])
    expect(Array.from(toggleAllSelectedIds(new Set(['image-1', 'music-1']), records))).toEqual([])
    expect(Array.from(toggleAllSelectedIds(new Set(['other']), []))).toEqual([])
  })

  it('toggleSelectedId adds missing ids and removes selected ids without mutating the input set', () => {
    const selectedIds = new Set(['keep'])

    expect(Array.from(toggleSelectedId(selectedIds, 'add'))).toEqual(['keep', 'add'])
    expect(Array.from(toggleSelectedId(selectedIds, 'keep'))).toEqual([])
    expect(Array.from(selectedIds)).toEqual(['keep'])
  })

  it('toggleSetValueWithFallback restores fallback values when the last value is removed', () => {
    const fallback = ['favorite', 'non-favorite'] as const

    expect(Array.from(toggleSetValueWithFallback(new Set(['favorite']), 'favorite', fallback))).toEqual([
      'favorite',
      'non-favorite',
    ])
    expect(Array.from(toggleSetValueWithFallback(new Set(['favorite']), 'non-favorite', fallback))).toEqual([
      'favorite',
      'non-favorite',
    ])
  })
})
