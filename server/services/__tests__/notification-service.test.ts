import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { DatabaseService } from '../../database/service-async.js'
import type { WebhookConfig, WebhookEvent } from '../../database/types.js'
import { WEBHOOK_RATE_LIMITS } from '../../config/rate-limits.js'

vi.mock('../../lib/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

import { NotificationService, WebhookPayload } from '../notification-service.js'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('NotificationService', () => {
  let service: NotificationService
  let mockDb: {
    getWebhookConfigsByJobId: ReturnType<typeof vi.fn>
    getWebhookConfigById: ReturnType<typeof vi.fn>
    createWebhookDelivery: ReturnType<typeof vi.fn>
  }

  const mockWebhookConfig: WebhookConfig = {
    id: 'webhook-1',
    job_id: 'job-1',
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    events: ['on_start', 'on_success', 'on_failure'] as WebhookEvent[],
    headers: { 'X-Custom': 'value' },
    secret: 'test-secret',
    is_active: true,
    owner_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockWebhookConfigNoSecret: WebhookConfig = {
    ...mockWebhookConfig,
    id: 'webhook-2',
    secret: null
  }

  const mockInactiveWebhookConfig: WebhookConfig = {
    ...mockWebhookConfig,
    id: 'webhook-3',
    is_active: false
  }

  beforeEach(() => {
    vi.useFakeTimers()
    
    mockDb = {
      getWebhookConfigsByJobId: vi.fn(),
      getWebhookConfigById: vi.fn(),
      createWebhookDelivery: vi.fn()
    }

    service = new NotificationService(mockDb as unknown as DatabaseService, { timeout: 5000 })
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('WebhookPayload interface', () => {
    it('should have correct structure', () => {
      const payload: WebhookPayload = {
        event: 'on_start',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: { test: 'value' }
      }
      expect(payload.event).toBe('on_start')
      expect(payload.timestamp).toBe('2024-01-01T00:00:00Z')
      expect(payload.job_id).toBe('job-1')
      expect(payload.data).toEqual({ test: 'value' })
    })

    it('should allow null job_id', () => {
      const payload: WebhookPayload = {
        event: 'test',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: null,
        data: { message: 'test' }
      }
      expect(payload.job_id).toBeNull()
    })
  })

  describe('checkRateLimit', () => {
    it('should allow requests under limit', async () => {
      // Access private method via any cast
      const checkRateLimit = (service as any).checkRateLimit.bind(service)
      
      // First request should be allowed
      expect(checkRateLimit('webhook-1')).toBe(true)
      
      // Multiple requests under limit should be allowed
      for (let i = 0; i < 50; i++) {
        expect(checkRateLimit('webhook-1')).toBe(true)
      }
    })

    it('should block requests over limit', async () => {
      const checkRateLimit = (service as any).checkRateLimit.bind(service)
      
      // Exhaust the rate limit
      for (let i = 0; i < WEBHOOK_RATE_LIMITS.PER_MINUTE; i++) {
        checkRateLimit('webhook-1')
      }
      
      // Request over limit should be blocked
      expect(checkRateLimit('webhook-1')).toBe(false)
    })

    it('should reset after window expires', async () => {
      const checkRateLimit = (service as any).checkRateLimit.bind(service)
      
      // Exhaust the rate limit
      for (let i = 0; i < WEBHOOK_RATE_LIMITS.PER_MINUTE; i++) {
        checkRateLimit('webhook-1')
      }
      expect(checkRateLimit('webhook-1')).toBe(false)
      
      // Advance time past the window
      vi.advanceTimersByTime(WEBHOOK_RATE_LIMITS.WINDOW_MS + 1)
      
      // Should be allowed again after window reset
      expect(checkRateLimit('webhook-1')).toBe(true)
    })

    it('should track rate limits separately for each webhook', async () => {
      const checkRateLimit = (service as any).checkRateLimit.bind(service)
      
      // Exhaust rate limit for webhook-1
      for (let i = 0; i < WEBHOOK_RATE_LIMITS.PER_MINUTE; i++) {
        checkRateLimit('webhook-1')
      }
      expect(checkRateLimit('webhook-1')).toBe(false)
      
      // webhook-2 should still be allowed (separate counter)
      expect(checkRateLimit('webhook-2')).toBe(true)
    })

    it('should initialize counter on first request', async () => {
      const checkRateLimit = (service as any).checkRateLimit.bind(service)
      const limiterMap = (service as any).webhookRateLimiter
      
      expect(limiterMap.has('new-webhook')).toBe(false)
      
      checkRateLimit('new-webhook')
      
      expect(limiterMap.has('new-webhook')).toBe(true)
      const limiter = limiterMap.get('new-webhook')
      expect(limiter.count).toBe(1)
    })
  })

  describe('notifyJobEvent', () => {
    it('should send webhooks for job start event', async () => {
      mockDb.getWebhookConfigsByJobId.mockResolvedValue([mockWebhookConfig])
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      await service.notifyJobEvent('job-1', 'on_start', { status: 'started' })

      expect(mockDb.getWebhookConfigsByJobId).toHaveBeenCalledWith('job-1')
      expect(mockFetch).toHaveBeenCalled()
      expect(mockDb.createWebhookDelivery).toHaveBeenCalled()
    })

    it('should send webhooks for job success event', async () => {
      mockDb.getWebhookConfigsByJobId.mockResolvedValue([mockWebhookConfig])
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      await service.notifyJobEvent('job-1', 'on_success', { result: 'completed' })

      expect(mockDb.getWebhookConfigsByJobId).toHaveBeenCalledWith('job-1')
    })

    it('should send webhooks for job failure event', async () => {
      mockDb.getWebhookConfigsByJobId.mockResolvedValue([mockWebhookConfig])
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      await service.notifyJobEvent('job-1', 'on_failure', { error: 'job failed' })

      expect(mockDb.getWebhookConfigsByJobId).toHaveBeenCalledWith('job-1')
    })

    it('should only send to active webhooks with matching event', async () => {
      mockDb.getWebhookConfigsByJobId.mockResolvedValue([
        mockWebhookConfig,
        mockInactiveWebhookConfig,
        { ...mockWebhookConfig, id: 'webhook-4', events: ['on_success'] as WebhookEvent[] }
      ])
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      await service.notifyJobEvent('job-1', 'on_start', {})

      // Only mockWebhookConfig should receive (active + has on_start event)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple webhooks in parallel', async () => {
      const configs = [mockWebhookConfig, mockWebhookConfigNoSecret]
      mockDb.getWebhookConfigsByJobId.mockResolvedValue(configs)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      await service.notifyJobEvent('job-1', 'on_success', {})

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle webhook failures gracefully', async () => {
      mockDb.getWebhookConfigsByJobId.mockResolvedValue([mockWebhookConfig])
      mockFetch.mockRejectedValue(new Error('Network error'))
      mockDb.createWebhookDelivery.mockResolvedValue({})

      await service.notifyJobEvent('job-1', 'on_success', {})

      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_id: 'webhook-1',
          error_message: 'Network error'
        })
      )
    })

    it('should not throw when no webhooks configured', async () => {
      mockDb.getWebhookConfigsByJobId.mockResolvedValue([])

      await service.notifyJobEvent('job-1', 'on_start', {})

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('sendWebhook', () => {
    it('should send POST request with correct headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const sendWebhook = (service as any).sendWebhook.bind(service)
      const payload: WebhookPayload = {
        event: 'on_success',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: {}
      }

      await sendWebhook(mockWebhookConfig, payload)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'on_success',
            'X-Custom': 'value',
            'X-Webhook-Signature': expect.stringMatching(/^[a-f0-9]{64}$/)
          })
        })
      )
    })

    it('should not add signature header when secret is null', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const sendWebhook = (service as any).sendWebhook.bind(service)
      const payload: WebhookPayload = {
        event: 'on_success',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: {}
      }

      await sendWebhook(mockWebhookConfigNoSecret, payload)

      const callArgs = mockFetch.mock.calls[0][1]
      expect(callArgs.headers['X-Webhook-Signature']).toBeUndefined()
    })

    it('should record delivery on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('Success response')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const sendWebhook = (service as any).sendWebhook.bind(service)
      await sendWebhook(mockWebhookConfig, {
        event: 'on_success',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: {}
      })

      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_id: 'webhook-1',
          response_status: 200,
          response_body: 'Success response',
          error_message: null
        })
      )
    })

    it('should record delivery on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const sendWebhook = (service as any).sendWebhook.bind(service)
      await sendWebhook(mockWebhookConfig, {
        event: 'on_success',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: {}
      })

      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 500,
          error_message: expect.stringContaining('HTTP 500')
        })
      )
    })

    it('should handle rate limiting', async () => {
      mockDb.createWebhookDelivery.mockResolvedValue({})
      
      // Exhaust rate limit
      const checkRateLimit = (service as any).checkRateLimit.bind(service)
      for (let i = 0; i < WEBHOOK_RATE_LIMITS.PER_MINUTE; i++) {
        checkRateLimit('webhook-1')
      }

      const sendWebhook = (service as any).sendWebhook.bind(service)
      await sendWebhook(mockWebhookConfig, {
        event: 'on_success',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: {}
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: expect.stringContaining('Rate limited')
        })
      )
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'))
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const sendWebhook = (service as any).sendWebhook.bind(service)
      await sendWebhook(mockWebhookConfig, {
        event: 'on_success',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: {}
      })

      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: 'Connection refused'
        })
      )
    })

    it('should handle unknown errors', async () => {
      mockFetch.mockRejectedValue('Unknown error type')
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const sendWebhook = (service as any).sendWebhook.bind(service)
      await sendWebhook(mockWebhookConfig, {
        event: 'on_success',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: {}
      })

      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: 'Unknown error'
        })
      )
    })

    it('should handle timeout', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const sendWebhook = (service as any).sendWebhook.bind(service)
      await sendWebhook(mockWebhookConfig, {
        event: 'on_success',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: {}
      })

      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: 'The operation was aborted'
        })
      )
    })

    it('should handle failed response body read', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockRejectedValue(new Error('Failed to read body'))
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const sendWebhook = (service as any).sendWebhook.bind(service)
      await sendWebhook(mockWebhookConfig, {
        event: 'on_success',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: 'job-1',
        data: {}
      })

      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 200,
          response_body: null
        })
      )
    })
  })

  describe('generateSignature', () => {
    it('should generate HMAC SHA256 signature as hex string', () => {
      const generateSignature = (service as any).generateSignature.bind(service)
      
      const signature = generateSignature('test-payload', 'test-secret')
      
      expect(signature).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate consistent signatures for same input', () => {
      const generateSignature = (service as any).generateSignature.bind(service)
      
      const signature1 = generateSignature('same-payload', 'same-secret')
      const signature2 = generateSignature('same-payload', 'same-secret')
      
      expect(signature1).toBe(signature2)
    })

    it('should generate different signatures for different secrets', () => {
      const generateSignature = (service as any).generateSignature.bind(service)
      
      const signature1 = generateSignature('same-payload', 'secret-1')
      const signature2 = generateSignature('same-payload', 'secret-2')
      
      expect(signature1).not.toBe(signature2)
    })

    it('should generate different signatures for different payloads', () => {
      const generateSignature = (service as any).generateSignature.bind(service)
      
      const signature1 = generateSignature('payload-1', 'same-secret')
      const signature2 = generateSignature('payload-2', 'same-secret')
      
      expect(signature1).not.toBe(signature2)
    })
  })

  describe('recordDelivery', () => {
    it('should record webhook delivery to database', async () => {
      mockDb.createWebhookDelivery.mockResolvedValue({
        id: 'delivery-1',
        webhook_id: 'webhook-1',
        event: 'on_success',
        payload: {},
        response_status: 200,
        response_body: 'OK',
        error_message: null,
        delivered_at: '2024-01-01T00:00:00Z',
        execution_log_id: null,
        owner_id: null
      })

      const recordDelivery = (service as any).recordDelivery.bind(service)
      await recordDelivery(
        'webhook-1',
        null,
        { event: 'on_success', timestamp: '2024-01-01T00:00:00Z', job_id: 'job-1', data: {} },
        200,
        'OK',
        null
      )

      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_id: 'webhook-1',
          execution_log_id: null,
          event: 'on_success',
          response_status: 200
        })
      )
    })

    it('should handle database errors silently', async () => {
      mockDb.createWebhookDelivery.mockRejectedValue(new Error('Database error'))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const recordDelivery = (service as any).recordDelivery.bind(service)
      await recordDelivery(
        'webhook-1',
        null,
        { event: 'on_success', timestamp: '2024-01-01T00:00:00Z', job_id: 'job-1', data: {} },
        200,
        'OK',
        null
      )

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('testWebhook', () => {
    it('should return success when webhook test succeeds', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(mockWebhookConfig)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const result = await service.testWebhook('webhook-1')

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error when webhook not found', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(null)

      const result = await service.testWebhook('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Webhook not found')
    })

    it('should return error when rate limited', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(mockWebhookConfig)
      
      // Exhaust rate limit
      const checkRateLimit = (service as any).checkRateLimit.bind(service)
      for (let i = 0; i < WEBHOOK_RATE_LIMITS.PER_MINUTE; i++) {
        checkRateLimit('webhook-1')
      }

      const result = await service.testWebhook('webhook-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limited')
    })

    it('should return error on HTTP failure', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(mockWebhookConfig)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad Request')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const result = await service.testWebhook('webhook-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 400')
    })

    it('should return error on network failure', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(mockWebhookConfig)
      mockFetch.mockRejectedValue(new Error('Connection failed'))

      const result = await service.testWebhook('webhook-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection failed')
    })

    it('should handle unknown error type', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(mockWebhookConfig)
      mockFetch.mockRejectedValue({})

      const result = await service.testWebhook('webhook-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('should include signature in test request', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(mockWebhookConfig)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      await service.testWebhook('webhook-1')

      const callArgs = mockFetch.mock.calls[0][1]
      expect(callArgs.headers['X-Webhook-Signature']).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should send test event payload', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(mockWebhookConfig)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK')
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      await service.testWebhook('webhook-1')

      const callArgs = mockFetch.mock.calls[0][1]
      const body = JSON.parse(callArgs.body)
      expect(body.event).toBe('test')
      expect(body.job_id).toBeNull()
      expect(body.data.message).toBe('This is a test webhook delivery')
    })

    it('should handle failed response body read on success', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(mockWebhookConfig)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockRejectedValue(new Error('Read failed'))
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const result = await service.testWebhook('webhook-1')

      expect(result.success).toBe(true)
      expect(mockDb.createWebhookDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          response_body: null
        })
      )
    })

    it('should handle failed response body read on error', async () => {
      mockDb.getWebhookConfigById.mockResolvedValue(mockWebhookConfig)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockRejectedValue(new Error('Read failed'))
      })
      mockDb.createWebhookDelivery.mockResolvedValue({})

      const result = await service.testWebhook('webhook-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 500')
    })
  })

  describe('constructor', () => {
    it('should use default timeout when not provided', () => {
      const svc = new NotificationService(mockDb as unknown as DatabaseService)
      expect((svc as any).timeout).toBe(10000)
    })

    it('should use custom timeout when provided', () => {
      const svc = new NotificationService(mockDb as unknown as DatabaseService, { timeout: 5000 })
      expect((svc as any).timeout).toBe(5000)
    })

    it('should initialize empty rate limiter map', () => {
      const svc = new NotificationService(mockDb as unknown as DatabaseService)
      expect((svc as any).webhookRateLimiter.size).toBe(0)
    })
  })
})