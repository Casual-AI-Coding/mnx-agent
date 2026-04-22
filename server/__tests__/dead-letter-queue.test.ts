import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { DatabaseService } from '../database/service-async.js'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from './test-helpers.js'
import type {
  DeadLetterQueueItem,
  CreateDeadLetterQueueItem,
  UpdateDeadLetterQueueItem,
} from '../database/types.js'
import { v4 as uuidv4 } from 'uuid'

describe('Dead Letter Queue CRUD Operations', () => {
  let db: DatabaseService
  let testUser1Id: string
  let testUser2Id: string
  let fileMarker: string

  beforeAll(async () => {
    await setupTestDatabase()
    db = new DatabaseService(getConnection())
    fileMarker = getTestFileMarker(import.meta.url)
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM dead_letter_queue')
    await conn.execute('DELETE FROM task_queue')

    testUser1Id = uuidv4()
    testUser2Id = uuidv4()

    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (id) DO NOTHING`,
      [testUser1Id, `test-user-1-${Date.now()}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (id) DO NOTHING`,
      [testUser2Id, `test-user-2-${Date.now()}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
  })

  afterEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM task_queue WHERE owner_id IN ($1, $2)', [testUser1Id, testUser2Id])
    await conn.execute('DELETE FROM dead_letter_queue WHERE owner_id = $1 OR owner_id = $2 OR owner_id = $3 OR owner_id IS NULL', [fileMarker, testUser1Id, testUser2Id])
    await conn.execute('DELETE FROM users WHERE id IN ($1, $2)', [testUser1Id, testUser2Id])
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  describe('createDeadLetterQueueItem', () => {
    it('should create a DLQ item with all required fields', async () => {
      const data: CreateDeadLetterQueueItem = {
        task_type: 'image_generation',
        payload: { prompt: 'test image', model: 'image-01' },
        error_message: 'API rate limit exceeded',
        retry_count: 3,
        max_retries: 5,
      }

      const item = await db.createDeadLetterQueueItem(data, testUser1Id)

      expect(item.id).toBeDefined()
      expect(item.task_type).toBe('image_generation')
      expect(item.payload).toEqual({ prompt: 'test image', model: 'image-01' })
      expect(item.error_message).toBe('API rate limit exceeded')
      expect(item.retry_count).toBe(3)
      expect(item.max_retries).toBe(5)
      expect(item.owner_id).toBe(testUser1Id)
      expect(item.failed_at).toBeDefined()
      expect(item.resolved_at).toBeNull()
      expect(item.resolution).toBeNull()
    })

    it('should create DLQ item with original_task_id', async () => {
      const data: CreateDeadLetterQueueItem = {
        original_task_id: 'task-abc',
        task_type: 'voice_async',
        payload: { text: 'Hello world' },
      }

      const item = await db.createDeadLetterQueueItem(data)

      expect(item.original_task_id).toBe('task-abc')
      expect(item.job_id).toBeNull()
      expect(item.owner_id).toBeNull()
    })

    it('should create DLQ item with default retry_count and max_retries', async () => {
      const data: CreateDeadLetterQueueItem = {
        task_type: 'text_generation',
        payload: { model: 'abab6.5s-chat' },
      }

      const item = await db.createDeadLetterQueueItem(data)

      expect(item.retry_count).toBe(0)
      expect(item.max_retries).toBe(3)
    })

    it('should generate unique IDs for each DLQ item', async () => {
      const item1 = await db.createDeadLetterQueueItem({
        task_type: 'task1',
        payload: {},
      })
      const item2 = await db.createDeadLetterQueueItem({
        task_type: 'task2',
        payload: {},
      })

      expect(item1.id).not.toBe(item2.id)
    })
  })

  describe('getDeadLetterQueueItems', () => {
    it('should get all unresolved DLQ items', async () => {
      await db.createDeadLetterQueueItem({
        task_type: 'task1',
        payload: {},
      })
      await db.createDeadLetterQueueItem({
        task_type: 'task2',
        payload: {},
      })

      const items = await db.getDeadLetterQueueItems()

      expect(items.length).toBe(2)
    })

    it('should filter DLQ items by owner_id', async () => {
      await db.createDeadLetterQueueItem(
        { task_type: 'user1-task', payload: {} },
        testUser1Id
      )
      await db.createDeadLetterQueueItem(
        { task_type: 'user2-task', payload: {} },
        testUser2Id
      )
      await db.createDeadLetterQueueItem(
        { task_type: 'public-task', payload: {} }
      )

      const user1Items = await db.getDeadLetterQueueItems(testUser1Id)
      const user2Items = await db.getDeadLetterQueueItems(testUser2Id)
      const allItems = await db.getDeadLetterQueueItems()

      expect(user1Items.length).toBe(1)
      expect(user1Items[0].task_type).toBe('user1-task')

      expect(user2Items.length).toBe(1)
      expect(user2Items[0].task_type).toBe('user2-task')

      expect(allItems.length).toBe(3)
    })

    it('should exclude resolved items from results', async () => {
      const unresolved = await db.createDeadLetterQueueItem({
        task_type: 'unresolved-task',
        payload: {},
      })
      const resolved = await db.createDeadLetterQueueItem({
        task_type: 'resolved-task',
        payload: {},
      })

      await db.updateDeadLetterQueueItem(resolved.id, {
        resolved_at: new Date().toISOString(),
        resolution: 'manual',
      })

      const items = await db.getDeadLetterQueueItems()

      expect(items.length).toBe(1)
      expect(items[0].id).toBe(unresolved.id)
    })

    it('should limit results', async () => {
      for (let i = 0; i < 15; i++) {
        await db.createDeadLetterQueueItem({
          task_type: `task-${i}`,
          payload: {},
        })
      }

      const items = await db.getDeadLetterQueueItems(undefined, 5)

      expect(items.length).toBe(5)
    })

    it('should return items sorted by failed_at DESC', async () => {
      const first = await db.createDeadLetterQueueItem({
        task_type: 'first',
        payload: {},
      })
      await new Promise(r => setTimeout(r, 10))
      const second = await db.createDeadLetterQueueItem({
        task_type: 'second',
        payload: {},
      })
      await new Promise(r => setTimeout(r, 10))
      const third = await db.createDeadLetterQueueItem({
        task_type: 'third',
        payload: {},
      })

      const items = await db.getDeadLetterQueueItems()

      expect(items[0].id).toBe(third.id)
      expect(items[1].id).toBe(second.id)
      expect(items[2].id).toBe(first.id)
    })
  })

  describe('getDeadLetterQueueItemById', () => {
    it('should get DLQ item by ID', async () => {
      const created = await db.createDeadLetterQueueItem({
        task_type: 'test-task',
        payload: { key: 'value' },
      })

      const fetched = await db.getDeadLetterQueueItemById(created.id)

      expect(fetched).toBeDefined()
      expect(fetched?.id).toBe(created.id)
      expect(fetched?.task_type).toBe('test-task')
      expect(fetched?.payload).toEqual({ key: 'value' })
    })

    it('should return null for non-existent ID', async () => {
      const fetched = await db.getDeadLetterQueueItemById('non-existent-id')

      expect(fetched).toBeNull()
    })

    it('should enforce owner_id isolation', async () => {
      const item = await db.createDeadLetterQueueItem(
        { task_type: 'owner-task', payload: {} },
        testUser1Id
      )

      const fetchedByOwner = await db.getDeadLetterQueueItemById(item.id, testUser1Id)
      expect(fetchedByOwner).toBeDefined()
      expect(fetchedByOwner?.id).toBe(item.id)

      const fetchedByOther = await db.getDeadLetterQueueItemById(item.id, testUser2Id)
      expect(fetchedByOther).toBeNull()

      const fetchedByAdmin = await db.getDeadLetterQueueItemById(item.id)
      expect(fetchedByAdmin).toBeDefined()
    })
  })

  describe('updateDeadLetterQueueItem', () => {
    it('should update DLQ item resolution status', async () => {
      const item = await db.createDeadLetterQueueItem({
        task_type: 'test',
        payload: {},
      })

      const updated = await db.updateDeadLetterQueueItem(item.id, {
        resolved_at: new Date().toISOString(),
        resolution: 'retry_success',
      })

      expect(updated?.resolved_at).toBeDefined()
      expect(updated?.resolution).toBe('retry_success')
    })

    it('should update retry_count', async () => {
      const item = await db.createDeadLetterQueueItem({
        task_type: 'test',
        payload: {},
        retry_count: 0,
      })

      const updated = await db.updateDeadLetterQueueItem(item.id, {
        retry_count: 1,
      })

      expect(updated?.retry_count).toBe(1)
    })

    it('should return null for non-existent item', async () => {
      const result = await db.updateDeadLetterQueueItem('non-existent', {
        resolution: 'manual',
      })

      expect(result).toBeNull()
    })

    it('should enforce owner_id isolation on update', async () => {
      const item = await db.createDeadLetterQueueItem(
        { task_type: 'owner-task', payload: {} },
        testUser1Id
      )

      const updateByOther = await db.updateDeadLetterQueueItem(
        item.id,
        { resolution: 'hacked' },
        testUser2Id
      )
      expect(updateByOther).toBeNull()

      const updateByOwner = await db.updateDeadLetterQueueItem(
        item.id,
        { resolution: 'manual' },
        testUser1Id
      )
      expect(updateByOwner?.resolution).toBe('manual')
    })
  })

  describe('retryDeadLetterQueueItem', () => {
    it('should retry DLQ item by creating new task and marking original as resolved', async () => {
      const dlqItem = await db.createDeadLetterQueueItem(
        {
          original_task_id: 'original-task-123',
          task_type: 'image_generation',
          payload: { prompt: 'test image' },
          retry_count: 3,
        },
        testUser1Id
      )

      const newTaskId = await db.retryDeadLetterQueueItem(dlqItem.id, testUser1Id)

      expect(newTaskId).toBeDefined()

      const resolvedItem = await db.getDeadLetterQueueItemById(dlqItem.id)
      expect(resolvedItem?.resolved_at).toBeDefined()
      expect(resolvedItem?.resolution).toBe('retried')

      const newTask = await db.getTaskById(newTaskId)
      expect(newTask).toBeDefined()
      expect(newTask?.task_type).toBe('image_generation')
      expect(newTask?.owner_id).toBe(testUser1Id)
    })

    it('should throw error when retrying non-existent item', async () => {
      await expect(
        db.retryDeadLetterQueueItem('non-existent', testUser1Id)
      ).rejects.toThrow()
    })

    it('should enforce owner_id isolation on retry', async () => {
      const dlqItem = await db.createDeadLetterQueueItem(
        { task_type: 'test', payload: {} },
        testUser1Id
      )

      await expect(
        db.retryDeadLetterQueueItem(dlqItem.id, testUser2Id)
      ).rejects.toThrow()

      const unchanged = await db.getDeadLetterQueueItemById(dlqItem.id)
      expect(unchanged?.resolved_at).toBeNull()
    })
  })

  describe('Owner Isolation', () => {
    it('should strictly isolate DLQ items between users', async () => {
      await db.createDeadLetterQueueItem(
        { task_type: 'user1-item', payload: { owner: testUser1Id } },
        testUser1Id
      )
      await db.createDeadLetterQueueItem(
        { task_type: 'user2-item', payload: { owner: testUser2Id } },
        testUser2Id
      )

      const user1Items = await db.getDeadLetterQueueItems(testUser1Id)
      expect(user1Items.length).toBe(1)
      expect(user1Items[0].task_type).toBe('user1-item')

      const user2Items = await db.getDeadLetterQueueItems(testUser2Id)
      expect(user2Items.length).toBe(1)
      expect(user2Items[0].task_type).toBe('user2-item')

      const allItems = await db.getDeadLetterQueueItems()
      expect(allItems.length).toBe(2)
    })

    it('should prevent cross-user updates', async () => {
      const item = await db.createDeadLetterQueueItem(
        { task_type: 'protected', payload: {} },
        testUser1Id
      )

      const result = await db.updateDeadLetterQueueItem(
        item.id,
        { resolution: 'malicious' },
        testUser2Id
      )

      expect(result).toBeNull()

      const unchanged = await db.getDeadLetterQueueItemById(item.id, testUser1Id)
      expect(unchanged?.resolution).toBeNull()
    })
  })
})
