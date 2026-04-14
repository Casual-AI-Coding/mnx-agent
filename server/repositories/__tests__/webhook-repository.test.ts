import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebhookRepository } from '../webhook-repository'
import { DatabaseConnection } from '../../database/connection'

describe('WebhookRepository', () => {
  let mockDb: DatabaseConnection

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      transaction: vi.fn(async (fn) => {
        const txConnection = {
          query: mockDb.query,
          execute: mockDb.execute,
          isPostgres: mockDb.isPostgres,
        }
        return await fn(txConnection as unknown as DatabaseConnection)
      }),
      isPostgres: vi.fn().mockReturnValue(true),
    } as unknown as DatabaseConnection
  })

  describe('createConfig', () => {
    it('should create webhook config for postgres', async () => {
      const mockRow = {
        id: 'webhook-1',
        job_id: 'job-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: JSON.stringify(['on_success', 'on_failure']),
        headers: null,
        secret: null,
        is_active: true,
        owner_id: 'owner-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.createConfig({
        job_id: 'job-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['on_success', 'on_failure'],
      }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_configs'),
        expect.arrayContaining(['job-1', 'Test Webhook', 'https://example.com/webhook'])
      )
      expect(result).toBeDefined()
      expect(result.events).toEqual(['on_success', 'on_failure'])
    })

    it('should create webhook config for sqlite', async () => {
      mockDb.isPostgres = vi.fn().mockReturnValue(false)
      const mockRow = {
        id: 'webhook-1',
        job_id: null,
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: JSON.stringify(['on_start']),
        headers: null,
        secret: 'secret-key',
        is_active: 1,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.createConfig({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['on_start'],
        secret: 'secret-key',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
        expect.arrayContaining([1]) // SQLite uses 1 for true
      )
      expect(result.is_active).toBe(true)
    })

    it('should create webhook config with headers', async () => {
      const mockRow = {
        id: 'webhook-1',
        job_id: null,
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: JSON.stringify(['on_success']),
        headers: JSON.stringify({ 'X-Custom': 'value' }),
        secret: null,
        is_active: true,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.createConfig({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['on_success'],
        headers: { 'X-Custom': 'value' },
      })

      expect(result.headers).toEqual({ 'X-Custom': 'value' })
    })
  })

  describe('getConfigById', () => {
    it('should return webhook config by id', async () => {
      const mockRow = {
        id: 'webhook-1',
        job_id: 'job-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: JSON.stringify(['on_success']),
        headers: null,
        secret: null,
        is_active: true,
        owner_id: 'owner-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getConfigById('webhook-1', 'owner-1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('webhook-1')
    })

    it('should return null when not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getConfigById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getConfigsByJobId', () => {
    it('should return active webhooks for a job', async () => {
      const mockRows = [
        {
          id: 'webhook-1',
          job_id: 'job-1',
          name: 'Webhook 1',
          url: 'https://example.com/1',
          events: JSON.stringify(['on_success']),
          headers: null,
          secret: null,
          is_active: true,
          owner_id: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'webhook-2',
          job_id: 'job-1',
          name: 'Webhook 2',
          url: 'https://example.com/2',
          events: JSON.stringify(['on_failure']),
          headers: null,
          secret: null,
          is_active: true,
          owner_id: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getConfigsByJobId('job-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM webhook_configs WHERE job_id = $1 AND is_active = true',
        ['job-1']
      )
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no webhooks found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getConfigsByJobId('job-with-no-webhooks')

      expect(result).toHaveLength(0)
    })
  })

  describe('getConfigsByOwner', () => {
    it('should return webhooks for specific owner', async () => {
      const mockRows = [
        {
          id: 'webhook-1',
          job_id: null,
          name: 'Owner Webhook',
          url: 'https://example.com/webhook',
          events: JSON.stringify(['on_success']),
          headers: null,
          secret: null,
          is_active: true,
          owner_id: 'owner-1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getConfigsByOwner('owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM webhook_configs WHERE owner_id = $1 ORDER BY created_at DESC',
        ['owner-1']
      )
      expect(result).toHaveLength(1)
      expect(result[0].owner_id).toBe('owner-1')
    })
  })

  describe('getAllConfigs', () => {
    it('should return all webhooks without owner filter', async () => {
      const mockRows = [
        {
          id: 'webhook-1',
          job_id: null,
          name: 'Webhook 1',
          url: 'https://example.com/1',
          events: JSON.stringify(['on_success']),
          headers: null,
          secret: null,
          is_active: true,
          owner_id: 'owner-1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'webhook-2',
          job_id: null,
          name: 'Webhook 2',
          url: 'https://example.com/2',
          events: JSON.stringify(['on_failure']),
          headers: null,
          secret: null,
          is_active: true,
          owner_id: 'owner-2',
          created_at: '2026-01-02T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getAllConfigs()

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM webhook_configs ORDER BY created_at DESC'
      )
      expect(result).toHaveLength(2)
    })

    it('should return webhooks for specific owner', async () => {
      const mockRows = [
        {
          id: 'webhook-1',
          job_id: null,
          name: 'Owner Webhook',
          url: 'https://example.com/webhook',
          events: JSON.stringify(['on_success']),
          headers: null,
          secret: null,
          is_active: true,
          owner_id: 'owner-1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getAllConfigs('owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM webhook_configs WHERE owner_id = $1 ORDER BY created_at DESC',
        ['owner-1']
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('updateConfig', () => {
    const existingWebhook = {
      id: 'webhook-1',
      job_id: 'job-1',
      name: 'Original Name',
      url: 'https://example.com/webhook',
      events: JSON.stringify(['on_success']),
      headers: null,
      secret: null,
      is_active: true,
      owner_id: 'owner-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    it('should update name field', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingWebhook] as any)
        .mockResolvedValueOnce([{ ...existingWebhook, name: 'New Name' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.updateConfig('webhook-1', { name: 'New Name' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('name = $1'),
        expect.arrayContaining(['New Name'])
      )
      expect(result?.name).toBe('New Name')
    })

    it('should update url field', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingWebhook] as any)
        .mockResolvedValueOnce([{ ...existingWebhook, url: 'https://newurl.com/webhook' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WebhookRepository(mockDb)
      await repo.updateConfig('webhook-1', { url: 'https://newurl.com/webhook' }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('url = $1'),
        expect.arrayContaining(['https://newurl.com/webhook'])
      )
    })

    it('should update events field (JSON stringify)', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingWebhook] as any)
        .mockResolvedValueOnce([{ ...existingWebhook, events: JSON.stringify(['on_success', 'on_failure']) }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WebhookRepository(mockDb)
      await repo.updateConfig('webhook-1', { events: ['on_success', 'on_failure'] }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('events = $1'),
        expect.arrayContaining([JSON.stringify(['on_success', 'on_failure'])])
      )
    })

    it('should update headers field', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingWebhook] as any)
        .mockResolvedValueOnce([{ ...existingWebhook, headers: JSON.stringify({ 'X-Auth': 'token' }) }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WebhookRepository(mockDb)
      await repo.updateConfig('webhook-1', { headers: { 'X-Auth': 'token' } }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('headers = $1'),
        expect.arrayContaining([JSON.stringify({ 'X-Auth': 'token' })])
      )
    })

    it('should update is_active field for postgres', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingWebhook] as any)
        .mockResolvedValueOnce([{ ...existingWebhook, is_active: false }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WebhookRepository(mockDb)
      await repo.updateConfig('webhook-1', { is_active: false }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('is_active = $'),
        expect.arrayContaining([false])
      )
    })

    it('should update is_active field for sqlite', async () => {
      mockDb.isPostgres = vi.fn().mockReturnValue(false)
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([{ ...existingWebhook, is_active: 1 }] as any)
        .mockResolvedValueOnce([{ ...existingWebhook, is_active: 0 }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WebhookRepository(mockDb)
      await repo.updateConfig('webhook-1', { is_active: false }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('is_active = $'),
        expect.arrayContaining([0])
      )
    })

    it('should return null when webhook not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.updateConfig('non-existent', { name: 'New Name' })

      expect(result).toBeNull()
      expect(mockDb.execute).not.toHaveBeenCalled()
    })

    it('should return existing webhook when no fields to update', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([existingWebhook] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.updateConfig('webhook-1', {}, 'owner-1')

      expect(mockDb.execute).not.toHaveBeenCalled()
      expect(result?.name).toBe('Original Name')
    })

    it('should update multiple fields at once', async () => {
      vi.mocked(mockDb.query)
        .mockResolvedValueOnce([existingWebhook] as any)
        .mockResolvedValueOnce([{ ...existingWebhook, name: 'New Name', url: 'https://newurl.com/webhook' }] as any)

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WebhookRepository(mockDb)
      await repo.updateConfig('webhook-1', {
        name: 'New Name',
        url: 'https://newurl.com/webhook',
      }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('name = $1'),
        expect.arrayContaining(['New Name', 'https://newurl.com/webhook'])
      )
    })
  })

  describe('deleteConfig', () => {
    it('should delete webhook by id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.deleteConfig('webhook-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM webhook_configs WHERE id = $1',
        ['webhook-1']
      )
      expect(result).toBe(true)
    })

    it('should delete webhook with owner filter', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.deleteConfig('webhook-1', 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM webhook_configs WHERE id = $1 AND owner_id = $2',
        ['webhook-1', 'owner-1']
      )
      expect(result).toBe(true)
    })

    it('should return false when webhook not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 0 } as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.deleteConfig('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('createDelivery', () => {
    it('should create webhook delivery for postgres', async () => {
      const mockRow = {
        id: 'delivery-1',
        webhook_id: 'webhook-1',
        execution_log_id: 'log-1',
        event: 'on_success',
        payload: JSON.stringify({ status: 'completed' }),
        response_status: 200,
        response_body: 'OK',
        error_message: null,
        owner_id: 'owner-1',
        delivered_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.createDelivery({
        webhook_id: 'webhook-1',
        execution_log_id: 'log-1',
        event: 'on_success',
        payload: { status: 'completed' },
        response_status: 200,
        response_body: 'OK',
      }, 'owner-1')

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_deliveries'),
        expect.arrayContaining(['webhook-1', 'log-1', 'on_success'])
      )
      expect(result).toBeDefined()
      expect(result.payload).toEqual({ status: 'completed' })
    })

    it('should create webhook delivery for sqlite', async () => {
      mockDb.isPostgres = vi.fn().mockReturnValue(false)
      const mockRow = {
        id: 'delivery-1',
        webhook_id: 'webhook-1',
        execution_log_id: null,
        event: 'on_failure',
        payload: JSON.stringify({ error: 'timeout' }),
        response_status: null,
        response_body: null,
        error_message: 'Connection timeout',
        owner_id: null,
        delivered_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.createDelivery({
        webhook_id: 'webhook-1',
        event: 'on_failure',
        payload: { error: 'timeout' },
        error_message: 'Connection timeout',
      })

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
        expect.any(Array)
      )
      expect(result.event).toBe('on_failure')
    })

    it('should handle string payload', async () => {
      const mockRow = {
        id: 'delivery-1',
        webhook_id: 'webhook-1',
        execution_log_id: null,
        event: 'on_success',
        payload: '{"raw":"string"}',
        response_status: null,
        response_body: null,
        error_message: null,
        owner_id: null,
        delivered_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.execute).mockResolvedValueOnce({ changes: 1 } as any)
      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.createDelivery({
        webhook_id: 'webhook-1',
        event: 'on_success',
        payload: '{"raw":"string"}',
      })

      expect(result.payload).toEqual({ raw: 'string' })
    })
  })

  describe('getDeliveryById', () => {
    it('should return delivery by id', async () => {
      const mockRow = {
        id: 'delivery-1',
        webhook_id: 'webhook-1',
        execution_log_id: null,
        event: 'on_success',
        payload: JSON.stringify({ status: 'ok' }),
        response_status: 200,
        response_body: 'OK',
        error_message: null,
        owner_id: null,
        delivered_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getDeliveryById('delivery-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM webhook_deliveries WHERE id = $1',
        ['delivery-1']
      )
      expect(result).toBeDefined()
      expect(result?.id).toBe('delivery-1')
    })

    it('should return null when not found', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getDeliveryById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getDeliveriesByWebhook', () => {
    it('should return deliveries for webhook without owner filter', async () => {
      const mockRows = [
        {
          id: 'delivery-1',
          webhook_id: 'webhook-1',
          execution_log_id: null,
          event: 'on_success',
          payload: JSON.stringify({}),
          response_status: 200,
          response_body: 'OK',
          error_message: null,
          owner_id: null,
          delivered_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getDeliveriesByWebhook('webhook-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY delivered_at DESC LIMIT $2',
        ['webhook-1', 50]
      )
      expect(result).toHaveLength(1)
    })

    it('should return deliveries with owner filter', async () => {
      const mockRows = [
        {
          id: 'delivery-1',
          webhook_id: 'webhook-1',
          execution_log_id: null,
          event: 'on_success',
          payload: JSON.stringify({}),
          response_status: 200,
          response_body: 'OK',
          error_message: null,
          owner_id: 'owner-1',
          delivered_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getDeliveriesByWebhook('webhook-1', 100, 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM webhook_deliveries WHERE webhook_id = $1 AND owner_id = $2 ORDER BY delivered_at DESC LIMIT $3',
        ['webhook-1', 'owner-1', 100]
      )
      expect(result).toHaveLength(1)
    })

    it('should use custom limit', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new WebhookRepository(mockDb)
      await repo.getDeliveriesByWebhook('webhook-1', 10)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10])
      )
    })

    it('should return empty array when no deliveries', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getDeliveriesByWebhook('webhook-with-no-deliveries')

      expect(result).toHaveLength(0)
    })
  })

  describe('getDeliveriesByExecutionLog', () => {
    it('should return deliveries for execution log', async () => {
      const mockRows = [
        {
          id: 'delivery-1',
          webhook_id: 'webhook-1',
          execution_log_id: 'log-1',
          event: 'on_success',
          payload: JSON.stringify({}),
          response_status: 200,
          response_body: 'OK',
          error_message: null,
          owner_id: null,
          delivered_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getDeliveriesByExecutionLog('log-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM webhook_deliveries WHERE execution_log_id = $1 ORDER BY delivered_at DESC',
        ['log-1']
      )
      expect(result).toHaveLength(1)
    })

    it('should return deliveries with owner filter', async () => {
      const mockRows = [
        {
          id: 'delivery-1',
          webhook_id: 'webhook-1',
          execution_log_id: 'log-1',
          event: 'on_success',
          payload: JSON.stringify({}),
          response_status: 200,
          response_body: 'OK',
          error_message: null,
          owner_id: 'owner-1',
          delivered_at: '2026-01-01T00:00:00Z',
        },
      ]

      vi.mocked(mockDb.query).mockResolvedValueOnce(mockRows as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getDeliveriesByExecutionLog('log-1', 'owner-1')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM webhook_deliveries WHERE execution_log_id = $1 AND owner_id = $2 ORDER BY delivered_at DESC',
        ['log-1', 'owner-1']
      )
      expect(result).toHaveLength(1)
    })

    it('should return empty array when no deliveries', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce([] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getDeliveriesByExecutionLog('log-with-no-deliveries')

      expect(result).toHaveLength(0)
    })
  })

  describe('rowToWebhookConfig parsing', () => {
    it('should parse events from JSON string', async () => {
      const mockRow = {
        id: 'webhook-1',
        job_id: null,
        name: 'Test',
        url: 'https://example.com',
        events: JSON.stringify(['on_success', 'on_failure']),
        headers: null,
        secret: null,
        is_active: true,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getConfigById('webhook-1')

      expect(result?.events).toEqual(['on_success', 'on_failure'])
    })

    it('should parse headers from JSON string', async () => {
      const mockRow = {
        id: 'webhook-1',
        job_id: null,
        name: 'Test',
        url: 'https://example.com',
        events: JSON.stringify(['on_success']),
        headers: JSON.stringify({ 'X-API-Key': 'secret' }),
        secret: null,
        is_active: true,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getConfigById('webhook-1')

      expect(result?.headers).toEqual({ 'X-API-Key': 'secret' })
    })

    it('should convert is_active from number (sqlite)', async () => {
      const mockRow = {
        id: 'webhook-1',
        job_id: null,
        name: 'Test',
        url: 'https://example.com',
        events: JSON.stringify(['on_success']),
        headers: null,
        secret: null,
        is_active: 1,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getConfigById('webhook-1')

      expect(result?.is_active).toBe(true)
    })

    it('should convert is_active from 0 to false', async () => {
      const mockRow = {
        id: 'webhook-1',
        job_id: null,
        name: 'Test',
        url: 'https://example.com',
        events: JSON.stringify(['on_success']),
        headers: null,
        secret: null,
        is_active: 0,
        owner_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getConfigById('webhook-1')

      expect(result?.is_active).toBe(false)
    })
  })

  describe('rowToWebhookDelivery parsing', () => {
    it('should parse payload from JSON string', async () => {
      const mockRow = {
        id: 'delivery-1',
        webhook_id: 'webhook-1',
        execution_log_id: null,
        event: 'on_success',
        payload: JSON.stringify({ data: 'test' }),
        response_status: 200,
        response_body: 'OK',
        error_message: null,
        owner_id: null,
        delivered_at: '2026-01-01T00:00:00Z',
      }

      vi.mocked(mockDb.query).mockResolvedValueOnce([mockRow] as any)

      const repo = new WebhookRepository(mockDb)
      const result = await repo.getDeliveryById('delivery-1')

      expect(result?.payload).toEqual({ data: 'test' })
    })
  })
})