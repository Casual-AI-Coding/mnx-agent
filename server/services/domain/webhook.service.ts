/**
 * WebhookService Implementation
 * 
 * Domain service handling all WebhookConfig and WebhookDelivery operations.
 * Delegates to DatabaseService for data access.
 */

import type { DatabaseService } from '../../database/service-async.js'
import type { WebhookConfig, WebhookDelivery, CreateWebhookConfig, UpdateWebhookConfig, CreateWebhookDelivery } from '../../database/types.js'
import type { IWebhookService } from './interfaces/index.js'

export class WebhookService implements IWebhookService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(ownerId?: string): Promise<WebhookConfig[]> {
    return this.db.getAllWebhookConfigs(ownerId)
  }

  async getById(id: string, ownerId?: string): Promise<WebhookConfig | null> {
    return this.db.getWebhookConfigById(id, ownerId)
  }

  async getByJobId(jobId: string, ownerId?: string): Promise<WebhookConfig[]> {
    return this.db.getWebhookConfigsByJobId(jobId)
  }

  async create(data: CreateWebhookConfig, ownerId?: string): Promise<WebhookConfig> {
    return this.db.createWebhookConfig(data, ownerId)
  }

  async update(id: string, data: UpdateWebhookConfig, ownerId?: string): Promise<WebhookConfig> {
    const result = await this.db.updateWebhookConfig(id, data, ownerId)
    if (!result) {
      throw new Error(`WebhookConfig not found: ${id}`)
    }
    return result
  }

  async delete(id: string, ownerId?: string): Promise<void> {
    const deleted = await this.db.deleteWebhookConfig(id, ownerId)
    if (!deleted) {
      throw new Error(`WebhookConfig not found: ${id}`)
    }
  }

  async getDeliveries(webhookId: string, limit: number = 50, ownerId?: string): Promise<WebhookDelivery[]> {
    return this.db.getWebhookDeliveriesByWebhook(webhookId, limit, ownerId)
  }

  async createDelivery(data: CreateWebhookDelivery): Promise<WebhookDelivery> {
    return this.db.createWebhookDelivery(data)
  }
}