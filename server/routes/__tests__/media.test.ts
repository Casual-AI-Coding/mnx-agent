import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import mediaRouter from '../media.js'

describe('Media API Routes', () => {
  let app: express.Application
  let fileMarker: string

  const mockAuthMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: fileMarker,
      username: 'media-api-test',
      role: 'user' as const,
    }
    next()
  }

  const createdRecordIds = new Set<string>()

  async function createMedia(data: Record<string, unknown>) {
    const res = await request(app).post('/api/media').send(data)
    if (res.body.data?.id) {
      createdRecordIds.add(res.body.data.id)
    }
    return res
  }

  beforeAll(async () => {
    await setupTestDatabase()
    fileMarker = getTestFileMarker(import.meta.url)
    app = express()
    app.use(express.json())
    app.use(mockAuthMiddleware)
    app.use('/api/media', mediaRouter)

    const conn = getConnection()
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [fileMarker, `media-api-test-${fileMarker.slice(0,8)}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute(`DELETE FROM media_records WHERE owner_id = $1`, [fileMarker])
    createdRecordIds.clear()
  })

  afterEach(async () => {
    if (createdRecordIds.size > 0) {
      const conn = getConnection()
      const ids = Array.from(createdRecordIds)
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100)
        await conn.execute(`DELETE FROM media_records WHERE id = ANY($1)`, [batch])
      }
      createdRecordIds.clear()
    }
  })

  afterAll(async () => {
    const conn = getConnection()
    await conn.execute(`DELETE FROM media_records WHERE owner_id = $1`, [fileMarker])
    await conn.execute(`DELETE FROM users WHERE id = $1`, [fileMarker])
    await teardownTestDatabase()
  })

  describe('GET /api/media', () => {
    it('should return empty list initially', async () => {
      const res = await request(app).get('/api/media?publicFilter=private')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.records).toEqual([])
      expect(res.body.data.pagination.total).toBe(0)
    })

    it('should return paginated list', async () => {
      await createMedia({
        filename: 'test1.wav',
        filepath: '/test1.wav',
        type: 'audio',
        size_bytes: 100,
      })
      await createMedia({
        filename: 'test2.png',
        filepath: '/test2.png',
        type: 'image',
        size_bytes: 200,
      })

      const res = await request(app).get('/api/media?page=1&limit=10')

      expect(res.body.data.records.length).toBe(2)
      expect(res.body.data.pagination.total).toBe(2)
    })

    it('should filter by type', async () => {
      await createMedia({
        filename: 'audio.mp3',
        filepath: '/audio.mp3',
        type: 'audio',
        size_bytes: 100,
      })
      await createMedia({
        filename: 'image.png',
        filepath: '/image.png',
        type: 'image',
        size_bytes: 200,
      })

      const res = await request(app).get('/api/media?type=audio')

      expect(res.body.data.records.length).toBe(1)
      expect(res.body.data.records[0].type).toBe('audio')
    })

    it('should filter by source', async () => {
      await createMedia({
        filename: 'generated.mp3',
        filepath: '/generated.mp3',
        type: 'audio',
        size_bytes: 100,
        source: 'voice_sync',
      })
      await createMedia({
        filename: 'uploaded.mp3',
        filepath: '/uploaded.mp3',
        type: 'audio',
        size_bytes: 200,
        source: 'voice_async',
      })

      const res = await request(app).get('/api/media?source=voice_sync')

      expect(res.body.data.records.length).toBe(1)
      expect(res.body.data.records[0].source).toBe('voice_sync')
    })

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) {
        await createMedia({
          filename: `file${i}.mp3`,
          filepath: `/file${i}.mp3`,
          type: 'audio',
          size_bytes: 100 * (i + 1),
        })
      }

      const res = await request(app).get('/api/media?page=1&limit=3&publicFilter=private')

      expect(res.body.data.records.length).toBe(3)
      expect(res.body.data.pagination.total).toBe(5)
      expect(res.body.data.pagination.totalPages).toBe(2)
    })

    it('should include deleted records when includeDeleted is true', async () => {
      const createRes = await createMedia({
        filename: 'to_delete.png',
        filepath: '/to_delete.png',
        type: 'image',
        size_bytes: 100,
      })

      await request(app).delete(`/api/media/${createRes.body.data.id}`)

      const withoutDeleted = await request(app).get('/api/media?publicFilter=private')
      expect(withoutDeleted.body.data.records.length).toBe(0)

      const withDeleted = await request(app).get('/api/media?includeDeleted=true&publicFilter=private')
      expect(withDeleted.body.data.records.length).toBe(1)
      expect(withDeleted.body.data.records[0].is_deleted).toBe(true)
    })
  })

  describe('GET /api/media/:id', () => {
    it('should return a media record by id', async () => {
      const createRes = await createMedia({
        filename: 'test.mp3',
        filepath: '/test.mp3',
        type: 'audio',
        size_bytes: 100,
      })

      const res = await request(app).get(`/api/media/${createRes.body.data.id}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.filename).toBe('test.mp3')
    })

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).get('/api/media/non-existent-id')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })

    it('should return 404 for soft-deleted record', async () => {
      const createRes = await createMedia({
        filename: 'delete_test.png',
        filepath: '/data/media/delete_test.png',
        type: 'image',
        size_bytes: 1024,
      })

      await request(app).delete(`/api/media/${createRes.body.data.id}`)

      const getRes = await request(app).get(`/api/media/${createRes.body.data.id}`)
      expect(getRes.status).toBe(404)
    })
  })

  describe('POST /api/media', () => {
    it('should create a media record', async () => {
      const res = await createMedia({
        filename: 'new.mp3',
        filepath: '/new.mp3',
        type: 'audio',
        size_bytes: 500,
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.filename).toBe('new.mp3')
      expect(res.body.data.type).toBe('audio')
    })

    it('should create with all fields', async () => {
      const res = await createMedia({
        filename: 'full.mp3',
        original_name: 'original.mp3',
        filepath: '/full.mp3',
        type: 'audio',
        mime_type: 'audio/mpeg',
        size_bytes: 1000,
        source: 'voice_sync',
        metadata: { prompt: 'test' },
      })

      expect(res.status).toBe(201)
      expect(res.body.data.original_name).toBe('original.mp3')
      expect(res.body.data.mime_type).toBe('audio/mpeg')
    })

    it('should reject missing required fields', async () => {
      const res = await createMedia({
        filename: 'incomplete.mp3',
      })

      expect(res.status).toBe(400)
    })

    it('should reject invalid type', async () => {
      const res = await createMedia({
        filename: 'invalid.mp3',
        filepath: '/invalid.mp3',
        type: 'invalid_type',
        size_bytes: 100,
      })

      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/media/:id', () => {
    it('should update original_name', async () => {
      const createRes = await createMedia({
        filename: 'update_me.mp3',
        filepath: '/update_me.mp3',
        type: 'audio',
        size_bytes: 100,
      })

      const res = await request(app).put(`/api/media/${createRes.body.data.id}`).send({
        original_name: 'updated_name.mp3',
      })

      expect(res.status).toBe(200)
      expect(res.body.data.original_name).toBe('updated_name.mp3')
    })

    it('should update metadata', async () => {
      const createRes = await createMedia({
        filename: 'meta.mp3',
        filepath: '/meta.mp3',
        type: 'audio',
        size_bytes: 100,
      })

      const res = await request(app).put(`/api/media/${createRes.body.data.id}`).send({
        metadata: { key: 'value', number: 42 },
      })

      expect(res.status).toBe(200)
      expect(res.body.data.metadata.key).toBe('value')
    })

    it('should update both original_name and metadata', async () => {
      const createRes = await createMedia({
        filename: 'both.mp3',
        filepath: '/both.mp3',
        type: 'audio',
        size_bytes: 100,
      })

      const res = await request(app).put(`/api/media/${createRes.body.data.id}`).send({
        original_name: 'new_name.mp3',
        metadata: { updated: true },
      })

      expect(res.status).toBe(200)
      expect(res.body.data.original_name).toBe('new_name.mp3')
      expect(res.body.data.metadata.updated).toBe(true)
    })

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).put('/api/media/non-existent-id').send({
        original_name: 'test.mp3',
      })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/media/:id', () => {
    it('should soft delete a media record', async () => {
      const createRes = await createMedia({
        filename: 'delete_test.png',
        filepath: '/data/media/delete_test.png',
        type: 'image',
        size_bytes: 1024,
      })

      const res = await request(app).delete(`/api/media/${createRes.body.data.id}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.deleted).toBe(true)
    })

    it('should return 404 when deleting non-existent record', async () => {
      const res = await request(app).delete('/api/media/non-existent-id')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('DELETE /api/media/batch', () => {
    it('should soft delete multiple records', async () => {
      const res1 = await createMedia({
        filename: 'batch1.mp3',
        filepath: '/data/media/batch1.mp3',
        type: 'audio',
        size_bytes: 1024,
      })
      const res2 = await createMedia({
        filename: 'batch2.mp3',
        filepath: '/data/media/batch2.mp3',
        type: 'audio',
        size_bytes: 2048,
      })

      const res = await request(app).delete('/api/media/batch').send({
        ids: [res1.body.data.id, res2.body.data.id],
      })

      expect(res.status).toBe(200)
      expect(res.body.data.deleted).toBe(2)
    })

    it('should reject empty ids array', async () => {
      const res = await request(app).delete('/api/media/batch').send({
        ids: [],
      })

      expect(res.status).toBe(400)
    })
  })

  describe('Pagination edge cases', () => {
    it('should handle page 1 with limit 1', async () => {
      await createMedia({
        filename: 'single.mp3',
        filepath: '/single.mp3',
        type: 'audio',
        size_bytes: 100,
      })

      const res = await request(app).get('/api/media?page=1&limit=1')

      expect(res.body.data.records.length).toBe(1)
      expect(res.body.data.pagination.page).toBe(1)
      expect(res.body.data.pagination.limit).toBe(1)
    })

    it('should calculate totalPages correctly', async () => {
      for (let i = 0; i < 7; i++) {
        await createMedia({
          filename: `page${i}.mp3`,
          filepath: `/page${i}.mp3`,
          type: 'audio',
          size_bytes: 100,
        })
      }

      const res = await request(app).get('/api/media?page=2&limit=3&publicFilter=private')

      expect(res.body.data.pagination.total).toBe(7)
      expect(res.body.data.pagination.totalPages).toBe(3)
    })
  })

  describe('Type filtering edge cases', () => {
    it('should filter by all media types', async () => {
      const types = ['audio', 'image', 'video', 'music']
      for (const type of types) {
        await createMedia({
          filename: `${type}.test`,
          filepath: `/${type}.test`,
          type,
          size_bytes: 100,
        })
      }

      for (const type of types) {
        const res = await request(app).get(`/api/media?type=${type}`)
        expect(res.body.data.records.length).toBe(1)
        expect(res.body.data.records[0].type).toBe(type)
      }
    })

    it('should return empty for non-matching type', async () => {
      await createMedia({
        filename: 'audio.mp3',
        filepath: '/audio.mp3',
        type: 'audio',
        size_bytes: 100,
      })

      const res = await request(app).get('/api/media?type=video')

      expect(res.body.data.records.length).toBe(0)
    })
  })

  describe('Source filtering edge cases', () => {
    it('should filter by all media sources', async () => {
      const sources = ['voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation']
      for (const source of sources) {
        await createMedia({
          filename: `${source}.test`,
          filepath: `/${source}.test`,
          type: 'audio',
          size_bytes: 100,
          source,
        })
      }

      for (const source of sources) {
        const res = await request(app).get(`/api/media?source=${source}`)
        expect(res.body.data.records.length).toBe(1)
        expect(res.body.data.records[0].source).toBe(source)
      }
    })
  })

  describe('Combined filtering', () => {
    it('should filter by type and source combined', async () => {
      await createMedia({
        filename: 'audio_sync.mp3',
        filepath: '/audio_sync.mp3',
        type: 'audio',
        size_bytes: 100,
        source: 'voice_sync',
      })
      await createMedia({
        filename: 'audio_async.mp3',
        filepath: '/audio_async.mp3',
        type: 'audio',
        size_bytes: 200,
        source: 'voice_async',
      })
      await createMedia({
        filename: 'image.png',
        filepath: '/image.png',
        type: 'image',
        size_bytes: 300,
        source: 'image_generation',
      })

      const res = await request(app).get('/api/media?type=audio&source=voice_sync')

      expect(res.body.data.records.length).toBe(1)
      expect(res.body.data.records[0].filename).toBe('audio_sync.mp3')
    })

    it('should filter by type, source, and pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createMedia({
          filename: `audio${i}.mp3`,
          filepath: `/audio${i}.mp3`,
          type: 'audio',
          size_bytes: 100,
          source: 'voice_sync',
        })
      }
      await createMedia({
        filename: 'video.mp4',
        filepath: '/video.mp4',
        type: 'video',
        size_bytes: 500,
        source: 'video_generation',
      })

      const res = await request(app).get('/api/media?type=audio&source=voice_sync&page=1&limit=3')

      expect(res.body.data.records.length).toBe(3)
      expect(res.body.data.pagination.total).toBe(5)
    })
  })

  describe('Data integrity', () => {
    it('should preserve all fields after creation', async () => {
      const data = {
        filename: 'integrity.mp3',
        original_name: 'Original Integrity.mp3',
        filepath: '/integrity.mp3',
        type: 'audio',
        mime_type: 'audio/mpeg',
        size_bytes: 12345,
        source: 'voice_sync',
        metadata: { prompt: 'test prompt', model: 'test-model' },
      }

      const createRes = await createMedia(data)
      const getRes = await request(app).get(`/api/media/${createRes.body.data.id}`)

      const record = getRes.body.data
      expect(record.filename).toBe(data.filename)
      expect(record.original_name).toBe(data.original_name)
      expect(record.filepath).toBe(data.filepath)
      expect(record.type).toBe(data.type)
      expect(record.mime_type).toBe(data.mime_type)
      expect(record.size_bytes).toBe(data.size_bytes)
      expect(record.source).toBe(data.source)
    })

    it('should handle metadata as JSON object', async () => {
      const metadata = {
        nested: { deeply: { value: 123 } },
        array: [1, 2, 3],
        boolean: true,
      }

      const createRes = await createMedia({
        filename: 'metadata.mp3',
        filepath: '/metadata.mp3',
        type: 'audio',
        size_bytes: 100,
        metadata,
      })

      const res = await request(app).get(`/api/media/${createRes.body.data.id}`)
      expect(res.body.data.metadata.nested.deeply.value).toBe(123)
      expect(res.body.data.metadata.array).toEqual([1, 2, 3])
      expect(res.body.data.metadata.boolean).toBe(true)
    })
  })
})
