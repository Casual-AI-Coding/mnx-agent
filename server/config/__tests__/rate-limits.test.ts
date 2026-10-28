import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  __resetRateLimitsStateForTests,
  configureRateLimitOverrides,
  ensureRateLimitsFresh,
  getEffectiveServiceRateLimits,
  getRateLimitForService,
  parseRateLimitOverrides,
  resetRateLimitOverrides,
  validateRateLimitOverrides,
} from '../rate-limits'

describe('rate-limits 动态覆盖', () => {
  beforeEach(() => {
    __resetRateLimitsStateForTests()
    resetRateLimitOverrides()
  })

  describe('parseRateLimitOverrides', () => {
    it('解析合法的 service=rpm 逗号分隔配置', () => {
      expect(parseRateLimitOverrides('text=500,video=8')).toEqual({ text: 500, video: 8 })
    })

    it('空字符串返回空覆盖', () => {
      expect(parseRateLimitOverrides('')).toEqual({})
      expect(parseRateLimitOverrides('  ')).toEqual({})
    })

    it('拒绝未知服务与非法格式', () => {
      expect(() => parseRateLimitOverrides('foo=100')).toThrow(/无效的速率限制条目/)
      expect(() => parseRateLimitOverrides('text')).toThrow(/无效的速率限制条目/)
      expect(() => parseRateLimitOverrides('text=abc')).toThrow(/无效的速率限制条目/)
    })

    it('拒绝超范围 rpm', () => {
      expect(() => parseRateLimitOverrides('text=0')).toThrow(/rpm 超出合法范围/)
      expect(() => parseRateLimitOverrides('text=100001')).toThrow(/rpm 超出合法范围/)
    })
  })

  describe('validateRateLimitOverrides', () => {
    it('合法配置返回 null，非法返回错误消息', () => {
      expect(validateRateLimitOverrides('image=20')).toBeNull()
      expect(validateRateLimitOverrides('bad')).not.toBeNull()
    })
  })

  describe('getRateLimitForService', () => {
    it('无覆盖时回退静态默认值', () => {
      expect(getRateLimitForService('text')).toBe(500)
      expect(getRateLimitForService('video')).toBe(5)
      expect(getRateLimitForService('unknown')).toBe(100)
    })

    it('覆盖后返回新值', () => {
      configureRateLimitOverrides('text=100,video=50')
      expect(getRateLimitForService('text')).toBe(100)
      expect(getRateLimitForService('video')).toBe(50)
      expect(getRateLimitForService('image')).toBe(10)
    })
  })

  describe('getEffectiveServiceRateLimits', () => {
    it('合并视图带 overridden 标记', () => {
      configureRateLimitOverrides('text=1')
      const effective = getEffectiveServiceRateLimits()
      expect(effective.text).toEqual({ rpm: 1, overridden: true })
      expect(effective.video).toEqual({ rpm: 5, overridden: false })
    })
  })

  describe('ensureRateLimitsFresh', () => {
    it('从 provider 拉取配置并生效', async () => {
      const provider = {
        getSystemConfigByKey: vi.fn().mockResolvedValue({ value: 'music=3' }),
      }
      await ensureRateLimitsFresh(provider)
      expect(getRateLimitForService('music')).toBe(3)
    })

    it('配置缺失时回退默认', async () => {
      configureRateLimitOverrides('music=3')
      const provider = {
        getSystemConfigByKey: vi.fn().mockResolvedValue(null),
      }
      await ensureRateLimitsFresh(provider)
      expect(getRateLimitForService('music')).toBe(10)
    })
  })
})
