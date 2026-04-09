/**
 * WebhookService Domain Interface
 *
 * Defines the contract for all WebhookConfig and WebhookDelivery operations.
 */

import type { WebhookConfig, WebhookDelivery, CreateWebhookConfig, UpdateWebhookConfig, CreateWebhookDelivery } from '../../../database/types.js'

export interface IWebhookService {
  /**
   * Get all webhook configs, optionally filtered by owner
   */
  getAll(ownerId?: string): Promise<WebhookConfig[]>

  /**
   * Get a single webhook config by ID
   */
  getById(id: string, ownerId?: string): Promise<WebhookConfig | null>

  /**
   * Get webhook configs by job ID
   */
  getByJobId(jobId: string, ownerId?: string): Promise<WebhookConfig[]>

  /**
   * Create a new webhook config
   */
  create(data: CreateWebhookConfig, ownerId?: string): Promise<WebhookConfig>

  /**
   * Update an existing webhook config
   */
  update(id: string, data: UpdateWebhookConfig, ownerId?: string): Promise<WebhookConfig>

  /**
   * Delete a webhook config
   */
  delete(id: string, ownerId?: string): Promise<void>

  /**
   * Get deliveries for a webhook
   */
  getDeliveries(webhookId: string, limit?: number, ownerId?: string): Promise<WebhookDelivery[]>

  /**
   * Create a new webhook delivery record
   */
  createDelivery(data: CreateWebhookDelivery): Promise<WebhookDelivery>
}
