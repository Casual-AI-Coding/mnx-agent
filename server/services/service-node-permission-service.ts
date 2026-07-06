import type { UserRepository } from '../repositories/user-repository.js'
import type { DatabaseConnection } from '../database/connection.js'
import type { ServiceNodePermission } from '../database/types.js'

export class ServiceNodePermissionService {
  constructor(private readonly userRepo: UserRepository) {}

  async getAll(): Promise<ServiceNodePermission[]> {
    return this.userRepo.getAllServiceNodePermissions()
  }

  async get(serviceName: string, methodName: string): Promise<ServiceNodePermission | null> {
    return this.userRepo.getServiceNodePermission(serviceName, methodName)
  }

  async update(id: string, data: { min_role?: string; is_enabled?: boolean }): Promise<void> {
    return this.userRepo.updateServiceNodePermission(id, data)
  }

  async upsert(data: {
    service_name: string; method_name: string; display_name: string
    category: string; min_role?: string; is_enabled?: boolean
  }): Promise<void> {
    return this.userRepo.upsertServiceNodePermission(data)
  }

  async delete(id: string): Promise<void> {
    return this.userRepo.deleteServiceNodePermission(id)
  }

  getConnection(): DatabaseConnection {
    return (this.userRepo as unknown as { conn: DatabaseConnection }).conn
  }
}
