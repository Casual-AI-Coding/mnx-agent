/**
 * Webhook Entity Types
 */

import { WebhookEvent } from './enums.js'

export interface WebhookConfig {
  id: string
  job_id: string | null
  name: string
  url: string
  events: WebhookEvent[]
  headers: Record<string, string> | null
  secret: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event: WebhookEvent
  payload: string
  status_code: number | null
  response_body: string | null
  error_message: string | null
  delivered_at: string | null
  created_at: string
}

export interface CreateWebhookConfig {
  job_id?: string | null
  name: string
  url: string
  events: WebhookEvent[]
  headers?: Record<string, string>
  secret?: string
  is_active?: boolean
}

export interface UpdateWebhookConfig {
  job_id?: string | null
  name?: string
  url?: string
  events?: WebhookEvent[]
  headers?: Record<string, string>
  secret?: string | null
  is_active?: boolean
}

export interface WebhookConfigRow {
  id: string
  job_id: string | null
  name: string
  url: string
  events: string
  headers: string | null
  secret: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookDeliveryRow {
  id: string
  webhook_id: string
  event: string
  payload: string
  status_code: number | null
  response_body: string | null
  error_message: string | null
  delivered_at: string | null
  created_at: string
}