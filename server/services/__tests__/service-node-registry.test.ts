import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { DatabaseService } from '../../database/service-async.js'
import type { ServiceNodePermission } from '../../database/types.js'
import { ServiceNodeRegistry, getServiceNodeRegistry, resetServiceNodeRegistry, type ServiceConfig, type ServiceMethodMeta } from '../service-node-registry.js'

vi.mock('../../lib/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('ServiceNodeRegistry', () => {
  let mockDb: {
    upsertServiceNodePermission: ReturnType<typeof vi.fn>
    getAllServiceNodePermissions: ReturnType<typeof vi.fn>
  }

  const createMockService = (methods: Record<string, unknown>) => methods

  const createMockServiceConfig = (serviceName: string, methods: ServiceMethodMeta[], instance: object): ServiceConfig => ({
    serviceName,
    methods,
    instance
  })

  beforeEach(() => {
    resetServiceNodeRegistry()
    vi.clearAllMocks()

    mockDb = {
      upsertServiceNodePermission: vi.fn().mockResolvedValue({}),
      getAllServiceNodePermissions: vi.fn().mockResolvedValue([])
    }
  })

  afterEach(() => {
    resetServiceNodeRegistry()
  })

  describe('constructor', () => {
    it('should create registry instance with database service', () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      expect(registry).toBeDefined()
    })
  })

  describe('register', () => {
    it('should register a service and store its instance', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockService = createMockService({
        doSomething: vi.fn().mockResolvedValue('result')
      })
      const methods: ServiceMethodMeta[] = [
        { name: 'doSomething', displayName: 'Do Something', category: 'test' }
      ]
      const config = createMockServiceConfig('testService', methods, mockService)

      await registry.register(config)

      expect(registry.get('testService')).toBe(mockService)
    })

    it('should store method metadata', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockService = createMockService({})
      const methods: ServiceMethodMeta[] = [
        { name: 'method1', displayName: 'Method 1', category: 'cat1', description: 'desc1' },
        { name: 'method2', displayName: 'Method 2', category: 'cat2' }
      ]
      const config = createMockServiceConfig('testService', methods, mockService)

      await registry.register(config)

      const storedMethods = registry.getServiceMethods('testService')
      expect(storedMethods).toHaveLength(2)
      expect(storedMethods[0].name).toBe('method1')
      expect(storedMethods[0].description).toBe('desc1')
    })

    it('should upsert permissions for each method in database', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockService = createMockService({})
      const methods: ServiceMethodMeta[] = [
        { name: 'doThing', displayName: 'Do Thing', category: 'actions' }
      ]
      const config = createMockServiceConfig('myService', methods, mockService)

      await registry.register(config)

      expect(mockDb.upsertServiceNodePermission).toHaveBeenCalledWith({
        service_name: 'myService',
        method_name: 'doThing',
        display_name: 'Do Thing',
        category: 'actions',
        min_role: 'pro',
        is_enabled: true
      })
    })

    it('should continue registering even if database upsert fails for one method', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockService = createMockService({})
      const methods: ServiceMethodMeta[] = [
        { name: 'successMethod', displayName: 'Success', category: 'cat' },
        { name: 'failMethod', displayName: 'Fail', category: 'cat' }
      ]
      const config = createMockServiceConfig('myService', methods, mockService)

      mockDb.upsertServiceNodePermission
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DB error'))

      await registry.register(config)

      expect(registry.get('myService')).toBeDefined()
      expect(registry.getServiceMethods('myService')).toHaveLength(2)
    })

    it('should allow registering multiple services', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const service1 = createMockService({})
      const service2 = createMockService({})

      await registry.register(createMockServiceConfig('service1', [{ name: 'm1', displayName: 'M1', category: 'c' }], service1))
      await registry.register(createMockServiceConfig('service2', [{ name: 'm2', displayName: 'M2', category: 'c' }], service2))

      expect(registry.getAllServices()).toContain('service1')
      expect(registry.getAllServices()).toContain('service2')
    })

    it('should overwrite existing service if registered again', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const service1 = createMockService({ fn1: vi.fn() })
      const service2 = createMockService({ fn2: vi.fn() })

      await registry.register(createMockServiceConfig('sameService', [{ name: 'fn1', displayName: 'Fn1', category: 'c' }], service1))
      await registry.register(createMockServiceConfig('sameService', [{ name: 'fn2', displayName: 'Fn2', category: 'c' }], service2))

      expect(registry.get('sameService')).toBe(service2)
      expect(registry.getServiceMethods('sameService')).toHaveLength(1)
      expect(registry.getServiceMethods('sameService')[0].name).toBe('fn2')
    })
  })

  describe('get', () => {
    it('should return registered service instance', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockService = createMockService({})
      await registry.register(createMockServiceConfig('myService', [], mockService))

      expect(registry.get('myService')).toBe(mockService)
    })

    it('should return undefined for unregistered service', () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)

      expect(registry.get('nonexistent')).toBeUndefined()
    })
  })

  describe('call', () => {
    it('should call a registered method with arguments', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockFn = vi.fn().mockResolvedValue('result')
      const mockService = createMockService({ myMethod: mockFn })
      await registry.register(createMockServiceConfig('calc', [{ name: 'myMethod', displayName: 'My Method', category: 'math' }], mockService))

      const result = await registry.call('calc', 'myMethod', ['arg1', 'arg2'])

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(result).toBe('result')
    })

    it('should throw error when service not registered', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)

      await expect(registry.call('unknownService', 'method', [])).rejects.toThrow(
        'Service "unknownService" not registered'
      )
    })

    it('should throw error when method not found on service', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockService = createMockService({})
      await registry.register(createMockServiceConfig('myService', [], mockService))

      await expect(registry.call('myService', 'nonexistentMethod', [])).rejects.toThrow(
        'Method "nonexistentMethod" not found on service "myService"'
      )
    })

    it('should throw error when property is not a function', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockService = { notAFunction: 'string value' } as unknown as Record<string, unknown>
      await registry.register(createMockServiceConfig('myService', [], mockService))

      await expect(registry.call('myService', 'notAFunction', [])).rejects.toThrow(
        'Method "notAFunction" not found on service "myService"'
      )
    })

    it('should handle methods that return non-promise values', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockFn = vi.fn().mockReturnValue('sync result')
      const mockService = createMockService({ syncMethod: mockFn })
      await registry.register(createMockServiceConfig('myService', [{ name: 'syncMethod', displayName: 'Sync', category: 'c' }], mockService))

      const result = await registry.call('myService', 'syncMethod', [])

      expect(result).toBe('sync result')
    })

    it('should handle methods that throw errors', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockFn = vi.fn().mockRejectedValue(new Error('Method failed'))
      const mockService = createMockService({ failingMethod: mockFn })
      await registry.register(createMockServiceConfig('myService', [{ name: 'failingMethod', displayName: 'Fail', category: 'c' }], mockService))

      await expect(registry.call('myService', 'failingMethod', [])).rejects.toThrow('Method failed')
    })

    it('should bind context correctly to methods', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const mockService = {
        value: 42,
        getValue: function() { return this.value }
      }
      await registry.register(createMockServiceConfig('ctxService', [{ name: 'getValue', displayName: 'Get', category: 'c' }], mockService))

      const result = await registry.call('ctxService', 'getValue', [])

      expect(result).toBe(42)
    })
  })

  describe('getAllServices', () => {
    it('should return empty array when no services registered', () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)

      expect(registry.getAllServices()).toEqual([])
    })

    it('should return array of all registered service names', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      await registry.register(createMockServiceConfig('service1', [], createMockService({})))
      await registry.register(createMockServiceConfig('service2', [], createMockService({})))
      await registry.register(createMockServiceConfig('service3', [], createMockService({})))

      const services = registry.getAllServices()

      expect(services).toHaveLength(3)
      expect(services).toContain('service1')
      expect(services).toContain('service2')
      expect(services).toContain('service3')
    })

    it('should not include services registered and then overwritten', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      await registry.register(createMockServiceConfig('sameName', [], createMockService({})))
      await registry.register(createMockServiceConfig('sameName', [], createMockService({})))

      expect(registry.getAllServices()).toHaveLength(1)
    })
  })

  describe('getServiceMethods', () => {
    it('should return empty array for unregistered service', () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)

      expect(registry.getServiceMethods('unknownService')).toEqual([])
    })

    it('should return all method metadata for registered service', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const methods: ServiceMethodMeta[] = [
        { name: 'methodA', displayName: 'Method A', category: 'cat1', description: 'A method' },
        { name: 'methodB', displayName: 'Method B', category: 'cat2' }
      ]
      await registry.register(createMockServiceConfig('myService', methods, createMockService({})))

      const result = registry.getServiceMethods('myService')

      expect(result).toEqual(methods)
    })

    it('should return array of methods for registered service', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      await registry.register(createMockServiceConfig('myService', [
        { name: 'm1', displayName: 'M1', category: 'c' }
      ], createMockService({})))

      const result1 = registry.getServiceMethods('myService')
      const result2 = registry.getServiceMethods('myService')

      expect(result1).toEqual(result2)
    })
  })

  describe('getAvailableNodes', () => {
    const mockPermissions: ServiceNodePermission[] = [
      {
        id: 'perm-1',
        service_name: 'textService',
        method_name: 'generate',
        display_name: 'Generate Text',
        category: 'ai',
        min_role: 'user',
        is_enabled: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: 'perm-2',
        service_name: 'textService',
        method_name: 'advanced',
        display_name: 'Advanced Generate',
        category: 'ai',
        min_role: 'pro',
        is_enabled: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: 'perm-3',
        service_name: 'adminService',
        method_name: 'adminOnly',
        display_name: 'Admin Only',
        category: 'admin',
        min_role: 'super',
        is_enabled: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: 'perm-4',
        service_name: 'textService',
        method_name: 'disabled',
        display_name: 'Disabled',
        category: 'ai',
        min_role: 'user',
        is_enabled: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    ]

    it('should return all enabled nodes for user role', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      mockDb.getAllServiceNodePermissions.mockResolvedValue(mockPermissions)

      const result = await registry.getAvailableNodes('user')

      expect(result).toHaveLength(1)
      expect(result[0].method_name).toBe('generate')
    })

    it('should include pro nodes for pro user', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      mockDb.getAllServiceNodePermissions.mockResolvedValue(mockPermissions)

      const result = await registry.getAvailableNodes('pro')

      expect(result).toHaveLength(2)
      expect(result.map(n => n.method_name)).toContain('generate')
      expect(result.map(n => n.method_name)).toContain('advanced')
    })

    it('should include all nodes for super user', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      mockDb.getAllServiceNodePermissions.mockResolvedValue(mockPermissions)

      const result = await registry.getAvailableNodes('super')

      expect(result).toHaveLength(3)
      expect(result.map(n => n.method_name)).toContain('generate')
      expect(result.map(n => n.method_name)).toContain('advanced')
      expect(result.map(n => n.method_name)).toContain('adminOnly')
    })

    it('should exclude disabled nodes regardless of role', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      mockDb.getAllServiceNodePermissions.mockResolvedValue(mockPermissions)

      const result = await registry.getAvailableNodes('super')

      expect(result.map(n => n.method_name)).not.toContain('disabled')
    })

    it('should return empty array when no permissions match', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      mockDb.getAllServiceNodePermissions.mockResolvedValue([])

      const result = await registry.getAvailableNodes('user')

      expect(result).toEqual([])
    })

    it('should handle unknown role as level 0 (user level)', async () => {
      const registry = new ServiceNodeRegistry(mockDb as unknown as DatabaseService)
      mockDb.getAllServiceNodePermissions.mockResolvedValue(mockPermissions)

      const result = await registry.getAvailableNodes('unknownRole')

      // Unknown role gets level 0 (same as 'user'), so can access user-level nodes
      expect(result).toHaveLength(1)
      expect(result[0].method_name).toBe('generate')
    })
  })
})

describe('Singleton Functions', () => {
  let mockDb: {
    upsertServiceNodePermission: ReturnType<typeof vi.fn>
    getAllServiceNodePermissions: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    resetServiceNodeRegistry()
    vi.clearAllMocks()

    mockDb = {
      upsertServiceNodePermission: vi.fn().mockResolvedValue({}),
      getAllServiceNodePermissions: vi.fn().mockResolvedValue([])
    }
  })

  afterEach(() => {
    resetServiceNodeRegistry()
  })

  describe('getServiceNodeRegistry', () => {
    it('should return a ServiceNodeRegistry instance', () => {
      const registry = getServiceNodeRegistry(mockDb as unknown as DatabaseService)

      expect(registry).toBeInstanceOf(ServiceNodeRegistry)
    })

    it('should return the same instance on multiple calls', () => {
      const registry1 = getServiceNodeRegistry(mockDb as unknown as DatabaseService)
      const registry2 = getServiceNodeRegistry(mockDb as unknown as DatabaseService)

      expect(registry1).toBe(registry2)
    })

    it('should create new instance after reset', () => {
      const registry1 = getServiceNodeRegistry(mockDb as unknown as DatabaseService)
      resetServiceNodeRegistry()
      const registry2 = getServiceNodeRegistry(mockDb as unknown as DatabaseService)

      expect(registry1).not.toBe(registry2)
    })
  })

  describe('resetServiceNodeRegistry', () => {
    it('should reset the singleton to null', () => {
      const registry = getServiceNodeRegistry(mockDb as unknown as DatabaseService)
      expect(registry).toBeDefined()

      resetServiceNodeRegistry()

      // After reset, a new instance should be created
      const newRegistry = getServiceNodeRegistry(mockDb as unknown as DatabaseService)
      expect(newRegistry).toBeDefined()
      expect(newRegistry).not.toBe(registry)
    })

    it('should allow re-registration after reset', async () => {
      const registry1 = getServiceNodeRegistry(mockDb as unknown as DatabaseService)
      await registry1.register({
        serviceName: 'testService',
        instance: { test: vi.fn() },
        methods: [{ name: 'test', displayName: 'Test', category: 'c' }]
      })
      resetServiceNodeRegistry()

      const registry2 = getServiceNodeRegistry(mockDb as unknown as DatabaseService)
      await registry2.register({
        serviceName: 'testService',
        instance: { test: vi.fn() },
        methods: [{ name: 'test', displayName: 'Test', category: 'c' }]
      })

      expect(registry2.get('testService')).toBeDefined()
    })
  })
})

describe('ServiceMethodMeta Interface', () => {
  it('should accept valid method metadata structure', () => {
    const meta: ServiceMethodMeta = {
      name: 'myMethod',
      displayName: 'My Method',
      category: 'ai',
      description: 'Does something amazing'
    }

    expect(meta.name).toBe('myMethod')
    expect(meta.displayName).toBe('My Method')
    expect(meta.category).toBe('ai')
    expect(meta.description).toBe('Does something amazing')
  })

  it('should allow optional description to be omitted', () => {
    const meta: ServiceMethodMeta = {
      name: 'myMethod',
      displayName: 'My Method',
      category: 'ai'
    }

    expect(meta.description).toBeUndefined()
  })
})

describe('ServiceConfig Interface', () => {
  it('should accept valid service configuration', () => {
    const config: ServiceConfig = {
      serviceName: 'myService',
      instance: { myMethod: vi.fn() },
      methods: [
        { name: 'myMethod', displayName: 'My Method', category: 'utility' }
      ]
    }

    expect(config.serviceName).toBe('myService')
    expect(config.instance).toBeDefined()
    expect(config.methods).toHaveLength(1)
  })
})
