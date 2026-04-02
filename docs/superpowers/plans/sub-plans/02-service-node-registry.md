# SP-2: Service Node Registry

> 本方案实现服务节点注册中心，用于管理可调用服务的注册和调用。

## 1. 目标

- 实现统一的服务注册机制
- 提供服务方法调用接口
- 支持动态获取可用服务列表
- 与权限系统集成

## 2. 接口设计

### 2.1 核心接口

```typescript
// server/services/service-node-registry.ts

/**
 * 服务方法元数据
 */
interface ServiceMethodMeta {
  name: string           // 方法名
  displayName: string    // 显示名称
  category: string       // 分类
  description?: string   // 描述
}

/**
 * 服务注册配置
 */
interface ServiceConfig {
  serviceName: string              // 服务名
  instance: object                 // 服务实例
  methods: ServiceMethodMeta[]     // 可调用方法列表
}

/**
 * 服务节点注册中心
 */
class ServiceNodeRegistry {
  /**
   * 注册服务
   */
  register(config: ServiceConfig): void

  /**
   * 获取服务实例
   */
  get(serviceName: string): object | undefined

  /**
   * 调用服务方法
   */
  call(serviceName: string, method: string, args: unknown[]): Promise<unknown>

  /**
   * 获取所有已注册的服务
   */
  getAllServices(): string[]

  /**
   * 获取服务的所有方法
   */
  getServiceMethods(serviceName: string): ServiceMethodMeta[]

  /**
   * 获取用户可用的服务节点（从数据库查询权限）
   */
  getAvailableNodes(userRole: string): Promise<ServiceNodePermission[]>
}
```

## 3. 实现代码

```typescript
// server/services/service-node-registry.ts

import type { DatabaseService } from '../database/service-async.js'
import type { ServiceNodePermission } from '../database/types.js'

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

  register(config: ServiceConfig): void {
    // 注册服务实例
    this.services.set(config.serviceName, config.instance)
    
    // 注册方法元数据
    this.methodMetas.set(config.serviceName, config.methods)
    
    console.log(`[ServiceNodeRegistry] Registered service: ${config.serviceName} with ${config.methods.length} methods`)
  }

  get(serviceName: string): object | undefined {
    return this.services.get(serviceName)
  }

  async call(
    serviceName: string,
    method: string,
    args: unknown[]
  ): Promise<unknown> {
    // 获取服务实例
    const instance = this.services.get(serviceName)
    if (!instance) {
      throw new Error(`Service "${serviceName}" not registered`)
    }

    // 获取方法
    const fn = (instance as Record<string, unknown>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method "${method}" not found on service "${serviceName}"`)
    }

    // 调用方法
    return (fn as (...args: unknown[]) => Promise<unknown>)(...args)
  }

  getAllServices(): string[] {
    return Array.from(this.services.keys())
  }

  getServiceMethods(serviceName: string): ServiceMethodMeta[] {
    return this.methodMetas.get(serviceName) || []
  }

  async getAvailableNodes(userRole: string): Promise<ServiceNodePermission[]> {
    const roleHierarchy: Record<string, number> = {
      user: 0,
      pro: 1,
      admin: 2,
      super: 3,
    }

    const userLevel = roleHierarchy[userRole] ?? 0
    
    // 从数据库获取所有启用的服务节点权限
    const allNodes = await this.db.getAllServiceNodePermissions()
    
    // 过滤出用户有权限使用的节点
    return allNodes.filter(node => {
      if (!node.is_enabled) return false
      const nodeLevel = roleHierarchy[node.min_role] ?? 0
      return nodeLevel <= userLevel
    })
  }
}

// 单例
let registryInstance: ServiceNodeRegistry | null = null

export function getServiceNodeRegistry(db: DatabaseService): ServiceNodeRegistry {
  if (!registryInstance) {
    registryInstance = new ServiceNodeRegistry(db)
  }
  return registryInstance
}

export function resetServiceNodeRegistry(): void {
  registryInstance = null
}
```

## 4. 启动时注册服务

```typescript
// server/index.ts

import { getServiceNodeRegistry } from './services/service-node-registry.js'

// 初始化服务注册中心
const serviceRegistry = getServiceNodeRegistry(db)

// 注册 MiniMax 客户端
serviceRegistry.register({
  serviceName: 'minimaxClient',
  instance: minimaxClient,
  methods: [
    { name: 'chatCompletion', displayName: 'Text Generation', category: 'MiniMax API' },
    { name: 'imageGeneration', displayName: 'Image Generation', category: 'MiniMax API' },
    { name: 'videoGeneration', displayName: 'Video Generation', category: 'MiniMax API' },
    { name: 'textToAudioSync', displayName: 'Voice Sync', category: 'MiniMax API' },
    { name: 'textToAudioAsync', displayName: 'Voice Async', category: 'MiniMax API' },
    { name: 'musicGeneration', displayName: 'Music Generation', category: 'MiniMax API' },
  ],
})

// 注册数据库服务
serviceRegistry.register({
  serviceName: 'db',
  instance: db,
  methods: [
    { name: 'getPendingTasks', displayName: 'Get Pending Tasks', category: 'Database' },
    { name: 'createMediaRecord', displayName: 'Create Media Record', category: 'Database' },
    { name: 'updateTask', displayName: 'Update Task', category: 'Database' },
    { name: 'getTaskById', displayName: 'Get Task By ID', category: 'Database' },
  ],
})

// 注册容量检查器
serviceRegistry.register({
  serviceName: 'capacityChecker',
  instance: capacityChecker,
  methods: [
    { name: 'getRemainingCapacity', displayName: 'Get Remaining Capacity', category: 'Capacity' },
    { name: 'hasCapacity', displayName: 'Check Has Capacity', category: 'Capacity' },
    { name: 'getSafeExecutionLimit', displayName: 'Get Safe Execution Limit', category: 'Capacity' },
  ],
})

// 注册媒体存储
serviceRegistry.register({
  serviceName: 'mediaStorage',
  instance: {
    saveMediaFile,
    saveFromUrl,
  },
  methods: [
    { name: 'saveMediaFile', displayName: 'Save Media File', category: 'Media Storage' },
    { name: 'saveFromUrl', displayName: 'Save From URL', category: 'Media Storage' },
  ],
})
```

## 5. DatabaseService 方法

```typescript
// server/database/service-async.ts 新增方法

async getAllServiceNodePermissions(): Promise<ServiceNodePermission[]> {
  return this.db.all(`
    SELECT * FROM service_node_permissions 
    ORDER BY category, display_name
  `)
}

async getServiceNodePermission(
  serviceName: string,
  methodName: string
): Promise<ServiceNodePermission | null> {
  return this.db.get(`
    SELECT * FROM service_node_permissions 
    WHERE service_name = ? AND method_name = ?
  `, [serviceName, methodName])
}

async updateServiceNodePermission(
  id: string,
  data: { min_role?: string; is_enabled?: boolean }
): Promise<void> {
  const updates: string[] = []
  const values: unknown[] = []

  if (data.min_role !== undefined) {
    updates.push('min_role = ?')
    values.push(data.min_role)
  }
  if (data.is_enabled !== undefined) {
    updates.push('is_enabled = ?')
    values.push(data.is_enabled)
  }

  if (updates.length === 0) return

  values.push(id)
  await this.db.run(`
    UPDATE service_node_permissions 
    SET ${updates.join(', ')}
    WHERE id = ?
  `, values)
}
```

## 6. 实施步骤

1. 创建 `server/services/service-node-registry.ts`
2. 在 `server/database/service-async.ts` 添加查询方法
3. 在 `server/index.ts` 启动时注册所有服务
4. 编写单元测试

## 7. 验证检查清单

- [ ] ServiceNodeRegistry 类实现完成
- [ ] register() 方法正确注册服务
- [ ] call() 方法正确调用服务
- [ ] getAvailableNodes() 正确过滤权限
- [ ] DatabaseService 方法添加完成
- [ ] 启动时注册所有服务
- [ ] 单元测试通过