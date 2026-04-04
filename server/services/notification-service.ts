import crypto from 'crypto'
import type { DatabaseService } from '../database/service-async.js'
import type { WebhookConfig, WebhookEvent } from '../database/types.js'

export interface WebhookPayload {
  event: string
  timestamp: string
  job_id: string | null
  data: unknown
}

const WEBHOOK_RATE_LIMIT_PER_MINUTE = 100
const WEBHOOK_RATE_WINDOW_MS = 60000

export class NotificationService {
  private db: DatabaseService
  private timeout: number
  private webhookRateLimiter = new Map<string, { count: number; resetAt: number }>()

  constructor(db: DatabaseService, options?: { timeout?: number }) {
    this.db = db
    this.timeout = options?.timeout ?? 10000
  }

  private checkRateLimit(webhookId: string): boolean {
    const now = Date.now()
    const limiter = this.webhookRateLimiter.get(webhookId)
    if (!limiter || now > limiter.resetAt) {
      this.webhookRateLimiter.set(webhookId, { count: 1, resetAt: now + WEBHOOK_RATE_WINDOW_MS })
      return true
    }
    if (limiter.count >= WEBHOOK_RATE_LIMIT_PER_MINUTE) return false
    limiter.count++
    return true
  }

  async notifyJobEvent(
    jobId: string,
    event: 'on_start' | 'on_success' | 'on_failure',
    data: unknown
  ): Promise<void> {
    const configs = await this.db.getWebhookConfigsByJobId(jobId)
    const relevantConfigs = configs.filter(config =>
      config.is_active && config.events.includes(event as WebhookEvent)
    )

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      job_id: jobId,
      data
    }

    await Promise.allSettled(
      relevantConfigs.map(config => this.sendWebhook(config, payload))
    )
  }

  private async sendWebhook(
    config: WebhookConfig,
    payload: WebhookPayload
  ): Promise<void> {
    if (!this.checkRateLimit(config.id)) {
      console.warn(`Webhook ${config.id} rate limited, skipping delivery`)
      await this.recordDelivery(config.id, null, payload, null, null, 'Rate limited: exceeded 100 requests per minute')
      return
    }

    const body = JSON.stringify(payload)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers || {})
    }

    if (config.secret) {
      headers['X-Webhook-Signature'] = this.generateSignature(body, config.secret)
    }

    headers['X-Webhook-Event'] = payload.event

    let responseStatus: number | null = null
    let responseBody: string | null = null
    let errorMessage: string | null = null

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      responseStatus = response.status
      responseBody = await response.text().catch(() => null)

      if (!response.ok) {
        errorMessage = `HTTP ${response.status}: ${(responseBody || '').slice(0, 200)}`
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
    }

    await this.recordDelivery(config.id, null, payload, responseStatus, responseBody, errorMessage)
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  private async recordDelivery(
    webhookId: string,
    executionLogId: string | null,
    payload: WebhookPayload,
    responseStatus: number | null,
    responseBody: string | null,
    errorMessage: string | null
  ): Promise<void> {
    try {
      await this.db.createWebhookDelivery({
        webhook_id: webhookId,
        execution_log_id: executionLogId,
        event: payload.event as WebhookEvent,
        payload: payload as unknown as Record<string, unknown>,
        response_status: responseStatus,
        response_body: responseBody,
        error_message: errorMessage,
      })
    } catch (err) {
      console.error('Failed to record webhook delivery:', err)
    }
  }

  async testWebhook(webhookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.db.getWebhookConfigById(webhookId)
      if (!config) {
        return { success: false, error: 'Webhook not found' }
      }

      const testPayload: WebhookPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        job_id: null,
        data: { message: 'This is a test webhook delivery' }
      }

      if (!this.checkRateLimit(config.id)) {
        return { success: false, error: 'Rate limited: exceeded 100 requests per minute' }
      }

      const body = JSON.stringify(testPayload)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'test',
        ...(config.headers || {})
      }

      if (config.secret) {
        headers['X-Webhook-Signature'] = this.generateSignature(body, config.secret)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        await this.recordDelivery(config.id, null, testPayload, response.status, await response.text().catch(() => null), null)
        return { success: true }
      } else {
        const errorBody = await response.text().catch(() => null)
        await this.recordDelivery(config.id, null, testPayload, response.status, errorBody, `HTTP ${response.status}`)
        return { success: false, error: `HTTP ${response.status}: ${errorBody || 'Unknown error'}` }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  }
}

let notificationInstance: NotificationService | null = null

export function getNotificationService(db: DatabaseService, options?: { timeout?: number }): NotificationService {
  if (!notificationInstance) {
    notificationInstance = new NotificationService(db, options)
  }
  return notificationInstance
}

export function resetNotificationService(): void {
  notificationInstance = null
}
