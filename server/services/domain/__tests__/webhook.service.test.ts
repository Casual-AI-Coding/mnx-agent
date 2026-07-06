import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebhookService } from '../webhook.service.js'
import type { WebhookRepository } from '../../../repositories/webhook-repository.js'
import type {
  WebhookConfig,
  WebhookDelivery,
  CreateWebhookConfig,
  UpdateWebhookConfig,
  CreateWebhookDelivery,
  WebhookEvent
} from '../../../database/types.js'

describe('WebhookService', () => {
  let service: WebhookService
  let mockRepo: {
    getAllConfigs: ReturnType<typeof vi.fn>
    getConfigById: ReturnType<typeof vi.fn>
    getConfigsByJobId: ReturnType<typeof vi.fn>
    createConfig: ReturnType<typeof vi.fn>
    updateConfig: ReturnType<typeof vi.fn>
    deleteConfig: ReturnType<typeof vi.fn>
    getDeliveriesByWebhook: ReturnType<typeof vi.fn>
    createDelivery: ReturnType<typeof vi.fn>
  }

  const mockWebhookConfig: WebhookConfig = {
    id: 'webhook-1',
    job_id: 'job-1',
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    events: ['on_start', 'on_success'] as WebhookEvent[],
    headers: { 'X-Custom': 'value' },
    secret: 'test-secret',
    is_active: true,
    owner_id: 'owner-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockWebhookDelivery: WebhookDelivery = {
    id: 'delivery-1',
    webhook_id: 'webhook-1',
    execution_log_id: null,
    event: 'on_success' as WebhookEvent,
    payload: { test: 'data' },
    response_status: 200,
    response_body: 'OK',
    error_message: null,
    delivered_at: '2024-01-01T00:00:00Z',
    owner_id: 'owner-1'
  }

  beforeEach(() => {
    mockRepo = {
      getAllConfigs: vi.fn(),
      getConfigById: vi.fn(),
      getConfigsByJobId: vi.fn(),
      createConfig: vi.fn(),
      updateConfig: vi.fn(),
      deleteConfig: vi.fn(),
      getDeliveriesByWebhook: vi.fn(),
      createDelivery: vi.fn()
    }

    service = new WebhookService(mockRepo as unknown as WebhookRepository)
  })

  describe('getAll', () => {
    it('should return all webhook configs without owner filter', async () => {
      const configs = [mockWebhookConfig, { ...mockWebhookConfig, id: 'webhook-2' }]
      mockRepo.getAllConfigs.mockResolvedValue(configs)

      const result = await service.getAll()

      expect(mockRepo.getAllConfigs).toHaveBeenCalledWith(undefined)
      expect(result).toEqual(configs)
      expect(result).toHaveLength(2)
    })

    it('should return webhook configs filtered by owner', async () => {
      const configs = [mockWebhookConfig]
      mockRepo.getAllConfigs.mockResolvedValue(configs)

      const result = await service.getAll('owner-1')

      expect(mockRepo.getAllConfigs).toHaveBeenCalledWith('owner-1')
      expect(result).toEqual(configs)
    })

    it('should return empty array when no configs exist', async () => {
      mockRepo.getAllConfigs.mockResolvedValue([])

      const result = await service.getAll()

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should propagate database errors', async () => {
      mockRepo.getAllConfigs.mockRejectedValue(new Error('Database error'))

      await expect(service.getAll()).rejects.toThrow('Database error')
    })

    it('should propagate database errors with owner filter', async () => {
      mockRepo.getAllConfigs.mockRejectedValue(new Error('Query failed'))

      await expect(service.getAll('owner-1')).rejects.toThrow('Query failed')
    })
  })

  describe('getById', () => {
    it('should return webhook config by ID', async () => {
      mockRepo.getConfigById.mockResolvedValue(mockWebhookConfig)

      const result = await service.getById('webhook-1')

      expect(mockRepo.getConfigById).toHaveBeenCalledWith('webhook-1', undefined)
      expect(result).toEqual(mockWebhookConfig)
    })

    it('should return webhook config by ID with owner filter', async () => {
      mockRepo.getConfigById.mockResolvedValue(mockWebhookConfig)

      const result = await service.getById('webhook-1', 'owner-1')

      expect(mockRepo.getConfigById).toHaveBeenCalledWith('webhook-1', 'owner-1')
      expect(result).toEqual(mockWebhookConfig)
    })

    it('should return null when webhook not found', async () => {
      mockRepo.getConfigById.mockResolvedValue(null)

      const result = await service.getById('nonexistent')

      expect(mockRepo.getConfigById).toHaveBeenCalledWith('nonexistent', undefined)
      expect(result).toBeNull()
    })

    it('should return null when webhook belongs to different owner', async () => {
      mockRepo.getConfigById.mockResolvedValue(null)

      const result = await service.getById('webhook-1', 'different-owner')

      expect(result).toBeNull()
    })

    it('should propagate database errors', async () => {
      mockRepo.getConfigById.mockRejectedValue(new Error('Query failed'))

      await expect(service.getById('webhook-1')).rejects.toThrow('Query failed')
    })
  })

  describe('getByJobId', () => {
    it('should return webhook configs by job ID', async () => {
      const configs = [mockWebhookConfig]
      mockRepo.getConfigsByJobId.mockResolvedValue(configs)

      const result = await service.getByJobId('job-1')

      expect(mockRepo.getConfigsByJobId).toHaveBeenCalledWith('job-1', undefined)
      expect(result).toEqual(configs)
    })

    it('should return webhook configs by job ID with owner filter', async () => {
      const configs = [mockWebhookConfig]
      mockRepo.getConfigsByJobId.mockResolvedValue(configs)

      const result = await service.getByJobId('job-1', 'owner-1')

      expect(mockRepo.getConfigsByJobId).toHaveBeenCalledWith('job-1', 'owner-1')
      expect(result).toEqual(configs)
    })

    it('should return empty array when no webhooks for job', async () => {
      mockRepo.getConfigsByJobId.mockResolvedValue([])

      const result = await service.getByJobId('job-with-no-webhooks')

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should return multiple webhooks for same job', async () => {
      const configs = [
        mockWebhookConfig,
        { ...mockWebhookConfig, id: 'webhook-2', url: 'https://example2.com/webhook' }
      ]
      mockRepo.getConfigsByJobId.mockResolvedValue(configs)

      const result = await service.getByJobId('job-1')

      expect(result).toHaveLength(2)
    })

    it('should propagate database errors', async () => {
      mockRepo.getConfigsByJobId.mockRejectedValue(new Error('Query failed'))

      await expect(service.getByJobId('job-1')).rejects.toThrow('Query failed')
    })
  })

  describe('create', () => {
    it('should create a new webhook config', async () => {
      const createData: CreateWebhookConfig = {
        job_id: 'job-1',
        name: 'New Webhook',
        url: 'https://new.example.com/webhook',
        events: ['on_success'] as WebhookEvent[]
      }
      const newConfig = { ...mockWebhookConfig, ...createData, id: 'webhook-new' }
      mockRepo.createConfig.mockResolvedValue(newConfig)

      const result = await service.create(createData)

      expect(mockRepo.createConfig).toHaveBeenCalledWith(createData, undefined)
      expect(result).toEqual(newConfig)
    })

    it('should create a new webhook config with owner', async () => {
      const createData: CreateWebhookConfig = {
        job_id: 'job-1',
        name: 'New Webhook',
        url: 'https://new.example.com/webhook',
        events: ['on_success'] as WebhookEvent[]
      }
      const newConfig = { ...mockWebhookConfig, ...createData, id: 'webhook-new', owner_id: 'owner-2' }
      mockRepo.createConfig.mockResolvedValue(newConfig)

      const result = await service.create(createData, 'owner-2')

      expect(mockRepo.createConfig).toHaveBeenCalledWith(createData, 'owner-2')
      expect(result.owner_id).toBe('owner-2')
    })

    it('should create webhook with all optional fields', async () => {
      const createData: CreateWebhookConfig = {
        job_id: 'job-1',
        name: 'Full Webhook',
        url: 'https://full.example.com/webhook',
        events: ['on_start', 'on_success', 'on_failure'] as WebhookEvent[],
        headers: { 'Authorization': 'Bearer token' },
        secret: 'my-secret',
        is_active: true
      }
      mockRepo.createConfig.mockResolvedValue({ ...mockWebhookConfig, ...createData })

      const result = await service.create(createData)

      expect(result.headers).toEqual({ 'Authorization': 'Bearer token' })
      expect(result.secret).toBe('my-secret')
      expect(result.is_active).toBe(true)
    })

    it('should create webhook without job_id', async () => {
      const createData: CreateWebhookConfig = {
        job_id: null,
        name: 'Global Webhook',
        url: 'https://global.example.com/webhook',
        events: ['on_success'] as WebhookEvent[]
      }
      mockRepo.createConfig.mockResolvedValue({ ...mockWebhookConfig, ...createData })

      const result = await service.create(createData)

      expect(result.job_id).toBeNull()
    })

    it('should propagate database errors', async () => {
      const createData: CreateWebhookConfig = {
        name: 'Test',
        url: 'https://test.com/webhook',
        events: ['on_success'] as WebhookEvent[]
      }
      mockRepo.createConfig.mockRejectedValue(new Error('Insert failed'))

      await expect(service.create(createData)).rejects.toThrow('Insert failed')
    })
  })

  describe('update', () => {
    it('should update an existing webhook config', async () => {
      const updateData: UpdateWebhookConfig = {
        name: 'Updated Webhook',
        url: 'https://updated.example.com/webhook'
      }
      const updatedConfig = { ...mockWebhookConfig, ...updateData }
      mockRepo.updateConfig.mockResolvedValue(updatedConfig)

      const result = await service.update('webhook-1', updateData)

      expect(mockRepo.updateConfig).toHaveBeenCalledWith('webhook-1', updateData, undefined)
      expect(result.name).toBe('Updated Webhook')
      expect(result.url).toBe('https://updated.example.com/webhook')
    })

    it('should update webhook config with owner filter', async () => {
      const updateData: UpdateWebhookConfig = { name: 'Updated' }
      mockRepo.updateConfig.mockResolvedValue({ ...mockWebhookConfig, ...updateData })

      await service.update('webhook-1', updateData, 'owner-1')

      expect(mockRepo.updateConfig).toHaveBeenCalledWith('webhook-1', updateData, 'owner-1')
    })

    it('should throw error when webhook not found', async () => {
      mockRepo.updateConfig.mockResolvedValue(null)

      await expect(service.update('nonexistent', { name: 'Updated' })).rejects.toThrow(
        'WebhookConfig not found: nonexistent'
      )
    })

    it('should throw error when webhook belongs to different owner', async () => {
      mockRepo.updateConfig.mockResolvedValue(null)

      await expect(service.update('webhook-1', { name: 'Updated' }, 'different-owner')).rejects.toThrow(
        'WebhookConfig not found: webhook-1'
      )
    })

    it('should update single field', async () => {
      mockRepo.updateConfig.mockResolvedValue({ ...mockWebhookConfig, is_active: false })

      const result = await service.update('webhook-1', { is_active: false })

      expect(result.is_active).toBe(false)
    })

    it('should update events array', async () => {
      const newEvents = ['on_failure'] as WebhookEvent[]
      mockRepo.updateConfig.mockResolvedValue({ ...mockWebhookConfig, events: newEvents })

      const result = await service.update('webhook-1', { events: newEvents })

      expect(result.events).toEqual(newEvents)
    })

    it('should propagate database errors', async () => {
      mockRepo.updateConfig.mockRejectedValue(new Error('Update failed'))

      await expect(service.update('webhook-1', { name: 'Updated' })).rejects.toThrow('Update failed')
    })
  })

  describe('delete', () => {
    it('should delete an existing webhook config', async () => {
      mockRepo.deleteConfig.mockResolvedValue(true)

      await service.delete('webhook-1')

      expect(mockRepo.deleteConfig).toHaveBeenCalledWith('webhook-1', undefined)
    })

    it('should delete webhook config with owner filter', async () => {
      mockRepo.deleteConfig.mockResolvedValue(true)

      await service.delete('webhook-1', 'owner-1')

      expect(mockRepo.deleteConfig).toHaveBeenCalledWith('webhook-1', 'owner-1')
    })

    it('should throw error when webhook not found', async () => {
      mockRepo.deleteConfig.mockResolvedValue(false)

      await expect(service.delete('nonexistent')).rejects.toThrow('WebhookConfig not found: nonexistent')
    })

    it('should throw error when webhook belongs to different owner', async () => {
      mockRepo.deleteConfig.mockResolvedValue(false)

      await expect(service.delete('webhook-1', 'different-owner')).rejects.toThrow(
        'WebhookConfig not found: webhook-1'
      )
    })

    it('should propagate database errors', async () => {
      mockRepo.deleteConfig.mockRejectedValue(new Error('Delete failed'))

      await expect(service.delete('webhook-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('getDeliveries', () => {
    it('should return deliveries for webhook', async () => {
      const deliveries = [mockWebhookDelivery]
      mockRepo.getDeliveriesByWebhook.mockResolvedValue(deliveries)

      const result = await service.getDeliveries('webhook-1')

      expect(mockRepo.getDeliveriesByWebhook).toHaveBeenCalledWith('webhook-1', 50, undefined)
      expect(result).toEqual(deliveries)
    })

    it('should return deliveries with custom limit', async () => {
      const deliveries = [mockWebhookDelivery]
      mockRepo.getDeliveriesByWebhook.mockResolvedValue(deliveries)

      await service.getDeliveries('webhook-1', 100)

      expect(mockRepo.getDeliveriesByWebhook).toHaveBeenCalledWith('webhook-1', 100, undefined)
    })

    it('should return deliveries with owner filter', async () => {
      const deliveries = [mockWebhookDelivery]
      mockRepo.getDeliveriesByWebhook.mockResolvedValue(deliveries)

      await service.getDeliveries('webhook-1', 50, 'owner-1')

      expect(mockRepo.getDeliveriesByWebhook).toHaveBeenCalledWith('webhook-1', 50, 'owner-1')
    })

    it('should return empty array when no deliveries', async () => {
      mockRepo.getDeliveriesByWebhook.mockResolvedValue([])

      const result = await service.getDeliveries('webhook-1')

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should return multiple deliveries', async () => {
      const deliveries = [
        mockWebhookDelivery,
        { ...mockWebhookDelivery, id: 'delivery-2' },
        { ...mockWebhookDelivery, id: 'delivery-3' }
      ]
      mockRepo.getDeliveriesByWebhook.mockResolvedValue(deliveries)

      const result = await service.getDeliveries('webhook-1')

      expect(result).toHaveLength(3)
    })

    it('should use default limit of 50', async () => {
      mockRepo.getDeliveriesByWebhook.mockResolvedValue([])

      await service.getDeliveries('webhook-1')

      expect(mockRepo.getDeliveriesByWebhook).toHaveBeenCalledWith('webhook-1', 50, undefined)
    })

    it('should propagate database errors', async () => {
      mockRepo.getDeliveriesByWebhook.mockRejectedValue(new Error('Query failed'))

      await expect(service.getDeliveries('webhook-1')).rejects.toThrow('Query failed')
    })
  })

  describe('createDelivery', () => {
    it('should create a new webhook delivery', async () => {
      const createData: CreateWebhookDelivery = {
        webhook_id: 'webhook-1',
        event: 'on_success' as WebhookEvent,
        payload: { result: 'success' },
        response_status: 200,
        response_body: 'OK'
      }
      mockRepo.createDelivery.mockResolvedValue({ ...mockWebhookDelivery, ...createData })

      const result = await service.createDelivery(createData)

      expect(mockRepo.createDelivery).toHaveBeenCalledWith(createData)
      expect(result.webhook_id).toBe('webhook-1')
    })

    it('should create delivery with error message', async () => {
      const createData: CreateWebhookDelivery = {
        webhook_id: 'webhook-1',
        event: 'on_failure' as WebhookEvent,
        payload: { error: 'failed' },
        error_message: 'HTTP 500'
      }
      mockRepo.createDelivery.mockResolvedValue({ ...mockWebhookDelivery, ...createData })

      const result = await service.createDelivery(createData)

      expect(result.error_message).toBe('HTTP 500')
    })

    it('should create delivery with execution log id', async () => {
      const createData: CreateWebhookDelivery = {
        webhook_id: 'webhook-1',
        execution_log_id: 'log-1',
        event: 'on_success' as WebhookEvent,
        payload: {}
      }
      mockRepo.createDelivery.mockResolvedValue({
        ...mockWebhookDelivery,
        execution_log_id: 'log-1'
      })

      const result = await service.createDelivery(createData)

      expect(result.execution_log_id).toBe('log-1')
    })

    it('should create delivery with minimal fields', async () => {
      const createData: CreateWebhookDelivery = {
        webhook_id: 'webhook-1',
        event: 'on_start' as WebhookEvent,
        payload: {}
      }
      mockRepo.createDelivery.mockResolvedValue(mockWebhookDelivery)

      await service.createDelivery(createData)

      expect(mockRepo.createDelivery).toHaveBeenCalledWith(createData)
    })

    it('should propagate database errors', async () => {
      const createData: CreateWebhookDelivery = {
        webhook_id: 'webhook-1',
        event: 'on_success' as WebhookEvent,
        payload: {}
      }
      mockRepo.createDelivery.mockRejectedValue(new Error('Insert failed'))

      await expect(service.createDelivery(createData)).rejects.toThrow('Insert failed')
    })
  })
})
