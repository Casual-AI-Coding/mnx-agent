import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseService, getDatabase, closeDatabase } from '../service'
import type { CreateMediaRecord, MediaType, MediaSource } from '../types'

describe('DatabaseService - Media Records', () => {
  let db: DatabaseService

  beforeEach(() => {
    // Use in-memory database for tests
    db = getDatabase(':memory:')
  })

  afterEach(() => {
    closeDatabase()
  })

  describe('createMediaRecord', () => {
    it('should create a media record', () => {
      const data: CreateMediaRecord = {
        filename: 'test.wav',
        filepath: '/data/media/2024/01/15/test.wav',
        type: 'audio',
        size_bytes: 1024,
      }
      
      const record = db.createMediaRecord(data)
      
      expect(record.id).toBeDefined()
      expect(record.filename).toBe('test.wav')
      expect(record.type).toBe('audio')
      expect(record.is_deleted).toBe(false)
    })

    it('should include optional fields', () => {
      const record = db.createMediaRecord({
        filename: 'test.png',
        filepath: '/data/media/test.png',
        type: 'image',
        size_bytes: 2048,
        original_name: 'my-image.png',
        source: 'image_generation',
        mime_type: 'image/png',
      })
      
      expect(record.original_name).toBe('my-image.png')
      expect(record.source).toBe('image_generation')
    })
  })

  describe('getMediaRecordById', () => {
    it('should return record by id', () => {
      const created = db.createMediaRecord({
        filename: 'test.mp4',
        filepath: '/data/media/test.mp4',
        type: 'video',
        size_bytes: 5000,
      })
      
      const found = db.getMediaRecordById(created.id)
      
      expect(found).not.toBeNull()
      expect(found?.id).toBe(created.id)
    })

    it('should return null for non-existent id', () => {
      const found = db.getMediaRecordById('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('getMediaRecords', () => {
    beforeEach(() => {
      db.createMediaRecord({ filename: 'audio1.wav', filepath: '/a1', type: 'audio', size_bytes: 100 })
      db.createMediaRecord({ filename: 'image1.png', filepath: '/i1', type: 'image', size_bytes: 200 })
      db.createMediaRecord({ filename: 'audio2.wav', filepath: '/a2', type: 'audio', size_bytes: 300 })
    })

    it('should return all records with pagination', () => {
      const result = db.getMediaRecords({ limit: 10, offset: 0 })
      
      expect(result.records.length).toBe(3)
      expect(result.total).toBe(3)
    })

    it('should filter by type', () => {
      const result = db.getMediaRecords({ type: 'audio', limit: 10, offset: 0 })
      
      expect(result.records.length).toBe(2)
      expect(result.records.every(r => r.type === 'audio')).toBe(true)
    })

    it('should paginate correctly', () => {
      const page1 = db.getMediaRecords({ limit: 2, offset: 0 })
      const page2 = db.getMediaRecords({ limit: 2, offset: 2 })
      
      expect(page1.records.length).toBe(2)
      expect(page2.records.length).toBe(1)
    })
  })

  describe('updateMediaRecord', () => {
    it('should update record', () => {
      const created = db.createMediaRecord({
        filename: 'test.wav',
        filepath: '/test.wav',
        type: 'audio',
        size_bytes: 100,
      })
      
      const updated = db.updateMediaRecord(created.id, { original_name: 'renamed.wav' })
      
      expect(updated?.original_name).toBe('renamed.wav')
    })
  })

  describe('softDeleteMediaRecord', () => {
    it('should soft delete record', () => {
      const created = db.createMediaRecord({
        filename: 'test.wav',
        filepath: '/test.wav',
        type: 'audio',
        size_bytes: 100,
      })
      
      const success = db.softDeleteMediaRecord(created.id)
      
      expect(success).toBe(true)
      
      const found = db.getMediaRecordById(created.id)
      expect(found?.is_deleted).toBe(true)
    })
  })

  describe('hardDeleteMediaRecord', () => {
    it('should permanently delete record', () => {
      const created = db.createMediaRecord({
        filename: 'test.wav',
        filepath: '/test.wav',
        type: 'audio',
        size_bytes: 100,
      })
      
      const success = db.hardDeleteMediaRecord(created.id)
      
      expect(success).toBe(true)
      expect(db.getMediaRecordById(created.id)).toBeNull()
    })
  })
})