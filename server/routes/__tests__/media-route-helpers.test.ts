import { describe, expect, it } from 'vitest'
import {
  buildMediaListRouteOptions,
  parseBatchIds,
  parseMediaUploadFields,
  parseUploadFromUrlBody,
  parseUploadMetadata,
} from '../media/media-route-helpers'

describe('media-route-helpers', () => {
  it('builds media list options from validated query and request context', () => {
    const result = buildMediaListRouteOptions({
      query: {
        page: '3',
        limit: '25',
        type: 'image',
        source: 'image_generation',
        search: '  山水  ',
        includeDeleted: 'true',
        favoriteFilter: 'favorite,non-favorite',
        publicFilter: 'private,others-public',
      },
      userId: 'user-1',
      role: 'pro',
      visibilityOwnerId: 'owner-1',
    })

    expect(result.pagination).toEqual({ page: 3, limit: 25, offset: 50 })
    expect(result.mediaOptions).toEqual({
      type: 'image',
      source: 'image_generation',
      search: '  山水  ',
      limit: 25,
      offset: 50,
      includeDeleted: true,
      visibilityOwnerId: 'owner-1',
      favoriteFilter: ['favorite', 'non-favorite'],
      publicFilter: ['private', 'others-public'],
      favoriteUserId: 'user-1',
      pinnedUserId: 'user-1',
      role: 'pro',
    })
  })

  it('omits optional filters when query values are empty', () => {
    const result = buildMediaListRouteOptions({
      query: {
        page: '1',
        limit: '20',
        search: '',
      },
    })

    expect(result.mediaOptions.type).toBeUndefined()
    expect(result.mediaOptions.source).toBeUndefined()
    expect(result.mediaOptions.search).toBeUndefined()
    expect(result.mediaOptions.favoriteFilter).toBeUndefined()
    expect(result.mediaOptions.publicFilter).toBeUndefined()
    expect(result.mediaOptions.includeDeleted).toBe(false)
  })

  it('parses upload metadata JSON strings into records', () => {
    const result = parseUploadMetadata('{"prompt":"山水","seed":42}')

    expect(result).toEqual({ ok: true, metadata: { prompt: '山水', seed: 42 } })
  })

  it('rejects invalid upload metadata JSON without throwing', () => {
    const result = parseUploadMetadata('{bad json')

    expect(result).toEqual({ ok: false, error: 'Invalid metadata JSON' })
  })

  it('parses batch id request bodies without mutating ids', () => {
    const ids = ['media-1', 'media-2']
    const result = parseBatchIds({ ids })

    expect(result).toEqual({ ok: true, ids: ['media-1', 'media-2'] })
    expect(ids).toEqual(['media-1', 'media-2'])
  })

  it('parses media upload fields into typed values', () => {
    const result = parseMediaUploadFields({
      type: 'image',
      source: 'image_generation',
    })

    expect(result).toEqual({ ok: true, type: 'image', source: 'image_generation' })
  })

  it('rejects invalid media upload type before storage', () => {
    const result = parseMediaUploadFields({
      type: 'spreadsheet',
      source: 'image_generation',
    })

    expect(result).toEqual({ ok: false, error: 'Invalid media upload fields' })
  })

  it('parses upload-from-url bodies and metadata consistently', () => {
    const result = parseUploadFromUrlBody({
      url: 'https://example.com/cat.png',
      filename: 'cat.png',
      type: 'image',
      source: 'image_generation',
      metadata: '{"prompt":"cat"}',
    })

    expect(result).toEqual({
      ok: true,
      url: 'https://example.com/cat.png',
      filename: 'cat.png',
      type: 'image',
      source: 'image_generation',
      metadata: { prompt: 'cat' },
    })
  })

  it('rejects upload-from-url bodies without url and type', () => {
    const result = parseUploadFromUrlBody({
      source: 'image_generation',
    })

    expect(result).toEqual({ ok: false, error: 'url and type are required' })
  })
})
