import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  saveMediaFile: vi.fn(),
  deleteMediaFile: vi.fn(),
  mediaService: {
    getAll: vi.fn(),
    getById: vi.fn(),
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
  saveFromUrl: vi.fn(),
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
    mocks.deleteMediaFile.mockResolvedValue(undefined)
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
          source: 'upload',
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

      const res = await request(app)
        .delete('/api/media/batch')
        .send({ ids: ['owned-media', 'missing-media'] })

      expect(res.status).toBe(404)
      expect(mocks.deleteMediaFile).not.toHaveBeenCalled()
      expect(mocks.mediaService.softDelete).not.toHaveBeenCalled()
    })
  })
})
