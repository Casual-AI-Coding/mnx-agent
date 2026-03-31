import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { getDatabase, closeDatabase } from '../../database/service'
import mediaRouter from '../media'

describe('Media API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    getDatabase(':memory:')
    app = express()
    app.use(express.json())
    app.use('/api/media', mediaRouter)
  })

  afterEach(() => {
    closeDatabase()
  })

  describe('GET /api/media', () => {
    it('should return empty list initially', async () => {
      const res = await request(app).get('/api/media')
      
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.records).toEqual([])
    })

    it('should return paginated list', async () => {
      await request(app).post('/api/media').send({
        filename: 'test1.wav',
        filepath: '/test1.wav',
        type: 'audio',
        size_bytes: 100,
      })
      await request(app).post('/api/media').send({
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
      await request(app).post('/api/media').send({
        filename: 'audio.wav',
        filepath: '/audio.wav',
        type: 'audio',
        size_bytes: 100,
      })
      await request(app).post('/api/media').send({
        filename: 'image.png',
        filepath: '/image.png',
        type: 'image',
        size_bytes: 200,
      })
      
      const res = await request(app).get('/api/media?type=audio')
      
      expect(res.body.data.records.length).toBe(1)
      expect(res.body.data.records[0].type).toBe('audio')
    })
  })

  describe('POST /api/media', () => {
    it('should create a media record', async () => {
      const res = await request(app).post('/api/media').send({
        filename: 'test.wav',
        filepath: '/data/media/2024/01/15/test.wav',
        type: 'audio',
        size_bytes: 1024,
      })
      
      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.filename).toBe('test.wav')
      expect(res.body.data.id).toBeDefined()
    })

    it('should reject invalid type', async () => {
      const res = await request(app).post('/api/media').send({
        filename: 'test.xyz',
        filepath: '/test.xyz',
        type: 'invalid',
        size_bytes: 100,
      })
      
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/media/:id', () => {
    it('should return single record', async () => {
      const createRes = await request(app).post('/api/media').send({
        filename: 'test.mp4',
        filepath: '/test.mp4',
        type: 'video',
        size_bytes: 5000,
      })
      
      const res = await request(app).get(`/api/media/${createRes.body.data.id}`)
      
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(createRes.body.data.id)
    })

    it('should return 404 for non-existent', async () => {
      const res = await request(app).get('/api/media/non-existent-id')
      
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/media/:id', () => {
    it('should update record', async () => {
      const createRes = await request(app).post('/api/media').send({
        filename: 'test.wav',
        filepath: '/test.wav',
        type: 'audio',
        size_bytes: 100,
      })
      
      const res = await request(app).put(`/api/media/${createRes.body.data.id}`).send({
        original_name: 'renamed.wav',
      })
      
      expect(res.body.data.original_name).toBe('renamed.wav')
    })
  })

  describe('DELETE /api/media/:id', () => {
    it('should soft delete record', async () => {
      const createRes = await request(app).post('/api/media').send({
        filename: 'delete-me.wav',
        filepath: '/delete-me.wav',
        type: 'audio',
        size_bytes: 100,
      })
      
      const res = await request(app).delete(`/api/media/${createRes.body.data.id}`)
      
      expect(res.status).toBe(200)
      expect(res.body.data.deleted).toBe(true)
    })
  })
})