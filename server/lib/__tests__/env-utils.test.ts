import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isTestEnvironmentGuard } from '../env-utils.js'

describe('env-utils', () => {
  describe('isTestEnvironmentGuard', () => {
    const originalNodeEnv = process.env.NODE_ENV

    beforeEach(() => {
      // 每个用例前重置
      delete process.env.NODE_ENV
    })

    afterEach(() => {
      // 恢复原始值（vitest 运行时通常 NODE_ENV=test）
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = originalNodeEnv
      }
    })

    it('在 NODE_ENV=test 时返回 true', () => {
      process.env.NODE_ENV = 'test'
      expect(isTestEnvironmentGuard()).toBe(true)
    })

    it('在 NODE_ENV=development 时返回 false', () => {
      process.env.NODE_ENV = 'development'
      expect(isTestEnvironmentGuard()).toBe(false)
    })

    it('在 NODE_ENV=production 时返回 false', () => {
      process.env.NODE_ENV = 'production'
      expect(isTestEnvironmentGuard()).toBe(false)
    })

    it('在 NODE_ENV=staging 时返回 false', () => {
      process.env.NODE_ENV = 'staging'
      expect(isTestEnvironmentGuard()).toBe(false)
    })

    it('在 NODE_ENV 未设置时返回 false', () => {
      delete process.env.NODE_ENV
      expect(isTestEnvironmentGuard()).toBe(false)
    })

    it('大小写敏感：NODE_ENV=Test 不匹配', () => {
      process.env.NODE_ENV = 'Test'
      expect(isTestEnvironmentGuard()).toBe(false)
    })
  })
})
