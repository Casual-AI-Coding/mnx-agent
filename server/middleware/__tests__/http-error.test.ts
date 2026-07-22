import { describe, it, expect } from 'vitest'
import {
  pickHttpStatusCode,
  pickHttpErrorMessage,
  pickHttpErrorStack,
  toErrorInstance,
  throwValidationError,
  isHttpValidationError,
} from '../http-error.js'

describe('http-error helpers', () => {
  describe('pickHttpStatusCode', () => {
    it('识别 status 字段', () => {
      expect(pickHttpStatusCode({ status: 400, message: 'bad' })).toBe(400)
      expect(pickHttpStatusCode({ status: 404 })).toBe(404)
      expect(pickHttpStatusCode({ status: 500 })).toBe(500)
    })

    it('status 优先于 code', () => {
      expect(pickHttpStatusCode({ status: 400, code: 500 })).toBe(400)
    })

    it('回退到 code 字段（向后兼容 Error.code 模式）', () => {
      expect(pickHttpStatusCode({ code: 422 })).toBe(422)
      expect(pickHttpStatusCode({ code: 503 })).toBe(503)
    })

    it('status 超出 [100, 600) 范围时忽略', () => {
      expect(pickHttpStatusCode({ status: 99 })).toBe(500)
      expect(pickHttpStatusCode({ status: 600 })).toBe(500)
      expect(pickHttpStatusCode({ status: -1 })).toBe(500)
    })

    it('code 超出范围同样忽略', () => {
      expect(pickHttpStatusCode({ code: 99 })).toBe(500)
      expect(pickHttpStatusCode({ code: 1000 })).toBe(500)
    })

    it('非数字 status/code 被忽略', () => {
      expect(pickHttpStatusCode({ status: '400' })).toBe(500)
      expect(pickHttpStatusCode({ code: true })).toBe(500)
      expect(pickHttpStatusCode({ status: NaN })).toBe(500)
      expect(pickHttpStatusCode({ status: Infinity })).toBe(500)
    })

    it('无任何字段时返回 500', () => {
      expect(pickHttpStatusCode({})).toBe(500)
      expect(pickHttpStatusCode(null)).toBe(500)
      expect(pickHttpStatusCode(undefined)).toBe(500)
      expect(pickHttpStatusCode('string')).toBe(500)
      expect(pickHttpStatusCode(42)).toBe(500)
    })

    it('识别 Error 实例的 code 属性', () => {
      const err: Error & { code?: number } = new Error('boom')
      err.code = 418
      expect(pickHttpStatusCode(err)).toBe(418)
    })
  })

  describe('pickHttpErrorMessage', () => {
    it('返回 message 字符串', () => {
      expect(pickHttpErrorMessage({ message: 'bad request' })).toBe('bad request')
      expect(pickHttpErrorMessage(new Error('oops'))).toBe('oops')
    })

    it('空字符串回退到 Unknown error', () => {
      expect(pickHttpErrorMessage({ message: '' })).toBe('Unknown error')
    })

    it('非字符串 message 回退', () => {
      expect(pickHttpErrorMessage({ message: 42 })).toBe('Unknown error')
      expect(pickHttpErrorMessage({ message: null })).toBe('Unknown error')
      expect(pickHttpErrorMessage({})).toBe('Unknown error')
      expect(pickHttpErrorMessage(null)).toBe('Unknown error')
    })
  })

  describe('pickHttpErrorStack', () => {
    it('返回 stack 字符串', () => {
      const err = new Error('boom')
      const stack = pickHttpErrorStack(err)
      expect(typeof stack).toBe('string')
      expect(stack).toContain('Error: boom')
    })

    it('非字符串 stack 返回 undefined', () => {
      expect(pickHttpErrorStack({ stack: 123 })).toBeUndefined()
      expect(pickHttpErrorStack({})).toBeUndefined()
      expect(pickHttpErrorStack(null)).toBeUndefined()
    })
  })

  describe('toErrorInstance', () => {
    it('Error 实例原样返回', () => {
      const err = new Error('original')
      expect(toErrorInstance(err)).toBe(err)
    })

    it('普通对象包装成 Error', () => {
      const wrapped = toErrorInstance({ status: 400, message: 'bad' })
      expect(wrapped).toBeInstanceOf(Error)
      expect(wrapped.message).toBe('bad')
    })

    it('无 message 对象使用 Unknown error', () => {
      const wrapped = toErrorInstance({})
      expect(wrapped.message).toBe('Unknown error')
    })

    it('字符串包装成 Error（pickHttpErrorMessage 不识别原始字符串，走 Unknown 兜底）', () => {
      const wrapped = toErrorInstance('plain string')
      expect(wrapped).toBeInstanceOf(Error)
      expect(wrapped.message).toBe('Unknown error')
    })
  })
})

describe('throwValidationError', () => {
  it('抛出 status=400 的对象', () => {
    expect(() => throwValidationError('bad input')).toThrow()
    try {
      throwValidationError('bad input')
    } catch (err) {
      expect(err).toEqual({ status: 400, message: 'bad input' })
    }
  })

  it('message 完整透传', () => {
    const cases = [
      'prompt is required',
      '纯音乐模式需要填写风格描述',
      'clone_prompt must be valid JSON string',
      '',
    ]
    for (const msg of cases) {
      try {
        throwValidationError(msg)
      } catch (err) {
        expect((err as { message: string }).message).toBe(msg)
      }
    }
  })

  it('返回类型为 never（throw 后代码视为 unreachable）', () => {
    // 这个测试验证 TS 编译期能力：throwValidationError 后的代码不应被当作可达
    function example(x: string): string {
      if (!x) {
        throwValidationError('x is required')
        // 此处 unreachable，TS 5.x 下 string 类型已收窄
      }
      return x.toUpperCase()
    }
    expect(example('hello')).toBe('HELLO')
  })
})

describe('isHttpValidationError', () => {
  it('识别 throwValidationError 抛出的对象', () => {
    try {
      throwValidationError('test')
    } catch (err) {
      expect(isHttpValidationError(err)).toBe(true)
    }
  })

  it('识别形状一致的对象（status=400 + message 字符串）', () => {
    expect(isHttpValidationError({ status: 400, message: 'bad' })).toBe(true)
  })

  it('拒绝非 400 status', () => {
    expect(isHttpValidationError({ status: 500, message: 'oops' })).toBe(false)
    expect(isHttpValidationError({ status: 404, message: 'not found' })).toBe(false)
  })

  it('拒绝非字符串 message', () => {
    expect(isHttpValidationError({ status: 400, message: 42 })).toBe(false)
    expect(isHttpValidationError({ status: 400, message: null })).toBe(false)
  })

  it('拒绝 null/undefined/原始值', () => {
    expect(isHttpValidationError(null)).toBe(false)
    expect(isHttpValidationError(undefined)).toBe(false)
    expect(isHttpValidationError('string')).toBe(false)
    expect(isHttpValidationError(42)).toBe(false)
  })

  it('拒绝缺少字段的对象', () => {
    expect(isHttpValidationError({ status: 400 })).toBe(false)
    expect(isHttpValidationError({ message: 'bad' })).toBe(false)
    expect(isHttpValidationError({})).toBe(false)
  })

  it('作为类型守卫使用时正确收窄', () => {
    const unknown: unknown = { status: 400, message: 'bad' }
    if (isHttpValidationError(unknown)) {
      // 此处 unknown 收窄为 HttpValidationError，TS 知道 status 和 message 字段
      expect(unknown.status).toBe(400)
      expect(unknown.message.length).toBeGreaterThan(0)
    } else {
      throw new Error('should narrow to true')
    }
  })
})
