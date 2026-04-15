import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  WebhookConfig,
  WebhookConfigRow,
  WebhookDelivery,
  WebhookDeliveryRow,
  CreateWebhookConfig,
  UpdateWebhookConfig,
  CreateWebhookDelivery,
  WebhookEvent,
} from '../database/types.js'
import { BaseRepository } from './base-repository.js'
import { toLocalISODateString } from '../lib/date-utils.js'

function rowToWebhookConfig(row: WebhookConfigRow): WebhookConfig {
  const events = typeof row.events === 'string' ? JSON.parse(row.events) : row.events
  const headers = row.headers ? (typeof row.headers === 'string' ? JSON.parse(row.headers) : row.headers) : null
  return {
    ...row,
    events: events as WebhookEvent[],
    headers: headers as Record<string, string> | null,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : row.is_active === 1,
  }
}

function rowToWebhookDelivery(row: WebhookDeliveryRow): WebhookDelivery {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
  return {
    ...row,
    event: row.event as WebhookEvent,
    payload,
  }
}

export class WebhookRepository extends BaseRepository<WebhookConfig, CreateWebhookConfig, UpdateWebhookConfig> {
  protected readonly tableName = 'webhook_configs'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): WebhookConfig {
    return rowToWebhookConfig(row as WebhookConfigRow)
  }

  async createConfig(data: CreateWebhookConfig, ownerId?: string): Promise<WebhookConfig> {
    const id = uuidv4()
    const now = toLocalISODateString()
    const events = JSON.stringify(data.events)
    const headers = data.headers ? JSON.stringify(data.headers) : null

    if (this.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO webhook_configs (id, job_id, name, url, events, headers, secret, is_active, owner_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, data.job_id ?? null, data.name, data.url, events, headers, data.secret ?? null, data.is_active ?? true, ownerId ?? null, now, now]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO webhook_configs (id, job_id, name, url, events, headers, secret, is_active, owner_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.job_id ?? null, data.name, data.url, events, headers, data.secret ?? null, data.is_active ?? 1, ownerId ?? null, now, now]
      )
    }
    return (await this.getById(id))!
  }

  async getConfigById(id: string, ownerId?: string): Promise<WebhookConfig | null> {
    return this.getById(id, ownerId)
  }

  async getConfigsByJobId(jobId: string): Promise<WebhookConfig[]> {
    const rows = await this.conn.query<WebhookConfigRow>(
      'SELECT * FROM webhook_configs WHERE job_id = $1 AND is_active = true',
      [jobId]
    )
    return rows.map(rowToWebhookConfig)
  }

  async getConfigsByOwner(ownerId: string): Promise<WebhookConfig[]> {
    const rows = await this.conn.query<WebhookConfigRow>(
      'SELECT * FROM webhook_configs WHERE owner_id = $1 ORDER BY created_at DESC',
      [ownerId]
    )
    return rows.map(rowToWebhookConfig)
  }

  async getAllConfigs(ownerId?: string): Promise<WebhookConfig[]> {
    if (ownerId) {
      const rows = await this.conn.query<WebhookConfigRow>(
        'SELECT * FROM webhook_configs WHERE owner_id = $1 ORDER BY created_at DESC',
        [ownerId]
      )
      return rows.map(rowToWebhookConfig)
    }
    const rows = await this.conn.query<WebhookConfigRow>('SELECT * FROM webhook_configs ORDER BY created_at DESC')
    return rows.map(rowToWebhookConfig)
  }

  async updateConfig(id: string, updates: UpdateWebhookConfig, ownerId?: string): Promise<WebhookConfig | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramIndex = 1

    if (updates.job_id !== undefined) {
      fields.push(`job_id = $${paramIndex}`)
      values.push(updates.job_id)
      paramIndex++
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`)
      values.push(updates.name)
      paramIndex++
    }
    if (updates.url !== undefined) {
      fields.push(`url = $${paramIndex}`)
      values.push(updates.url)
      paramIndex++
    }
    if (updates.events !== undefined) {
      fields.push(`events = $${paramIndex}`)
      values.push(JSON.stringify(updates.events))
      paramIndex++
    }
    if (updates.headers !== undefined) {
      fields.push(`headers = $${paramIndex}`)
      values.push(updates.headers ? JSON.stringify(updates.headers) : null)
      paramIndex++
    }
    if (updates.secret !== undefined) {
      fields.push(`secret = $${paramIndex}`)
      values.push(updates.secret)
      paramIndex++
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex}`)
      values.push(this.isPostgres() ? updates.is_active : updates.is_active ? 1 : 0)
      paramIndex++
    }

    if (fields.length === 0) return existing

    fields.push(`updated_at = $${paramIndex}`)
    values.push(toLocalISODateString())
    paramIndex++
    values.push(id)
    if (ownerId) {
      values.push(ownerId)
      await this.conn.execute(
        `UPDATE webhook_configs SET ${fields.join(', ')} WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}`,
        values
      )
    } else {
      await this.conn.execute(
        `UPDATE webhook_configs SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
        values
      )
    }
    return this.getById(id, ownerId)
  }

  async deleteConfig(id: string, ownerId?: string): Promise<boolean> {
    return this.delete(id, ownerId)
  }

  async createDelivery(data: CreateWebhookDelivery, ownerId?: string): Promise<WebhookDelivery> {
    const id = uuidv4()
    const now = toLocalISODateString()
    const payload = typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload)

    if (this.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO webhook_deliveries (id, webhook_id, execution_log_id, event, payload, response_status, response_body, error_message, owner_id, delivered_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, data.webhook_id, data.execution_log_id ?? null, data.event, payload, data.response_status ?? null, data.response_body ?? null, data.error_message ?? null, ownerId ?? null, now]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO webhook_deliveries (id, webhook_id, execution_log_id, event, payload, response_status, response_body, error_message, owner_id, delivered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.webhook_id, data.execution_log_id ?? null, data.event, payload, data.response_status ?? null, data.response_body ?? null, data.error_message ?? null, ownerId ?? null, now]
      )
    }
    return (await this.getDeliveryById(id))!
  }

  async getDeliveryById(id: string): Promise<WebhookDelivery | null> {
    const rows = await this.conn.query<WebhookDeliveryRow>('SELECT * FROM webhook_deliveries WHERE id = $1', [id])
    return rows[0] ? rowToWebhookDelivery(rows[0]) : null
  }

  async getDeliveriesByWebhook(webhookId: string, limit: number = 50, ownerId?: string): Promise<WebhookDelivery[]> {
    let sql: string
    let params: (string | number)[]

    if (ownerId) {
      sql = 'SELECT * FROM webhook_deliveries WHERE webhook_id = $1 AND owner_id = $2 ORDER BY delivered_at DESC LIMIT $3'
      params = [webhookId, ownerId, limit]
    } else {
      sql = 'SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY delivered_at DESC LIMIT $2'
      params = [webhookId, limit]
    }

    const rows = await this.conn.query<WebhookDeliveryRow>(sql, params)
    return rows.map(rowToWebhookDelivery)
  }

  async getDeliveriesByExecutionLog(executionLogId: string, ownerId?: string): Promise<WebhookDelivery[]> {
    let sql: string
    let params: string[]

    if (ownerId) {
      sql = 'SELECT * FROM webhook_deliveries WHERE execution_log_id = $1 AND owner_id = $2 ORDER BY delivered_at DESC'
      params = [executionLogId, ownerId]
    } else {
      sql = 'SELECT * FROM webhook_deliveries WHERE execution_log_id = $1 ORDER BY delivered_at DESC'
      params = [executionLogId]
    }

    const rows = await this.conn.query<WebhookDeliveryRow>(sql, params)
    return rows.map(rowToWebhookDelivery)
  }
}
