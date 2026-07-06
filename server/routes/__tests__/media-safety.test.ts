import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  saveMediaFile: vi.fn(),
  saveFromUrl: vi.fn(),
  deleteMediaFile: vi.fn(),
  queryLogs: vi.fn(),
  getLogById: vi.fn(),
  mediaService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByIds: vi.fn(),
    create: vi.fn(),
    softDelete: vi.fn(),
  },
}))

vi.mock('axios', () => ({
  default: {
    get: mocks.axiosGet,
  },
}))

vi.mock('../../service-registration.js', () => ({
  getMediaService: () => mocks.mediaService,
  getExternalApiLogRepository: () => ({
    queryLogs: mocks.queryLogs,
    getById: mocks.getLogById,
  }),
}))

vi.mock('../../database/connection.js', () => ({
  getConnection: () => ({}),
}))

vi.mock('../../middleware/validate', () => ({
  validate: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  validateQuery: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  validateParams: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../../middleware/data-isolation.js', () => ({
  buildOwnerFilter: () => ({ ownerId: 'user-1', params: ['user-1'] }),
  getOwnerIdForInsert: () => 'user-1',
}))

vi.mock('../../lib/media-storage', () => ({
  saveMediaFile: mocks.saveMediaFile,
  readMediaFile: vi.fn(),
  deleteMediaFile: mocks.deleteMediaFile,
  saveFromUrl: mocks.saveFromUrl,
}))

import mediaRouter from '../media.js'

describe('Media Route Safety', () => {
  let app: express.Application

  beforeEach(() => {
    vi.clearAllMocks()

    app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      req.user = {
        userId: 'user-1',
        username: 'tester',
        role: 'user',
      }
      next()
    })
    app.use('/api/media', mediaRouter)

    mocks.saveMediaFile.mockResolvedValue({
      filepath: '/tmp/file.png',
      filename: 'file.png',
      size_bytes: 4,
    })
    mocks.saveFromUrl.mockResolvedValue({
      filepath: '/tmp/recovered.mp3',
      filename: 'recovered.mp3',
      size_bytes: 1024,
    })
    mocks.deleteMediaFile.mockResolvedValue(undefined)
    mocks.queryLogs.mockResolvedValue({ logs: [], total: 0 })
    mocks.getLogById.mockResolvedValue(null)
    mocks.mediaService.getAll.mockResolvedValue({ records: [], total: 0 })
    mocks.mediaService.create.mockResolvedValue({
      id: 'media-1',
      filename: 'file.png',
      original_name: 'image.png',
      filepath: '/tmp/file.png',
      type: 'image',
      mime_type: 'image/png',
      size_bytes: 4,
      source: 'upload',
      metadata: null,
    })
    mocks.mediaService.softDelete.mockResolvedValue(true)
  })

  describe('POST /api/media/upload-from-url', () => {
    it('should set timeout and body size limits on remote downloads', async () => {
      mocks.axiosGet.mockResolvedValue({
        data: Buffer.from('test'),
        headers: { 'content-type': 'image/png' },
      })

      const res = await request(app)
        .post('/api/media/upload-from-url')
        .send({
          url: 'https://example.com/image.png',
          type: 'image',
          source: 'image_generation',
        })

      expect(res.status).toBe(201)
      expect(mocks.axiosGet).toHaveBeenCalledWith(
        'https://example.com/image.png',
        expect.objectContaining({
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: expect.any(Number),
          maxBodyLength: expect.any(Number),
        })
      )
    })
  })

  describe('DELETE /api/media/batch', () => {
    it('should reject the batch when any record is missing or unauthorized', async () => {
      mocks.mediaService.getById.mockImplementation(async (id: string) => {
        if (id === 'owned-media') {
          return {
            id,
            filepath: '/tmp/owned.png',
            is_deleted: false,
            owner_id: 'user-1',
          }
        }

        return null
      })
      mocks.mediaService.getByIds.mockResolvedValue([
        { id: 'owned-media', filepath: '/tmp/owned.png', is_deleted: false, owner_id: 'user-1' },
      ])

      const res = await request(app)
        .delete('/api/media/batch')
        .send({ ids: ['owned-media', 'missing-media'] })

      expect(res.status).toBe(404)
      expect(mocks.deleteMediaFile).not.toHaveBeenCalled()
      expect(mocks.mediaService.softDelete).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/media/recover/:logId', () => {
    it('should recover media from an external API log through the domain recovery plan', async () => {
      mocks.getLogById.mockResolvedValue({
        id: 41,
        service_provider: 'minimax',
        api_endpoint: '/v1/music_generation',
        operation: 'music_generation',
        request_params: null,
        request_body: null,
        response_body: JSON.stringify({
          data: {
            audio: 'https://cdn.example.com/song.mp3',
            song_title: '架构之歌',
            lyrics: '高内聚，低耦合',
          },
        }),
        status: 'success',
        error_message: null,
        duration_ms: 100,
        user_id: 'user-1',
        trace_id: 'trace-1',
        created_at: '2026-06-29T10:00:00',
        task_status: 'sync',
        result_media_id: null,
        result_data: null,
      })

      await request(app)
        .post('/api/media/recover/41')
        .send({ resource_url: 'https://cdn.example.com/song.mp3' })
        .expect(200)

      expect(mocks.saveFromUrl).toHaveBeenCalledWith(
        'https://cdn.example.com/song.mp3',
        'music_generation_41.mp3',
        'music'
      )
      expect(mocks.mediaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'recovered.mp3',
          original_name: 'music_generation_41.mp3',
          filepath: '/tmp/recovered.mp3',
          type: 'music',
          source: 'music_generation',
          metadata: expect.objectContaining({
            source_url: 'https://cdn.example.com/song.mp3',
            external_api_log_id: 41,
            operation: 'music_generation',
            service_provider: 'minimax',
            restored_from_log: true,
            song_title: '架构之歌',
            lyrics: '高内聚，低耦合',
          }),
        }),
        'user-1'
      )
    })

    it('should reject a requested recovery URL that is absent from the log response', async () => {
      mocks.getLogById.mockResolvedValue({
        id: 51,
        service_provider: 'minimax',
        api_endpoint: '/v1/image_generation',
        operation: 'image_generation',
        request_params: null,
        request_body: null,
        response_body: JSON.stringify({ image_urls: ['https://cdn.example.com/actual.png'] }),
        status: 'success',
        error_message: null,
        duration_ms: 100,
        user_id: 'user-1',
        trace_id: 'trace-1',
        created_at: '2026-06-29T10:00:00',
        task_status: 'sync',
        result_media_id: null,
        result_data: null,
      })

      const res = await request(app)
        .post('/api/media/recover/51')
        .send({ resource_url: 'https://cdn.example.com/missing.png' })

      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({ success: false, error: 'Specified resource_url not found in log response' })
      expect(mocks.saveFromUrl).not.toHaveBeenCalled()
      expect(mocks.mediaService.create).not.toHaveBeenCalled()
    })
  })
})
