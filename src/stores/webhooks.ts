import { create } from 'zustand'
import type {
  WebhookConfig,
  WebhookDelivery,
  CreateWebhookConfig,
  UpdateWebhookConfig,
} from '@/types/cron'
import {
  getWebhooks,
  createWebhook as apiCreateWebhook,
  updateWebhook as apiUpdateWebhook,
  deleteWebhook as apiDeleteWebhook,
  testWebhook as apiTestWebhook,
  getWebhookDeliveries,
} from '@/lib/api/cron'

interface WebhooksState {
  webhooks: WebhookConfig[]
  deliveries: WebhookDelivery[]
  loading: boolean
  error: string | null
  fetchWebhooks: () => Promise<void>
  addWebhook: (data: CreateWebhookConfig) => Promise<WebhookConfig>
  updateWebhook: (id: string, data: UpdateWebhookConfig) => Promise<WebhookConfig>
  removeWebhook: (id: string) => Promise<void>
  testWebhook: (id: string) => Promise<{ success: boolean; message: string }>
  fetchDeliveries: (webhookId: string) => Promise<void>
}

interface WebhookApiResponse {
  id: string
  job_id: string | null
  name: string
  url: string
  events: string[]
  headers: Record<string, string> | null
  secret: string | null
  is_active: boolean | number
  created_at: string
  updated_at: string
}

function transformWebhookResponse(data: WebhookApiResponse): WebhookConfig {
  return {
    id: data.id,
    jobId: data.job_id,
    name: data.name,
    url: data.url,
    events: data.events as WebhookConfig['events'],
    headers: data.headers,
    secret: data.secret,
    isActive: Boolean(data.is_active),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

interface WebhookDeliveryApiResponse {
  id: string
  webhook_id: string
  execution_log_id: string | null
  event: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  error_message: string | null
  delivered_at: string
}

function transformDeliveryResponse(data: WebhookDeliveryApiResponse): WebhookDelivery {
  return {
    id: data.id,
    webhookId: data.webhook_id,
    executionLogId: data.execution_log_id,
    event: data.event as WebhookDelivery['event'],
    payload: data.payload,
    responseStatus: data.response_status,
    responseBody: data.response_body,
    errorMessage: data.error_message,
    deliveredAt: data.delivered_at,
  }
}

export const useWebhooksStore = create<WebhooksState>()((set, get) => ({
  webhooks: [],
  deliveries: [],
  loading: false,
  error: null,

  fetchWebhooks: async () => {
    set({ loading: true, error: null })
    try {
      const response = await getWebhooks()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch webhooks')
      }
      const webhooks = response.data.webhooks.map((w) => transformWebhookResponse(w as unknown as WebhookApiResponse))
      set({ webhooks, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch webhooks',
        loading: false,
      })
    }
  },

  addWebhook: async (data: CreateWebhookConfig) => {
    set({ loading: true, error: null })
    try {
      const response = await apiCreateWebhook(data)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create webhook')
      }
      const newWebhook = transformWebhookResponse(response.data as unknown as WebhookApiResponse)
      set((state) => ({
        webhooks: [...state.webhooks, newWebhook],
        loading: false,
      }))
      return newWebhook
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create webhook',
        loading: false,
      })
      throw err
    }
  },

  updateWebhook: async (id: string, data: UpdateWebhookConfig) => {
    set({ loading: true, error: null })
    try {
      const response = await apiUpdateWebhook(id, data)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update webhook')
      }
      const updatedWebhook = transformWebhookResponse(response.data as unknown as WebhookApiResponse)
      set((state) => ({
        webhooks: state.webhooks.map((w) =>
          w.id === id ? { ...w, ...updatedWebhook } : w
        ),
        loading: false,
      }))
      return updatedWebhook
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update webhook',
        loading: false,
      })
      throw err
    }
  },

  removeWebhook: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiDeleteWebhook(id)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete webhook')
      }
      set((state) => ({
        webhooks: state.webhooks.filter((w) => w.id !== id),
        loading: false,
      }))
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete webhook',
        loading: false,
      })
      throw err
    }
  },

  testWebhook: async (id: string) => {
    try {
      const response = await apiTestWebhook(id)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to test webhook')
      }
      return response.data
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to test webhook')
    }
  },

  fetchDeliveries: async (webhookId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await getWebhookDeliveries(webhookId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch deliveries')
      }
      const deliveries = response.data.deliveries.map((d) => transformDeliveryResponse(d as unknown as WebhookDeliveryApiResponse))
      set({ deliveries, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch deliveries',
        loading: false,
      })
    }
  },
}))
