import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase, getConnection } from '../../__tests__/test-helpers.js'
import { DatabaseService } from '../service-async.js'
import type { CreateMediaRecord, MediaType, MediaSource } from '../types.js'
import { v4 as uuidv4 } from 'uuid'

describe('MediaRecord Database Service', () => {
  let db: DatabaseService
  let testOwnerId1: string
  let testOwnerId2: string

  beforeAll(async () => {
    await setupTestDatabase()
    db = new DatabaseService(getConnection())
    
    // Create test users for owner_id tests
    const conn = getConnection()
    testOwnerId1 = uuidv4()
    testOwnerId2 = uuidv4()
    
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (id) DO NOTHING`,
      [testOwnerId1, `media-test-user-1-${Date.now()}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (id) DO NOTHING`,
      [testOwnerId2, `media-test-user-2-${Date.now()}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('TRUNCATE TABLE media_records CASCADE')
  })

  afterAll(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM users WHERE id IN ($1, $2)', [testOwnerId1, testOwnerId2])
    await teardownTestDatabase()
  })

  describe('Create MediaRecord', () => {
    it('should create a media record with required fields', async () => {
      const recordData: CreateMediaRecord = {
        filename: 'test_audio.mp3',
        filepath: '/data/media/2026/04/04/test_audio.mp3',
        type: 'audio' as MediaType,
        size_bytes: 1024000,
      }
      const record = await db.createMediaRecord(recordData)

      expect(record.id).toBeDefined()
      expect(record.filename).toBe('test_audio.mp3')
      expect(record.filepath).toBe('/data/media/2026/04/04/test_audio.mp3')
      expect(record.type).toBe('audio')
      expect(record.size_bytes).toBe(1024000)
      expect(record.is_deleted).toBe(false)
      expect(record.created_at).toBeDefined()
      expect(record.updated_at).toBeDefined()
    })

    it('should create a media record with all fields', async () => {
      const recordData: CreateMediaRecord = {
        filename: 'test_image.png',
        original_name: 'sunset.png',
        filepath: '/data/media/2026/04/04/test_image.png',
        type: 'image' as MediaType,
        mime_type: 'image/png',
        size_bytes: 2048000,
        source: 'image_generation' as MediaSource,
        task_id: 'task-123',
        metadata: { prompt: 'A beautiful sunset', model: 'image-01' },
      }
      const record = await db.createMediaRecord(recordData)

      expect(record.filename).toBe('test_image.png')
      expect(record.original_name).toBe('sunset.png')
      expect(record.type).toBe('image')
      expect(record.mime_type).toBe('image/png')
      expect(record.source).toBe('image_generation')
      expect(record.task_id).toBe('task-123')
      expect(record.metadata).toBeDefined()
      const metadata = typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata
      expect(metadata.prompt).toBe('A beautiful sunset')
    })

    it('should create a video media record', async () => {
      const recordData: CreateMediaRecord = {
        filename: 'test_video.mp4',
        filepath: '/data/media/2026/04/04/test_video.mp4',
        type: 'video' as MediaType,
        size_bytes: 10485760,
        source: 'video_generation' as MediaSource,
      }
      const record = await db.createMediaRecord(recordData)

      expect(record.type).toBe('video')
      expect(record.source).toBe('video_generation')
    })

    it('should create a music media record', async () => {
      const recordData: CreateMediaRecord = {
        filename: 'test_music.mp3',
        filepath: '/data/media/2026/04/04/test_music.mp3',
        type: 'music' as MediaType,
        size_bytes: 3072000,
        source: 'music_generation' as MediaSource,
      }
      const record = await db.createMediaRecord(recordData)

      expect(record.type).toBe('music')
      expect(record.source).toBe('music_generation')
    })

    it('should create media record with owner_id', async () => {
      const recordData: CreateMediaRecord = {
        filename: 'owned_file.mp3',
        filepath: '/data/media/owned_file.mp3',
        type: 'audio' as MediaType,
        size_bytes: 1024,
      }
      const record = await db.createMediaRecord(recordData, testOwnerId1)

      expect(record.id).toBeDefined()
      const retrieved = await db.getMediaRecordById(record.id, testOwnerId1)
      expect(retrieved).not.toBeNull()
    })
  })

  describe('Read MediaRecords', () => {
    it('should get media record by id', async () => {
      const created = await db.createMediaRecord({
        filename: 'find_me.png',
        filepath: '/data/media/find_me.png',
        type: 'image' as MediaType,
        size_bytes: 1024,
      })

      const record = await db.getMediaRecordById(created.id)
      expect(record).not.toBeNull()
      expect(record!.filename).toBe('find_me.png')
    })

    it('should return null for non-existent id', async () => {
      const record = await db.getMediaRecordById('non-existent-id')
      expect(record).toBeNull()
    })

    it('should get media record by id with owner_id', async () => {
      const created = await db.createMediaRecord({
        filename: 'owned.png',
        filepath: '/data/media/owned.png',
        type: 'image' as MediaType,
        size_bytes: 1024,
      }, testOwnerId1)

      const record = await db.getMediaRecordById(created.id, testOwnerId1)
      expect(record).not.toBeNull()
      expect(record!.filename).toBe('owned.png')
    })

    it('should return null when getting with wrong owner_id', async () => {
      const created = await db.createMediaRecord({
        filename: 'secret.png',
        filepath: '/data/media/secret.png',
        type: 'image' as MediaType,
        size_bytes: 1024,
      }, testOwnerId1)

      const record = await db.getMediaRecordById(created.id, testOwnerId2)
      expect(record).toBeNull()
    })
  })

  describe('List MediaRecords', () => {
    beforeEach(async () => {
      // Create test records
      await db.createMediaRecord({
        filename: 'audio1.mp3',
        filepath: '/data/media/audio1.mp3',
        type: 'audio',
        size_bytes: 1024,
        source: 'voice_sync',
      })
      await db.createMediaRecord({
        filename: 'audio2.mp3',
        filepath: '/data/media/audio2.mp3',
        type: 'audio',
        size_bytes: 2048,
        source: 'voice_async',
      })
      await db.createMediaRecord({
        filename: 'image1.png',
        filepath: '/data/media/image1.png',
        type: 'image',
        size_bytes: 4096,
        source: 'image_generation',
      })
      await db.createMediaRecord({
        filename: 'video1.mp4',
        filepath: '/data/media/video1.mp4',
        type: 'video',
        size_bytes: 8192,
        source: 'video_generation',
      })
      await db.createMediaRecord({
        filename: 'music1.mp3',
        filepath: '/data/media/music1.mp3',
        type: 'music',
        size_bytes: 3072,
        source: 'music_generation',
      })
    })

    it('should get all media records without filters', async () => {
      const result = await db.getMediaRecords({ limit: 10, offset: 0 })
      expect(result.records.length).toBe(5)
      expect(result.total).toBe(5)
    })

    it('should filter by type', async () => {
      const result = await db.getMediaRecords({ type: 'audio', limit: 10, offset: 0 })
      expect(result.records.length).toBe(2)
      expect(result.total).toBe(2)
      result.records.forEach(record => {
        expect(record.type).toBe('audio')
      })
    })

    it('should filter by source', async () => {
      const result = await db.getMediaRecords({ source: 'image_generation', limit: 10, offset: 0 })
      expect(result.records.length).toBe(1)
      expect(result.total).toBe(1)
      expect(result.records[0].source).toBe('image_generation')
    })

    it('should filter by type and source combined', async () => {
      const result = await db.getMediaRecords({
        type: 'audio',
        source: 'voice_sync',
        limit: 10,
        offset: 0
      })
      expect(result.records.length).toBe(1)
      expect(result.records[0].filename).toBe('audio1.mp3')
    })

    it('should paginate results', async () => {
      const page1 = await db.getMediaRecords({ limit: 2, offset: 0 })
      expect(page1.records.length).toBe(2)
      expect(page1.total).toBe(5)

      const page2 = await db.getMediaRecords({ limit: 2, offset: 2 })
      expect(page2.records.length).toBe(2)
      expect(page2.total).toBe(5)

      const page3 = await db.getMediaRecords({ limit: 2, offset: 4 })
      expect(page3.records.length).toBe(1)
      expect(page3.total).toBe(5)
    })

    it('should exclude deleted records by default', async () => {
      const record = await db.createMediaRecord({
        filename: 'to_delete.png',
        filepath: '/data/media/to_delete.png',
        type: 'image',
        size_bytes: 100,
      })
      await db.softDeleteMediaRecord(record.id)

      const result = await db.getMediaRecords({ limit: 10, offset: 0 })
      const filenames = result.records.map(r => r.filename)
      expect(filenames).not.toContain('to_delete.png')
    })

    it('should include deleted records when includeDeleted is true', async () => {
      const record = await db.createMediaRecord({
        filename: 'deleted_file.png',
        filepath: '/data/media/deleted_file.png',
        type: 'image',
        size_bytes: 100,
      })
      await db.softDeleteMediaRecord(record.id)

      const result = await db.getMediaRecords({ limit: 10, offset: 0, includeDeleted: true })
      const deleted = result.records.find(r => r.filename === 'deleted_file.png')
      expect(deleted).toBeDefined()
      expect(deleted!.is_deleted).toBe(true)
    })

    it('should filter by owner_id', async () => {
      const ownerId = testOwnerId1
      await db.createMediaRecord({
        filename: 'owner_file.mp3',
        filepath: '/data/media/owner_file.mp3',
        type: 'audio',
        size_bytes: 1024,
      }, ownerId)
      await db.createMediaRecord({
        filename: 'other_file.mp3',
        filepath: '/data/media/other_file.mp3',
        type: 'audio',
        size_bytes: 1024,
      }, testOwnerId2)

      const result = await db.getMediaRecords({ limit: 10, offset: 0, visibilityOwnerId: ownerId })
      expect(result.records.length).toBe(1)
      expect(result.records[0].filename).toBe('owner_file.mp3')
    })
  })

  describe('Update MediaRecord', () => {
    it('should update original_name', async () => {
      const created = await db.createMediaRecord({
        filename: 'original.png',
        filepath: '/data/media/original.png',
        type: 'image',
        size_bytes: 1024,
      })

      const updated = await db.updateMediaRecord(created.id, { original_name: 'new_name.png' })
      expect(updated).not.toBeNull()
      expect(updated!.original_name).toBe('new_name.png')
    })

    it('should update metadata', async () => {
      const created = await db.createMediaRecord({
        filename: 'meta_test.png',
        filepath: '/data/media/meta_test.png',
        type: 'image',
        size_bytes: 1024,
      })

      const newMetadata = { edited: true, editDate: '2026-04-04' }
      const updated = await db.updateMediaRecord(created.id, { metadata: newMetadata })
      expect(updated).not.toBeNull()
      const metadata = typeof updated!.metadata === 'string' ? JSON.parse(updated!.metadata) : updated!.metadata
      expect(metadata.edited).toBe(true)
      expect(metadata.editDate).toBe('2026-04-04')
    })

    it('should return null when updating non-existent record', async () => {
      const updated = await db.updateMediaRecord('non-existent-id', { original_name: 'test' })
      expect(updated).toBeNull()
    })

    it('should update with owner_id', async () => {
      const ownerId = testOwnerId1
      const created = await db.createMediaRecord({
        filename: 'update_me.png',
        filepath: '/data/media/update_me.png',
        type: 'image',
        size_bytes: 1024,
      }, ownerId)

      const updated = await db.updateMediaRecord(created.id, { original_name: 'updated.png' }, ownerId)
      expect(updated).not.toBeNull()
      expect(updated!.original_name).toBe('updated.png')
    })

    it('should return null when updating with wrong owner_id', async () => {
      const ownerId = testOwnerId1
      const created = await db.createMediaRecord({
        filename: 'owned_update.png',
        filepath: '/data/media/owned_update.png',
        type: 'image',
        size_bytes: 1024,
      }, ownerId)

      const updated = await db.updateMediaRecord(created.id, { original_name: 'hacked.png' }, testOwnerId2)
      expect(updated).toBeNull()
    })
  })

  describe('Delete MediaRecord', () => {
    describe('Soft Delete', () => {
      it('should soft delete a media record', async () => {
        const created = await db.createMediaRecord({
          filename: 'soft_delete_me.png',
          filepath: '/data/media/soft_delete_me.png',
          type: 'image',
          size_bytes: 1024,
        })

        const success = await db.softDeleteMediaRecord(created.id)
        expect(success).toBe(true)

        const record = await db.getMediaRecordById(created.id)
        expect(record).not.toBeNull()
        expect(record!.is_deleted).toBe(true)
        expect(record!.deleted_at).toBeDefined()
      })

      it('should return false when soft deleting non-existent record', async () => {
        const success = await db.softDeleteMediaRecord('non-existent-id')
        expect(success).toBe(false)
      })

      it('should soft delete with owner_id', async () => {
        const ownerId = testOwnerId1
        const created = await db.createMediaRecord({
          filename: 'owner_delete.png',
          filepath: '/data/media/owner_delete.png',
          type: 'image',
          size_bytes: 1024,
        }, ownerId)

        const success = await db.softDeleteMediaRecord(created.id, ownerId)
        expect(success).toBe(true)

        const record = await db.getMediaRecordById(created.id, ownerId)
        expect(record!.is_deleted).toBe(true)
      })

      it('should return false when soft deleting with wrong owner_id', async () => {
        const ownerId = testOwnerId1
        const created = await db.createMediaRecord({
          filename: 'protected.png',
          filepath: '/data/media/protected.png',
          type: 'image',
          size_bytes: 1024,
        }, ownerId)

        const success = await db.softDeleteMediaRecord(created.id, testOwnerId2)
        expect(success).toBe(false)
      })
    })

    describe('Hard Delete', () => {
      it('should hard delete a media record', async () => {
        const created = await db.createMediaRecord({
          filename: 'hard_delete_me.png',
          filepath: '/data/media/hard_delete_me.png',
          type: 'image',
          size_bytes: 1024,
        })

        const success = await db.hardDeleteMediaRecord(created.id)
        expect(success).toBe(true)

        const record = await db.getMediaRecordById(created.id)
        expect(record).toBeNull()
      })

      it('should return false when hard deleting non-existent record', async () => {
        const success = await db.hardDeleteMediaRecord('non-existent-id')
        expect(success).toBe(false)
      })

      it('should hard delete with owner_id', async () => {
        const ownerId = testOwnerId1
        const created = await db.createMediaRecord({
          filename: 'hard_owner.png',
          filepath: '/data/media/hard_owner.png',
          type: 'image',
          size_bytes: 1024,
        }, ownerId)

        const success = await db.hardDeleteMediaRecord(created.id, ownerId)
        expect(success).toBe(true)

        const record = await db.getMediaRecordById(created.id)
        expect(record).toBeNull()
      })
    })

    describe('Batch Soft Delete', () => {
      it('should soft delete multiple records', async () => {
        const record1 = await db.createMediaRecord({
          filename: 'batch1.png',
          filepath: '/data/media/batch1.png',
          type: 'image',
          size_bytes: 1024,
        })
        const record2 = await db.createMediaRecord({
          filename: 'batch2.png',
          filepath: '/data/media/batch2.png',
          type: 'image',
          size_bytes: 2048,
        })
        const record3 = await db.createMediaRecord({
          filename: 'batch3.png',
          filepath: '/data/media/batch3.png',
          type: 'image',
          size_bytes: 3072,
        })

        const result = await db.softDeleteMediaRecords([record1.id, record2.id])
        expect(result.deleted).toBe(2)
        expect(result.failed).toBe(0)

        const r1 = await db.getMediaRecordById(record1.id)
        const r2 = await db.getMediaRecordById(record2.id)
        const r3 = await db.getMediaRecordById(record3.id)
        expect(r1!.is_deleted).toBe(true)
        expect(r2!.is_deleted).toBe(true)
        expect(r3!.is_deleted).toBe(false)
      })

      it('should handle partial failures in batch delete', async () => {
        const record1 = await db.createMediaRecord({
          filename: 'partial1.png',
          filepath: '/data/media/partial1.png',
          type: 'image',
          size_bytes: 1024,
        })

        const result = await db.softDeleteMediaRecords([record1.id, 'non-existent-id'])
        expect(result.deleted).toBe(1)
        expect(result.failed).toBe(1)
      })
    })
  })

  describe('Get MediaRecords By IDs', () => {
    it('should get multiple records by ids', async () => {
      const record1 = await db.createMediaRecord({
        filename: 'multi1.png',
        filepath: '/data/media/multi1.png',
        type: 'image',
        size_bytes: 1024,
      })
      const record2 = await db.createMediaRecord({
        filename: 'multi2.png',
        filepath: '/data/media/multi2.png',
        type: 'image',
        size_bytes: 2048,
      })

      const records = await db.getMediaRecordsByIds([record1.id, record2.id])
      expect(records.length).toBe(2)
      const filenames = records.map(r => r.filename)
      expect(filenames).toContain('multi1.png')
      expect(filenames).toContain('multi2.png')
    })

    it('should return empty array for empty ids', async () => {
      const records = await db.getMediaRecordsByIds([])
      expect(records.length).toBe(0)
    })

    it('should exclude soft-deleted records', async () => {
      const record1 = await db.createMediaRecord({
        filename: 'active.png',
        filepath: '/data/media/active.png',
        type: 'image',
        size_bytes: 1024,
      })
      const record2 = await db.createMediaRecord({
        filename: 'inactive.png',
        filepath: '/data/media/inactive.png',
        type: 'image',
        size_bytes: 2048,
      })
      await db.softDeleteMediaRecord(record2.id)

      const records = await db.getMediaRecordsByIds([record1.id, record2.id])
      expect(records.length).toBe(1)
      expect(records[0].filename).toBe('active.png')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty filename', async () => {
      const record = await db.createMediaRecord({
        filename: '',
        filepath: '/data/media/empty.png',
        type: 'image',
        size_bytes: 0,
      })
      expect(record.filename).toBe('')
    })

    it('should handle zero size_bytes', async () => {
      const record = await db.createMediaRecord({
        filename: 'zero_size.png',
        filepath: '/data/media/zero_size.png',
        type: 'image',
        size_bytes: 0,
      })
      expect(record.size_bytes).toBe(0)
    })

    it('should handle all media types', async () => {
      const types: MediaType[] = ['audio', 'image', 'video', 'music']
      for (const type of types) {
        const record = await db.createMediaRecord({
          filename: `${type}_test.mp3`,
          filepath: `/data/media/${type}_test.mp3`,
          type,
          size_bytes: 1024,
        })
        expect(record.type).toBe(type)
      }
    })

    it('should handle all media sources', async () => {
      const sources: MediaSource[] = ['voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation']
      for (const source of sources) {
        const record = await db.createMediaRecord({
          filename: `${source}_test.mp3`,
          filepath: `/data/media/${source}_test.mp3`,
          type: 'audio',
          size_bytes: 1024,
          source,
        })
        expect(record.source).toBe(source)
      }
    })

    it('should handle complex metadata', async () => {
      const complexMetadata = {
        nested: { deeply: { value: 123 } },
        array: [1, 2, 3],
        boolean: true,
        null: null,
      }
      const record = await db.createMediaRecord({
        filename: 'complex.png',
        filepath: '/data/media/complex.png',
        type: 'image',
        size_bytes: 1024,
        metadata: complexMetadata,
      })

      const retrieved = await db.getMediaRecordById(record.id)
      const metadata = typeof retrieved!.metadata === 'string' ? JSON.parse(retrieved!.metadata) : retrieved!.metadata
      expect(metadata.nested.deeply.value).toBe(123)
      expect(metadata.array).toEqual([1, 2, 3])
      expect(metadata.boolean).toBe(true)
      expect(metadata.null).toBeNull()
    })

    it('should correctly count total records with pagination', async () => {
      // Create 7 records
      for (let i = 0; i < 7; i++) {
        await db.createMediaRecord({
          filename: `count_test_${i}.png`,
          filepath: `/data/media/count_test_${i}.png`,
          type: 'image',
          size_bytes: 1024 * (i + 1),
        })
      }

      // Test various page sizes
      const page1 = await db.getMediaRecords({ limit: 3, offset: 0 })
      expect(page1.total).toBe(7)
      expect(page1.records.length).toBe(3)

      const page2 = await db.getMediaRecords({ limit: 3, offset: 3 })
      expect(page2.total).toBe(7)
      expect(page2.records.length).toBe(3)

      const page3 = await db.getMediaRecords({ limit: 3, offset: 6 })
      expect(page3.total).toBe(7)
      expect(page3.records.length).toBe(1)
    })

    it('should preserve data integrity through create-retrieve-update cycle', async () => {
      const original: CreateMediaRecord = {
        filename: 'integrity_test.png',
        original_name: 'Original Name',
        filepath: '/data/media/integrity_test.png',
        type: 'image',
        mime_type: 'image/png',
        size_bytes: 4096,
        source: 'image_generation',
        task_id: 'task-integrity-123',
        metadata: { originalPrompt: 'test prompt' },
      }

      const created = await db.createMediaRecord(original)
      const retrieved = await db.getMediaRecordById(created.id)

      expect(retrieved!.filename).toBe(original.filename)
      expect(retrieved!.original_name).toBe(original.original_name)
      expect(retrieved!.filepath).toBe(original.filepath)
      expect(retrieved!.type).toBe(original.type)
      expect(retrieved!.mime_type).toBe(original.mime_type)
      expect(retrieved!.size_bytes).toBe(original.size_bytes)
      expect(retrieved!.source).toBe(original.source)
      expect(retrieved!.task_id).toBe(original.task_id)

      const updateResult = await db.updateMediaRecord(created.id, {
        original_name: 'Updated Name',
        metadata: { originalPrompt: 'test prompt', updated: true },
      })
      expect(updateResult!.original_name).toBe('Updated Name')
      const updatedMeta = typeof updateResult!.metadata === 'string' ? JSON.parse(updateResult!.metadata) : updateResult!.metadata
      expect(updatedMeta.updated).toBe(true)
      expect(updatedMeta.originalPrompt).toBe('test prompt')
    })
  })

  describe('is_public field', () => {
    it('should have is_public column after migration', async () => {
      const conn = getConnection()
      const result = await conn.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'media_records' AND column_name = 'is_public'
      `)
      expect(result.length).toBe(1)
    })

    it('should default is_public to false', async () => {
      const created = await db.createMediaRecord({
        filename: 'public_test.png',
        filepath: '/data/media/public_test.png',
        type: 'image',
        size_bytes: 1024,
      })
      expect((created as any).is_public).toBe(false)
    })

    it('should have indexes for is_public field', async () => {
      const conn = getConnection()
      const result = await conn.query(`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'media_records' 
        AND indexname IN ('idx_media_records_is_public', 'idx_media_records_owner_public')
      `)
      expect(result.length).toBe(2)
    })
  })

describe('togglePublic', () => {
    it('should toggle is_public from false to true', async () => {
      const created = await db.createMediaRecord({
        filename: 'toggle_test.png',
        filepath: '/data/media/toggle_test.png',
        type: 'image',
        size_bytes: 1024,
      })
      expect((created as any).is_public).toBe(false)

      const updated = await db.togglePublicMediaRecord(created.id, true)
      expect(updated).not.toBeNull()
      expect((updated as any).is_public).toBe(true)
    })

    it('should toggle is_public from true to false', async () => {
      const created = await db.createMediaRecord({
        filename: 'toggle_test2.png',
        filepath: '/data/media/toggle_test2.png',
        type: 'image',
        size_bytes: 1024,
      })
      expect((created as any).is_public).toBe(false)

      await db.togglePublicMediaRecord(created.id, true)
      
      const updated = await db.togglePublicMediaRecord(created.id, false)
      expect(updated).not.toBeNull()
      expect((updated as any).is_public).toBe(false)
    })

    it('should return null when toggling non-existent record', async () => {
      const updated = await db.togglePublicMediaRecord('non-existent-id', true)
      expect(updated).toBeNull()
    })
  })

  describe('list visibility', () => {
    beforeEach(async () => {
      const conn = getConnection()
      await conn.execute('TRUNCATE TABLE media_records CASCADE')
    })

    it('user sees own private + all public records', async () => {
      const user1 = testOwnerId1
      const user2 = testOwnerId2

      const ownPrivate = await db.createMediaRecord({
        filename: 'user1_private.png',
        filepath: '/data/media/user1_private.png',
        type: 'image',
        size_bytes: 1024,
      }, user1)
      await db.togglePublicMediaRecord(ownPrivate.id, false)

      const ownPublic = await db.createMediaRecord({
        filename: 'user1_public.png',
        filepath: '/data/media/user1_public.png',
        type: 'image',
        size_bytes: 1024,
      }, user1)
      await db.togglePublicMediaRecord(ownPublic.id, true)

      const otherPrivate = await db.createMediaRecord({
        filename: 'user2_private.png',
        filepath: '/data/media/user2_private.png',
        type: 'image',
        size_bytes: 1024,
      }, user2)
      await db.togglePublicMediaRecord(otherPrivate.id, false)

      const otherPublic = await db.createMediaRecord({
        filename: 'user2_public.png',
        filepath: '/data/media/user2_public.png',
        type: 'image',
        size_bytes: 1024,
      }, user2)
      await db.togglePublicMediaRecord(otherPublic.id, true)

      const result = await db.getMediaRecords({ limit: 10, offset: 0, visibilityOwnerId: user1, role: 'user' })
      const filenames = result.records.map(r => r.filename)
      
      expect(filenames).toContain('user1_private.png')
      expect(filenames).toContain('user1_public.png')
      expect(filenames).toContain('user2_public.png')
      expect(filenames).not.toContain('user2_private.png')
      expect(result.records.length).toBe(3)
    })

    it('admin sees all records', async () => {
      const user1 = testOwnerId1
      const user2 = testOwnerId2

      const ownPrivate = await db.createMediaRecord({
        filename: 'admin_private1.png',
        filepath: '/data/media/admin_private1.png',
        type: 'image',
        size_bytes: 1024,
      }, user1)
      await db.togglePublicMediaRecord(ownPrivate.id, false)

      const otherPrivate = await db.createMediaRecord({
        filename: 'admin_private2.png',
        filepath: '/data/media/admin_private2.png',
        type: 'image',
        size_bytes: 1024,
      }, user2)
      await db.togglePublicMediaRecord(otherPrivate.id, false)

      const result = await db.getMediaRecords({ limit: 10, offset: 0, visibilityOwnerId: user1, role: 'admin' })
      const filenames = result.records.map(r => r.filename)
      
      expect(filenames).toContain('admin_private1.png')
      expect(filenames).toContain('admin_private2.png')
    })

    it('isPublic=true filter returns only public records', async () => {
      const user1 = testOwnerId1

      const privateRecord = await db.createMediaRecord({
        filename: 'filter_private.png',
        filepath: '/data/media/filter_private.png',
        type: 'image',
        size_bytes: 1024,
      }, user1)
      await db.togglePublicMediaRecord(privateRecord.id, false)

      const publicRecord1 = await db.createMediaRecord({
        filename: 'filter_public1.png',
        filepath: '/data/media/filter_public1.png',
        type: 'image',
        size_bytes: 1024,
      }, user1)
      await db.togglePublicMediaRecord(publicRecord1.id, true)

      const publicRecord2 = await db.createMediaRecord({
        filename: 'filter_public2.png',
        filepath: '/data/media/filter_public2.png',
        type: 'image',
        size_bytes: 1024,
      }, user1)
      await db.togglePublicMediaRecord(publicRecord2.id, true)

      const result = await db.getMediaRecords({ limit: 10, offset: 0, publicFilter: ['public', 'others-public'] })
      const filenames = result.records.map(r => r.filename)
      
      expect(filenames).toContain('filter_public1.png')
      expect(filenames).toContain('filter_public2.png')
      expect(filenames).not.toContain('filter_private.png')
      expect(result.records.length).toBe(2)
    })
  })
})