import { renderHook, waitFor } from '@testing-library/react'
import { useWebhooksStore } from '../webhooks'

vi.mock('@/lib/api/cron', () => ({
  getWebhooks: vi.fn(),
  createWebhook: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  testWebhook: vi.fn(),
  getWebhookDeliveries: vi.fn(),
}))

import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookDeliveries,
} from '@/lib/api/cron'

const mockWebhookApiResponse = {
  id: 'webhook-1',
  job_id: 'job-1',
  name: 'Test Webhook',
  url: 'https://example.com/webhook',
  events: ['on_success', 'on_failure'],
  headers: { Authorization: 'Bearer token' },
  secret: 'my-secret',
  is_active: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockDeliveryApiResponse = {
  id: 'delivery-1',
  webhook_id: 'webhook-1',
  execution_log_id: 'log-1',
  event: 'on_success',
  payload: { status: 'success' },
  response_status: 200,
  response_body: '{"received":true}',
  error_message: null,
  delivered_at: '2024-01-01T00:00:00Z',
}

describe('useWebhooksStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useWebhooksStore.setState({
      webhooks: [],
      deliveries: [],
      loading: false,
      error: null,
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useWebhooksStore())
      expect(result.current.webhooks).toEqual([])
      expect(result.current.deliveries).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('fetchWebhooks', () => {
    it('should fetch webhooks from API', async () => {
      ;(getWebhooks as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { webhooks: [mockWebhookApiResponse], total: 1 },
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchWebhooks()

      expect(getWebhooks).toHaveBeenCalled()
      expect(result.current.webhooks).toHaveLength(1)
      expect(result.current.webhooks[0].id).toBe('webhook-1')
      expect(result.current.webhooks[0].name).toBe('Test Webhook')
      expect(result.current.webhooks[0].url).toBe('https://example.com/webhook')
      expect(result.current.webhooks[0].isActive).toBe(true)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      ;(getWebhooks as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const { result } = renderHook(() => useWebhooksStore())
      const promise = result.current.fetchWebhooks()

      await waitFor(() => expect(result.current.loading).toBe(true))

      resolvePromise!({ success: true, data: { webhooks: [], total: 0 } })
      await promise

      await waitFor(() => expect(result.current.loading).toBe(false))
    })

    it('should handle API errors gracefully', async () => {
      ;(getWebhooks as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchWebhooks()

      expect(result.current.error).toBe('Network error')
      expect(result.current.loading).toBe(false)
      expect(result.current.webhooks).toEqual([])
    })

    it('should handle null data response', async () => {
      ;(getWebhooks as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        data: null,
        error: 'No data available',
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchWebhooks()

      expect(result.current.error).toBe('No data available')
    })

    it('should handle thrown errors', async () => {
      ;(getWebhooks as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      )

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchWebhooks()

      expect(result.current.error).toBe('Connection refused')
    })

    it('should transform webhook response correctly', async () => {
      ;(getWebhooks as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { webhooks: [mockWebhookApiResponse], total: 1 },
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchWebhooks()

      const webhook = result.current.webhooks[0]
      expect(webhook.id).toBe('webhook-1')
      expect(webhook.jobId).toBe('job-1')
      expect(webhook.name).toBe('Test Webhook')
      expect(webhook.url).toBe('https://example.com/webhook')
      expect(webhook.events).toEqual(['on_success', 'on_failure'])
      expect(webhook.headers).toEqual({ Authorization: 'Bearer token' })
      expect(webhook.secret).toBe('my-secret')
      expect(webhook.isActive).toBe(true)
      expect(webhook.createdAt).toBe('2024-01-01T00:00:00Z')
      expect(webhook.updatedAt).toBe('2024-01-01T00:00:00Z')
    })

    it('should handle is_active as false (0)', async () => {
      ;(getWebhooks as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          webhooks: [{ ...mockWebhookApiResponse, is_active: 0 }],
          total: 1,
        },
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchWebhooks()

      expect(result.current.webhooks[0].isActive).toBe(false)
    })
  })

  describe('addWebhook', () => {
    it('should create webhook via API', async () => {
      ;(createWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockWebhookApiResponse,
      })

      const { result } = renderHook(() => useWebhooksStore())
      const newWebhookData = {
        jobId: 'job-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['on_success', 'on_failure'] as const,
        headers: { Authorization: 'Bearer token' },
        secret: 'my-secret',
      }

      const webhook = await result.current.addWebhook(newWebhookData)

      expect(createWebhook).toHaveBeenCalled()
      expect(webhook.id).toBe('webhook-1')
      expect(webhook.name).toBe('Test Webhook')
      expect(result.current.webhooks).toHaveLength(1)
    })

    it('should add webhook to existing list', async () => {
      useWebhooksStore.setState({ webhooks: [{ ...mockWebhookApiResponse, id: 'existing' }] as any })

      ;(createWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockWebhookApiResponse,
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.addWebhook({
        jobId: 'job-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['on_success'] as const,
      })

      expect(result.current.webhooks).toHaveLength(2)
    })

    it('should throw on create error', async () => {
      ;(createWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Validation failed',
      })

      const { result } = renderHook(() => useWebhooksStore())
      const newWebhookData = {
        jobId: 'job-1',
        name: '',
        url: 'invalid-url',
        events: [] as const,
      }

      await expect(result.current.addWebhook(newWebhookData)).rejects.toThrow()
      expect(result.current.error).toBe('Validation failed')
    })

    it('should handle thrown errors', async () => {
      ;(createWebhook as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network failure')
      )

      const { result } = renderHook(() => useWebhooksStore())

      await expect(
        result.current.addWebhook({
          jobId: 'job-1',
          name: 'Test',
          url: 'https://example.com',
          events: [] as const,
        })
      ).rejects.toThrow()
      expect(result.current.error).toBe('Network failure')
    })

    it('should set loading state during creation', async () => {
      let resolvePromise: (value: unknown) => void
      ;(createWebhook as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const { result } = renderHook(() => useWebhooksStore())
      const promise = result.current.addWebhook({
        jobId: 'job-1',
        name: 'Test',
        url: 'https://example.com',
        events: [] as const,
      })

      await waitFor(() => expect(result.current.loading).toBe(true))

      resolvePromise!({ success: true, data: mockWebhookApiResponse })
      await promise

      await waitFor(() => expect(result.current.loading).toBe(false))
    })
  })

  describe('updateWebhook', () => {
    it('should update webhook via API', async () => {
      useWebhooksStore.setState({
        webhooks: [{ ...mockWebhookApiResponse, id: 'webhook-1' }] as any,
      })

      const updatedResponse = {
        ...mockWebhookApiResponse,
        name: 'Updated Webhook',
        updated_at: '2024-01-02T00:00:00Z',
      }

      ;(updateWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: updatedResponse,
      })

      const { result } = renderHook(() => useWebhooksStore())
      const updatedWebhook = await result.current.updateWebhook('webhook-1', {
        name: 'Updated Webhook',
      })

      expect(updateWebhook).toHaveBeenCalledWith('webhook-1', { name: 'Updated Webhook' })
      expect(updatedWebhook.name).toBe('Updated Webhook')
      expect(result.current.webhooks[0].name).toBe('Updated Webhook')
    })

    it('should merge updated webhook with existing', async () => {
      useWebhooksStore.setState({
        webhooks: [{ ...mockWebhookApiResponse, id: 'webhook-1' }] as any,
      })

      const updatedResponse = {
        ...mockWebhookApiResponse,
        url: 'https://new-url.com/webhook',
      }

      ;(updateWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: updatedResponse,
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.updateWebhook('webhook-1', {
        url: 'https://new-url.com/webhook',
      })

      expect(result.current.webhooks[0].name).toBe('Test Webhook')
      expect(result.current.webhooks[0].url).toBe('https://new-url.com/webhook')
    })

    it('should throw on update error', async () => {
      useWebhooksStore.setState({
        webhooks: [{ ...mockWebhookApiResponse, id: 'webhook-1' }] as any,
      })

      ;(updateWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Webhook not found',
      })

      const { result } = renderHook(() => useWebhooksStore())

      await expect(
        result.current.updateWebhook('webhook-1', { name: 'Updated' })
      ).rejects.toThrow()
      expect(result.current.error).toBe('Webhook not found')
    })

    it('should handle thrown errors', async () => {
      useWebhooksStore.setState({
        webhooks: [{ ...mockWebhookApiResponse, id: 'webhook-1' }] as any,
      })

      ;(updateWebhook as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      )

      const { result } = renderHook(() => useWebhooksStore())

      await expect(
        result.current.updateWebhook('webhook-1', { name: 'Updated' })
      ).rejects.toThrow()
      expect(result.current.error).toBe('Connection refused')
    })
  })

  describe('removeWebhook', () => {
    it('should delete webhook via API', async () => {
      useWebhooksStore.setState({
        webhooks: [{ ...mockWebhookApiResponse, id: 'webhook-1' }] as any,
      })

      ;(deleteWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.removeWebhook('webhook-1')

      expect(deleteWebhook).toHaveBeenCalledWith('webhook-1')
      expect(result.current.webhooks).toHaveLength(0)
    })

    it('should only remove the specified webhook', async () => {
      useWebhooksStore.setState({
        webhooks: [
          { ...mockWebhookApiResponse, id: 'webhook-1' },
          { ...mockWebhookApiResponse, id: 'webhook-2', name: 'Second Webhook' },
        ] as any,
      })

      ;(deleteWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.removeWebhook('webhook-1')

      expect(result.current.webhooks).toHaveLength(1)
      expect(result.current.webhooks[0].id).toBe('webhook-2')
    })

    it('should throw on delete error', async () => {
      useWebhooksStore.setState({
        webhooks: [{ ...mockWebhookApiResponse, id: 'webhook-1' }] as any,
      })

      ;(deleteWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Cannot delete webhook',
      })

      const { result } = renderHook(() => useWebhooksStore())

      await expect(result.current.removeWebhook('webhook-1')).rejects.toThrow()
      expect(result.current.error).toBe('Cannot delete webhook')
    })

    it('should handle thrown errors', async () => {
      useWebhooksStore.setState({
        webhooks: [{ ...mockWebhookApiResponse, id: 'webhook-1' }] as any,
      })

      ;(deleteWebhook as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network failure')
      )

      const { result } = renderHook(() => useWebhooksStore())

      await expect(result.current.removeWebhook('webhook-1')).rejects.toThrow()
      expect(result.current.error).toBe('Network failure')
    })
  })

  describe('testWebhook', () => {
    it('should test webhook via API', async () => {
      ;(testWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { success: true, message: 'Webhook tested successfully' },
      })

      const { result } = renderHook(() => useWebhooksStore())
      const response = await result.current.testWebhook('webhook-1')

      expect(testWebhook).toHaveBeenCalledWith('webhook-1')
      expect(response).toEqual({ success: true, message: 'Webhook tested successfully' })
    })

    it('should return error response from API', async () => {
      ;(testWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Webhook URL unreachable',
      })

      const { result } = renderHook(() => useWebhooksStore())

      await expect(result.current.testWebhook('webhook-1')).rejects.toThrow()
    })

    it('should handle thrown errors', async () => {
      ;(testWebhook as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      )

      const { result } = renderHook(() => useWebhooksStore())

      await expect(result.current.testWebhook('webhook-1')).rejects.toThrow()
    })

    it('should handle null data response', async () => {
      ;(testWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        data: null,
        error: 'Test failed',
      })

      const { result } = renderHook(() => useWebhooksStore())

      await expect(result.current.testWebhook('webhook-1')).rejects.toThrow()
    })
  })

  describe('fetchDeliveries', () => {
    it('should fetch deliveries from API', async () => {
      ;(getWebhookDeliveries as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { deliveries: [mockDeliveryApiResponse], total: 1 },
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchDeliveries('webhook-1')

      expect(getWebhookDeliveries).toHaveBeenCalledWith('webhook-1')
      expect(result.current.deliveries).toHaveLength(1)
      expect(result.current.deliveries[0].id).toBe('delivery-1')
      expect(result.current.deliveries[0].webhookId).toBe('webhook-1')
      expect(result.current.deliveries[0].event).toBe('on_success')
      expect(result.current.deliveries[0].responseStatus).toBe(200)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      ;(getWebhookDeliveries as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const { result } = renderHook(() => useWebhooksStore())
      const promise = result.current.fetchDeliveries('webhook-1')

      await waitFor(() => expect(result.current.loading).toBe(true))

      resolvePromise!({ success: true, data: { deliveries: [], total: 0 } })
      await promise

      await waitFor(() => expect(result.current.loading).toBe(false))
    })

    it('should handle API errors gracefully', async () => {
      ;(getWebhookDeliveries as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Failed to fetch deliveries',
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchDeliveries('webhook-1')

      expect(result.current.error).toBe('Failed to fetch deliveries')
      expect(result.current.loading).toBe(false)
      expect(result.current.deliveries).toEqual([])
    })

    it('should handle null data response', async () => {
      ;(getWebhookDeliveries as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        data: null,
        error: 'No data available',
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchDeliveries('webhook-1')

      expect(result.current.error).toBe('No data available')
    })

    it('should handle thrown errors', async () => {
      ;(getWebhookDeliveries as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      )

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchDeliveries('webhook-1')

      expect(result.current.error).toBe('Connection refused')
    })

    it('should transform delivery response correctly', async () => {
      ;(getWebhookDeliveries as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { deliveries: [mockDeliveryApiResponse], total: 1 },
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchDeliveries('webhook-1')

      const delivery = result.current.deliveries[0]
      expect(delivery.id).toBe('delivery-1')
      expect(delivery.webhookId).toBe('webhook-1')
      expect(delivery.executionLogId).toBe('log-1')
      expect(delivery.event).toBe('on_success')
      expect(delivery.payload).toEqual({ status: 'success' })
      expect(delivery.responseStatus).toBe(200)
      expect(delivery.responseBody).toBe('{"received":true}')
      expect(delivery.errorMessage).toBeNull()
      expect(delivery.deliveredAt).toBe('2024-01-01T00:00:00Z')
    })

    it('should replace existing deliveries', async () => {
      useWebhooksStore.setState({
        deliveries: [{ id: 'old-delivery' }] as any,
      })

      ;(getWebhookDeliveries as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { deliveries: [mockDeliveryApiResponse], total: 1 },
      })

      const { result } = renderHook(() => useWebhooksStore())
      await result.current.fetchDeliveries('webhook-1')

      expect(result.current.deliveries).toHaveLength(1)
      expect(result.current.deliveries[0].id).toBe('delivery-1')
    })
  })
})