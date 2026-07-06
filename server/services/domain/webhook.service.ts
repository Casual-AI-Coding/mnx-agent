/**
 * WebhookService Implementation
 * 
 * Domain service handling all WebhookConfig and WebhookDelivery operations.
 */

import type { WebhookConfig, WebhookDelivery, CreateWebhookConfig, UpdateWebhookConfig, CreateWebhookDelivery } from '../../database/types.js'
import type { IWebhookService } from './interfaces/index.js'
import type { WebhookRepository } from '../../repositories/webhook-repository.js'

export class WebhookService implements IWebhookService {
  constructor(private readonly repo: WebhookRepository) {}

  async getAll(ownerId?: string): Promise<WebhookConfig[]> {
    return this.repo.getAllConfigs(ownerId)
  }

  async getById(id: string, ownerId?: string): Promise<WebhookConfig | null> {
    return this.repo.getConfigById(id, ownerId)
  }

  async getByJobId(jobId: string, ownerId?: string): Promise<WebhookConfig[]> {
    return this.repo.getConfigsByJobId(jobId, ownerId)
  }

  async create(data: CreateWebhookConfig, ownerId?: string): Promise<WebhookConfig> {
    return this.repo.createConfig(data, ownerId)
  }

  async update(id: string, data: UpdateWebhookConfig, ownerId?: string): Promise<WebhookConfig> {
    const result = await this.repo.updateConfig(id, data, ownerId)
    if (!result) {
      throw new Error(`WebhookConfig not found: ${id}`)
    }
    return result
  }

  async delete(id: string, ownerId?: string): Promise<void> {
    const deleted = await this.repo.deleteConfig(id, ownerId)
    if (!deleted) {
      throw new Error(`WebhookConfig not found: ${id}`)
    }
  }

  async getDeliveries(webhookId: string, limit: number = 50, ownerId?: string): Promise<WebhookDelivery[]> {
    return this.repo.getDeliveriesByWebhook(webhookId, limit, ownerId)
  }

  async createDelivery(data: CreateWebhookDelivery): Promise<WebhookDelivery> {
    return this.repo.createDelivery(data)
  }
}
