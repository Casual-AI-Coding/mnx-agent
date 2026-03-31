import crypto from 'crypto'
import type { DatabaseService } from '../database/service'

export interface WebhookPayload {
  event: string
  timestamp: string
  job_id: string | null
  data: unknown
}

export class NotificationService {
  private db: DatabaseService
  private timeout: number

  constructor(db: DatabaseService, options?: { timeout?: number }) {
    this.db = db
    this.timeout = options?.timeout ?? 10000
  }

  async notifyJobEvent(
    jobId: string,
    event: 'on_start' | 'on_success' | 'on_failure',
    data: unknown
  ): Promise<void> {
    const configs = this.getWebhookConfigsForJob(jobId, event)
    
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      job_id: jobId,
      data
    }

    await Promise.allSettled(
      configs.map(config => this.sendWebhook(config, payload))
    )
  }

  private getWebhookConfigsForJob(jobId: string, event: string): Array<{
    id: string
    url: string
    headers: Record<string, string>
    secret: string | null
  }> {
    const rows = this.db.getDatabase()
      .prepare(`
        SELECT * FROM webhook_configs 
        WHERE is_active = 1 
        AND (job_id = ? OR job_id IS NULL)
        AND events LIKE ?
      `)
      .all(jobId, `%"${event}"%`) as Array<Record<string, unknown>>

    return rows.map(row => ({
      id: row.id as string,
      url: row.url as string,
      headers: row.headers ? JSON.parse(row.headers as string) : {},
      secret: row.secret as string | null
    }))
  }

  private async sendWebhook(
    config: { id: string; url: string; headers: Record<string, string>; secret: string | null },
    payload: WebhookPayload
  ): Promise<void> {
    const body = JSON.stringify(payload)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
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
      responseBody = await response.text()

      if (!response.ok) {
        errorMessage = `HTTP ${response.status}: ${responseBody.slice(0, 200)}`
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
    }

    this.recordDelivery(config.id, payload, responseStatus, responseBody, errorMessage)
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  private recordDelivery(
    webhookId: string,
    payload: WebhookPayload,
    responseStatus: number | null,
    responseBody: string | null,
    errorMessage: string | null
  ): void {
    const id = crypto.randomUUID()
    this.db.getDatabase().prepare(`
      INSERT INTO webhook_deliveries (id, webhook_id, event, payload, response_status, response_body, error_message, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      webhookId,
      payload.event,
      JSON.stringify(payload),
      responseStatus,
      responseBody?.slice(0, 10000) ?? null,
      errorMessage,
      new Date().toISOString()
    )
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
  async testWebhook(webhookId: string): Promise<{ success: boolean; error?: string }> {
    const config = this.db.getWebhookConfigById(webhookId)
    if (!config) {
      return { success: false, error: 'Webhook not found' }
    }

    const testPayload: WebhookPayload = {
      event: WebhookEvent.ON_SUCCESS,
      timestamp: new Date().toISOString(),
      execution_id: 'test-' + Date.now(),
      job_id: config.job_id,
      status: 'completed',
      duration_ms: 1234,
      error_summary: null,
      tasks_executed: 1,
      tasks_succeeded: 1,
      tasks_failed: 0,
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'MiniMax-Cron-Scheduler/1.0',
        'X-Webhook-Event': 'test',
        'X-Webhook-Id': config.id,
        ...(config.headers || {}),
      }

      if (config.secret) {
        const signature = this.generateSignature(JSON.stringify(testPayload), config.secret)
        headers['X-Webhook-Signature'] = signature
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
      })

      if (response.ok) {
        return { success: true }
      } else {
        return { 
          success: false, 
          error: `Webhook returned ${response.status}: ${await response.text()}` 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
