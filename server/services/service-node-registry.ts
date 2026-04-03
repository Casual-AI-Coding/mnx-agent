/**
 * Service Node Registry
 * 
 * Manages registration and invocation of services used by workflow nodes.
 */

import type { DatabaseService } from '../database/service-async.js'
import type { ServiceNodePermission } from '../database/types.js'
import { ROLE_HIERARCHY } from '../types/workflow.js'

export interface ServiceMethodMeta {
  name: string
  displayName: string
  category: string
  description?: string
}

export interface ServiceConfig {
  serviceName: string
  instance: object
  methods: ServiceMethodMeta[]
}

export class ServiceNodeRegistry {
  private services = new Map<string, object>()
  private methodMetas = new Map<string, ServiceMethodMeta[]>()
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
  }

  async register(config: ServiceConfig): Promise<void> {
    this.services.set(config.serviceName, config.instance)
    this.methodMetas.set(config.serviceName, config.methods)
    console.log(`[ServiceNodeRegistry] Registered service: ${config.serviceName} with ${config.methods.length} methods`)

    for (const method of config.methods) {
      try {
        await this.db.upsertServiceNodePermission({
          service_name: config.serviceName,
          method_name: method.name,
          display_name: method.displayName,
          category: method.category,
          min_role: 'pro',
          is_enabled: true,
        })
      } catch (error) {
        console.error(`[ServiceNodeRegistry] Failed to sync ${config.serviceName}.${method.name} to database:`, error)
      }
    }
  }

  get(serviceName: string): object | undefined {
    return this.services.get(serviceName)
  }

  async call(
    serviceName: string,
    method: string,
    args: unknown[]
  ): Promise<unknown> {
    const instance = this.services.get(serviceName)
    if (!instance) {
      throw new Error(`Service "${serviceName}" not registered`)
    }

    const fn = (instance as Record<string, unknown>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method "${method}" not found on service "${serviceName}"`)
    }

    return (fn as (...args: unknown[]) => Promise<unknown>).bind(instance)(...args)
  }

  getAllServices(): string[] {
    return Array.from(this.services.keys())
  }

  getServiceMethods(serviceName: string): ServiceMethodMeta[] {
    return this.methodMetas.get(serviceName) || []
  }

  async getAvailableNodes(userRole: string): Promise<ServiceNodePermission[]> {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0
    const allNodes = await this.db.getAllServiceNodePermissions()
    
    return allNodes.filter(node => {
      if (!node.is_enabled) return false
      const nodeLevel = ROLE_HIERARCHY[node.min_role] ?? 0
      return nodeLevel <= userLevel
    })
  }
}

/**
 * Global singleton instance of ServiceNodeRegistry
 *
 * WARNING: This singleton pattern has trade-offs:
 * - Pros: Single source of truth, easy access throughout codebase
 * - Cons: Harder to test, global state can cause unexpected behavior
 *
 * The resetServiceNodeRegistry() function exists for testing purposes only.
 * DO NOT call it in production code.
 */
let registryInstance: ServiceNodeRegistry | null = null

/**
 * Get the singleton ServiceNodeRegistry instance
 *
 * @param db - Database service instance
 * @returns The ServiceNodeRegistry singleton
 *
 * @example
 * const db = await getDatabase()
 * const registry = getServiceNodeRegistry(db)
 * const nodes = await registry.getAvailableNodes('pro')
 */
export function getServiceNodeRegistry(db: DatabaseService): ServiceNodeRegistry {
  if (!registryInstance) {
    registryInstance = new ServiceNodeRegistry(db)
  }
  return registryInstance
}

/**
 * Reset the singleton instance (FOR TESTING ONLY)
 *
 * This function should only be used in test teardown to ensure
 * a fresh instance for each test.
 *
 * @example
 * afterEach(() => {
 *   resetServiceNodeRegistry()
 * })
 */
export function resetServiceNodeRegistry(): void {
  registryInstance = null
}