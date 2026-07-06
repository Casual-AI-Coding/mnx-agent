import type { SystemConfigRepository } from '../repositories/system-config-repository.js'
import type { SystemConfig, CreateSystemConfig, UpdateSystemConfig } from '../database/types.js'

export class SystemConfigService {
  constructor(private readonly repo: SystemConfigRepository) {}

  async getAll(): Promise<SystemConfig[]> {
    const result = await this.repo.list()
    return result.items
  }

  async getByKey(key: string): Promise<SystemConfig | null> {
    return this.repo.getByKey(key)
  }

  async create(data: CreateSystemConfig, updatedBy?: string): Promise<SystemConfig> {
    return this.repo.create(data, updatedBy)
  }

  async update(key: string, updates: UpdateSystemConfig, updatedBy?: string): Promise<SystemConfig | null> {
    return this.repo.update(key, updates, updatedBy)
  }

  async delete(key: string): Promise<boolean> {
    return this.repo.delete(key)
  }
}
