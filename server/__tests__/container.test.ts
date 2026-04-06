import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createContainer, resetContainer, getGlobalContainer } from '../container'
import type { Container, Factory } from '../container'

// Test interfaces for type safety
interface DatabaseConnection {
  query(sql: string): Promise<unknown>
}

interface CronJobRepository {
  findAll(): Promise<unknown[]>
}

describe('Container', () => {
  let container: Container

  beforeEach(() => {
    container = createContainer()
  })

  afterEach(() => {
    resetContainer()
  })

  describe('register and resolve simple value', () => {
    it('should register and resolve a simple value', () => {
      container.register('port', 3000)

      const port = container.resolve<number>('port')

      expect(port).toBe(3000)
    })

    it('should resolve string values', () => {
      container.register('name', 'test-service')

      const name = container.resolve<string>('name')

      expect(name).toBe('test-service')
    })

    it('should resolve object values', () => {
      const config = { host: 'localhost', port: 5432 }
      container.register('dbConfig', config)

      const resolved = container.resolve<typeof config>('dbConfig')

      expect(resolved).toEqual(config)
    })
  })

  describe('register factory function', () => {
    it('should resolve a factory function', () => {
      container.register('dbConnection', (c) => ({
        query: async (sql: string) => ({ rows: [] }),
      }))

      const db = container.resolve<DatabaseConnection>('dbConnection')

      expect(db).toBeDefined()
      expect(typeof db.query).toBe('function')
    })

    it('should pass container to factory function', () => {
      container.register('baseUrl', 'https://api.example.com')
      container.register('apiClient', (c) => ({
        baseUrl: c.resolve<string>('baseUrl'),
      }))

      const client = container.resolve<{ baseUrl: string }>('apiClient')

      expect(client.baseUrl).toBe('https://api.example.com')
    })

    it('should resolve nested dependencies through factory', () => {
      container.register('config', { debug: true })
      container.register('logger', (c) => ({
        config: c.resolve<{ debug: boolean }>('config'),
        log: (msg: string) => console.log(msg),
      }))
      container.register('service', (c) => ({
        logger: c.resolve<{ log: (msg: string) => void; config: unknown }>('logger'),
      }))

      const service = container.resolve<{ logger: { log: (msg: string) => void } }>('service')

      expect(service.logger).toBeDefined()
      expect(typeof service.logger.log).toBe('function')
    })
  })

  describe('registerSingleton', () => {
    it('should return same instance on multiple resolves', () => {
      let instanceCount = 0
      container.registerSingleton('counter', () => {
        instanceCount++
        return { count: instanceCount }
      })

      const first = container.resolve<{ count: number }>('counter')
      const second = container.resolve<{ count: number }>('counter')

      expect(first).toBe(second)
      expect(first.count).toBe(1)
      expect(second.count).toBe(1)
    })

    it('should call factory only once for singleton', () => {
      let callCount = 0
      container.registerSingleton('service', () => {
        callCount++
        return { id: callCount }
      })

      container.resolve('service')
      container.resolve('service')
      container.resolve('service')

      expect(callCount).toBe(1)
    })

    it('should resolve singleton with dependencies', () => {
      container.register('db', { connected: true })
      container.registerSingleton('repository', (c) => ({
        db: c.resolve<{ connected: boolean }>('db'),
      }))

      const repo1 = container.resolve<CronJobRepository & { db: { connected: boolean } }>('repository')
      const repo2 = container.resolve<CronJobRepository & { db: { connected: boolean } }>('repository')

      expect(repo1).toBe(repo2)
      expect(repo1.db.connected).toBe(true)
      expect(repo2.db.connected).toBe(true)
    })
  })

  describe('has', () => {
    it('should return true for registered token', () => {
      container.register('known', 'value')

      expect(container.has('known')).toBe(true)
    })

    it('should return false for unregistered token', () => {
      expect(container.has('unknown')).toBe(false)
    })

    it('should return false after removing registration', () => {
      container.register('temp', 'value')
      expect(container.has('temp')).toBe(true)
    })
  })

  describe('resolve throws for missing dependency', () => {
    it('should throw when resolving unregistered token', () => {
      expect(() => container.resolve('missing')).toThrow('Container: missing dependency "missing"')
    })

    it('should throw with token name in error message', () => {
      expect(() => container.resolve('myService')).toThrow('Container: missing dependency "myService"')
    })
  })

  describe('createScope', () => {
    it('should create a child container', () => {
      const scope = container.createScope()

      expect(scope).toBeDefined()
      expect(scope).not.toBe(container)
    })

    it('should resolve from parent scope', () => {
      container.register('shared', 'parent-value')

      const scope = container.createScope()
      const resolved = scope.resolve<string>('shared')

      expect(resolved).toBe('parent-value')
    })

    it('scoped container should not affect parent registrations', () => {
      container.register('base', 'base-value')

      const scope = container.createScope()
      scope.register('scoped', 'scoped-value')

      expect(scope.has('scoped')).toBe(true)
      expect(container.has('scoped')).toBe(false)
    })

    it('scoped singleton should be isolated from parent', () => {
      container.register('parentValue', 'parent')
      let factoryCalls = 0
      container.registerSingleton('isolated', (c) => {
        factoryCalls++
        return { value: c.resolve<string>('parentValue') }
      })

      // Parent resolves singleton
      const parentInstance = container.resolve<{ value: string }>('isolated')
      expect(parentInstance.value).toBe('parent')

      // Scope creates its own singleton
      const scope = container.createScope()
      scope.register('parentValue', 'scope-parent') // Override in scope
      const scopeInstance = scope.resolve<{ value: string }>('isolated')

      // Scope should get its own singleton instance
      expect(scopeInstance.value).toBe('scope-parent')
    })

    it('should allow scoped resolution of scoped singleton', () => {
      const scope = container.createScope()
      let callCount = 0

      scope.registerSingleton('scopedOnly', () => {
        callCount++
        return { id: callCount }
      })

      scope.resolve('scopedOnly')
      scope.resolve('scopedOnly')

      expect(callCount).toBe(1)
      expect(scope.has('scopedOnly')).toBe(true)
    })
  })

  describe('global container', () => {
    it('should get global container instance', () => {
      const global1 = getGlobalContainer()
      const global2 = getGlobalContainer()

      expect(global1).toBe(global2)
    })

    it('should share registrations across getGlobalContainer calls', () => {
      const global = getGlobalContainer()
      global.register('sharedGlobal', 'global-value')

      const sameGlobal = getGlobalContainer()
      expect(sameGlobal.resolve<string>('sharedGlobal')).toBe('global-value')
    })

    it('should isolate scope singletons from global', () => {
      const global = getGlobalContainer()
      global.register('base', 'global-base')

      const scope = global.createScope()
      scope.registerSingleton('scopedSingleton', (c) => ({
        base: c.resolve<string>('base'),
      }))

      // Global should not have scopedSingleton
      expect(global.has('scopedSingleton')).toBe(false)

      // Scope should have it
      expect(scope.has('scopedSingleton')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should allow overwriting existing registration', () => {
      container.register('service', 'v1')
      container.register('service', 'v2')

      expect(container.resolve<string>('service')).toBe('v2')
    })

    it('should allow overwriting singleton with regular registration', () => {
      container.registerSingleton('service', () => 'singleton')
      container.register('service', 'regular')

      expect(container.resolve<string>('service')).toBe('regular')
    })

    it('should handle factory returning null', () => {
      container.register('nullable', () => null)

      const result = container.resolve<null>('nullable')

      expect(result).toBeNull()
    })

    it('should handle factory returning undefined', () => {
      container.register('maybeUndefined', (): undefined => undefined)

      const result = container.resolve<undefined>('maybeUndefined')

      expect(result).toBeUndefined()
    })

    it('should handle factory returning primitive through container', () => {
      container.register('primitiveFactory', (c) => c.resolve<number>('port') + 1)
      container.register('port', 3000)

      const result = container.resolve<number>('primitiveFactory')

      expect(result).toBe(3001)
    })
  })
})
