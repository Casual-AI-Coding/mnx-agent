import type {
  CapacityRecord,
  CreatePromptTemplate,
  CreateSystemConfig,
  CreateWebhookConfig,
  CreateWebhookDelivery,
  PromptTemplate,
  ServiceNodePermission,
  SystemConfig,
  UpdateCapacityRecord,
  UpdatePromptTemplate,
  UpdateSystemConfig,
  UpdateWebhookConfig,
  WebhookConfig,
  WebhookDelivery,
} from '../types.js'
import type {
  CapacityRepository,
  PromptTemplateRepository,
  SystemConfigRepository,
  UserRepository,
  WebhookRepository,
} from '../../repositories/index.js'

export class SystemService {
  constructor(
    private readonly systemConfigRepo: SystemConfigRepository,
    private readonly capacityRepo: CapacityRepository,
    private readonly webhookRepo: WebhookRepository,
    private readonly promptTemplateRepo: PromptTemplateRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async getAllCapacityRecords(): Promise<CapacityRecord[]> {
    return this.capacityRepo.getAll()
  }

  async getCapacityByService(serviceType: string): Promise<CapacityRecord | null> {
    return this.capacityRepo.getByService(serviceType)
  }

  async upsertCapacityRecord(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): Promise<CapacityRecord> {
    return this.capacityRepo.upsert(serviceType, data)
  }

  async getCapacityRecord(serviceType: string): Promise<CapacityRecord | null> {
    return this.capacityRepo.getByService(serviceType)
  }

  async getCapacity(serviceType: string): Promise<{ remaining: number; total: number } | null> {
    const record = await this.capacityRepo.getByService(serviceType)
    if (!record) return null
    return { remaining: record.remaining_quota, total: record.total_quota }
  }

  async updateCapacity(serviceType: string, remaining: number): Promise<void> {
    await this.capacityRepo.updateCapacity(serviceType, remaining)
  }

  async decrementCapacity(serviceType: string, amount: number = 1): Promise<CapacityRecord | null> {
    return this.capacityRepo.decrementCapacity(serviceType, amount)
  }

  async getPromptTemplates(options: {
    category?: string
    limit: number
    offset: number
    ownerId?: string
  }): Promise<{ templates: PromptTemplate[]; total: number }> {
    const result = await this.promptTemplateRepo.list(options)
    return { templates: result.items, total: result.total }
  }

  async getPromptTemplateById(id: string, ownerId?: string): Promise<PromptTemplate | null> {
    return this.promptTemplateRepo.getById(id, ownerId)
  }

  async createPromptTemplate(data: CreatePromptTemplate, ownerId?: string): Promise<PromptTemplate> {
    return this.promptTemplateRepo.create(data, ownerId)
  }

  async updatePromptTemplate(id: string, data: UpdatePromptTemplate, ownerId?: string): Promise<PromptTemplate | null> {
    return this.promptTemplateRepo.update(id, data, ownerId)
  }

  async deletePromptTemplate(id: string, ownerId?: string): Promise<boolean> {
    return this.promptTemplateRepo.delete(id, ownerId)
  }

  async createWebhookConfig(data: CreateWebhookConfig, ownerId?: string): Promise<WebhookConfig> {
    return this.webhookRepo.createConfig(data, ownerId)
  }

  async getWebhookConfigById(id: string, ownerId?: string): Promise<WebhookConfig | null> {
    return this.webhookRepo.getConfigById(id, ownerId)
  }

  async getWebhookConfigsByJobId(jobId: string): Promise<WebhookConfig[]> {
    return this.webhookRepo.getConfigsByJobId(jobId)
  }

  async getWebhookConfigsByOwner(ownerId: string): Promise<WebhookConfig[]> {
    return this.webhookRepo.getConfigsByOwner(ownerId)
  }

  async getAllWebhookConfigs(ownerId?: string): Promise<WebhookConfig[]> {
    return this.webhookRepo.getAllConfigs(ownerId)
  }

  async updateWebhookConfig(id: string, updates: UpdateWebhookConfig, ownerId?: string): Promise<WebhookConfig | null> {
    return this.webhookRepo.updateConfig(id, updates, ownerId)
  }

  async deleteWebhookConfig(id: string, ownerId?: string): Promise<boolean> {
    return this.webhookRepo.deleteConfig(id, ownerId)
  }

  async createWebhookDelivery(data: CreateWebhookDelivery, ownerId?: string): Promise<WebhookDelivery> {
    return this.webhookRepo.createDelivery(data, ownerId)
  }

  async getWebhookDeliveryById(id: string): Promise<WebhookDelivery | null> {
    return this.webhookRepo.getDeliveryById(id)
  }

  async getWebhookDeliveriesByWebhook(webhookId: string, limit: number = 50, ownerId?: string): Promise<WebhookDelivery[]> {
    return this.webhookRepo.getDeliveriesByWebhook(webhookId, limit, ownerId)
  }

  async getWebhookDeliveryByExecutionLog(executionLogId: string, ownerId?: string): Promise<WebhookDelivery[]> {
    return this.webhookRepo.getDeliveriesByExecutionLog(executionLogId, ownerId)
  }

  async getAllSystemConfigs(): Promise<SystemConfig[]> {
    return this.systemConfigRepo.list({}).then(r => r.items)
  }

  async getSystemConfigByKey(key: string): Promise<SystemConfig | null> {
    return this.systemConfigRepo.getByKey(key)
  }

  async createSystemConfig(data: CreateSystemConfig, updatedBy?: string): Promise<SystemConfig> {
    return this.systemConfigRepo.create(data, updatedBy)
  }

  async updateSystemConfig(key: string, updates: UpdateSystemConfig, updatedBy?: string): Promise<SystemConfig | null> {
    return this.systemConfigRepo.update(key, updates, updatedBy)
  }

  async deleteSystemConfig(key: string): Promise<boolean> {
    return this.systemConfigRepo.delete(key)
  }

  async getAllServiceNodePermissions(): Promise<ServiceNodePermission[]> {
    return this.userRepo.getAllServiceNodePermissions()
  }

  async getServiceNodePermission(serviceName: string, methodName: string): Promise<ServiceNodePermission | null> {
    return this.userRepo.getServiceNodePermission(serviceName, methodName)
  }

  async updateServiceNodePermission(id: string, data: { min_role?: string; is_enabled?: boolean }): Promise<void> {
    return this.userRepo.updateServiceNodePermission(id, data)
  }

  async upsertServiceNodePermission(data: {
    service_name: string
    method_name: string
    display_name: string
    category: string
    min_role?: string
    is_enabled?: boolean
  }): Promise<void> {
    return this.userRepo.upsertServiceNodePermission(data)
  }

  async deleteServiceNodePermission(id: string): Promise<void> {
    return this.userRepo.deleteServiceNodePermission(id)
  }

  async batchUpsertServiceNodePermissions(
    nodes: Array<{
      service_name: string
      method_name: string
      display_name: string
      category: string
      min_role?: string
      is_enabled?: boolean
    }>
  ): Promise<void> {
    return this.userRepo.batchUpsertServiceNodePermissions(nodes)
  }
}
