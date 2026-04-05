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
  owner_id: string | null
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  execution_log_id: string | null
  event: WebhookEvent
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  error_message: string | null
  delivered_at: string
  owner_id: string | null
}

export interface CreateWebhookConfig {
  job_id?: string | null
  name: string
  url: string
  events: WebhookEvent[]
  headers?: Record<string, string> | null
  secret?: string | null
  is_active?: boolean
  owner_id?: string | null
}

export interface UpdateWebhookConfig {
  job_id?: string | null
  name?: string
  url?: string
  events?: WebhookEvent[]
  headers?: Record<string, string> | null
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
  owner_id: string | null
  created_at: string
  updated_at: string
}

export interface WebhookDeliveryRow {
  id: string
  webhook_id: string
  execution_log_id: string | null
  event: string
  payload: string
  response_status: number | null
  response_body: string | null
  error_message: string | null
  delivered_at: string
  owner_id: string | null
}

export interface CreateWebhookDelivery {
  webhook_id: string
  execution_log_id?: string | null
  event: WebhookEvent
  payload: Record<string, unknown>
  response_status?: number | null
  response_body?: string | null
  error_message?: string | null
  owner_id?: string | null
}

export interface WebhookDeliveryQuery {
  webhook_id?: string
  limit?: number
}