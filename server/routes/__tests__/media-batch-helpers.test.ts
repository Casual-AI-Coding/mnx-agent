import { describe, expect, it } from 'vitest'
import type { MediaRecord } from '../../database/types'
import {
  buildBatchDownloadPlan,
  buildBatchPublicPlan,
} from '../media/media-batch-helpers'

function createMediaRecord(overrides: Partial<MediaRecord>): MediaRecord {
  return {
    id: 'media-1',
    filename: 'stored.png',
    original_name: '原始.png',
    filepath: '/tmp/stored.png',
    type: 'image',
    mime_type: 'image/png',
    size_bytes: 1024,
    source: 'image_generation',
    task_id: null,
    metadata: null,
    is_deleted: false,
    is_public: false,
    owner_id: 'user-1',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    deleted_at: null,
    ...overrides,
  }
}

describe('media-batch-helpers', () => {
  it('builds public plan for owned records and super-owned orphan records', () => {
    const plan = buildBatchPublicPlan({
      requestedIds: ['owned', 'orphan'],
      records: [
        createMediaRecord({ id: 'owned', owner_id: 'user-1' }),
        createMediaRecord({ id: 'orphan', owner_id: null }),
      ],
      userId: 'user-1',
      userRole: 'super',
    })

    expect(plan.authorizedIds).toEqual(['owned', 'orphan'])
    expect(plan.results).toEqual([
      { id: 'owned', success: true },
      { id: 'orphan', success: true },
    ])
  })

  it('marks missing deleted and foreign records as not authorized', () => {
    const plan = buildBatchPublicPlan({
      requestedIds: ['missing', 'deleted', 'foreign'],
      records: [
        createMediaRecord({ id: 'deleted', is_deleted: true, owner_id: 'user-1' }),
        createMediaRecord({ id: 'foreign', owner_id: 'other-user' }),
      ],
      userId: 'user-1',
      userRole: 'user',
    })

    expect(plan.authorizedIds).toEqual([])
    expect(plan.results).toEqual([
      { id: 'missing', success: false, error: 'Not authorized or not found' },
      { id: 'deleted', success: false, error: 'Not authorized or not found' },
      { id: 'foreign', success: false, error: 'Not authorized or not found' },
    ])
  })

  it('builds download plan with deterministic archive name and no warning when all ids are accessible', () => {
    const plan = buildBatchDownloadPlan({
      requestedIds: ['media-1', 'media-2'],
      records: [
        createMediaRecord({ id: 'media-1' }),
        createMediaRecord({ id: 'media-2', filename: 'second.png' }),
      ],
      timestamp: 1777777777000,
    })

    expect(plan.archiveFilename).toBe('media_batch_1777777777000.zip')
    expect(plan.records.map(record => record.id)).toEqual(['media-1', 'media-2'])
    expect(plan.inaccessibleSummary).toBeUndefined()
  })

  it('captures inaccessible counts for partial batch downloads', () => {
    const plan = buildBatchDownloadPlan({
      requestedIds: ['media-1', 'missing'],
      records: [createMediaRecord({ id: 'media-1' })],
      timestamp: 1777777777000,
    })

    expect(plan.archiveFilename).toBe('media_batch_1777777777000.zip')
    expect(plan.records.map(record => record.id)).toEqual(['media-1'])
    expect(plan.inaccessibleSummary).toEqual({ requestedCount: 2, accessibleCount: 1 })
  })
})
