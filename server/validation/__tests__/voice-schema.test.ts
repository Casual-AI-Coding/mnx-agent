import { describe, expect, it } from 'vitest'
import { voiceSyncSchema, voiceAsyncSchema } from '@mnx/shared-types/entities'

describe('voiceSyncSchema', () => {
  describe('合法输入', () => {
    it('最小合法输入（仅 text），model 填入默认值 speech-01', () => {
      const parsed = voiceSyncSchema.parse({ text: '你好' })
      expect(parsed.text).toBe('你好')
      expect(parsed.model).toBe('speech-01')
    })

    it('显式 model 覆盖默认值', () => {
      const parsed = voiceSyncSchema.parse({ text: '你好', model: 'speech-02' })
      expect(parsed.model).toBe('speech-02')
    })

    it('stream 字段通过', () => {
      const parsed = voiceSyncSchema.parse({ text: '你好', stream: true })
      expect(parsed.stream).toBe(true)
    })
  })

  describe('拒绝非法输入', () => {
    it('text 缺失被拒', () => {
      const result = voiceSyncSchema.safeParse({})
      expect(result.success).toBe(false)
      // zod 对缺失 required 字段返回 invalid_type；对空字符串触发 min(1) 自定义 message
      expect(result.success === false && result.error.issues.some(i => i.path[0] === 'text')).toBe(true)
    })

    it('text 为空字符串被拒', () => {
      const result = voiceSyncSchema.safeParse({ text: '' })
      expect(result.success).toBe(false)
    })

    it('stream 类型错误被拒', () => {
      const result = voiceSyncSchema.safeParse({ text: '你好', stream: 'yes' })
      expect(result.success).toBe(false)
    })

    it('model 类型错误被拒', () => {
      const result = voiceSyncSchema.safeParse({ text: '你好', model: 123 })
      expect(result.success).toBe(false)
    })
  })
})

describe('voiceAsyncSchema', () => {
  describe('合法输入', () => {
    it('最小合法输入（仅 text），model 填入默认值 speech-01', () => {
      const parsed = voiceAsyncSchema.parse({ text: '你好' })
      expect(parsed.text).toBe('你好')
      expect(parsed.model).toBe('speech-01')
    })

    it('合法 callback_url 通过', () => {
      const parsed = voiceAsyncSchema.parse({ text: '你好', callback_url: 'https://example.com/cb' })
      expect(parsed.callback_url).toBe('https://example.com/cb')
    })

    it('callback_url 缺省（undefined）通过', () => {
      const parsed = voiceAsyncSchema.parse({ text: '你好' })
      expect(parsed.callback_url).toBeUndefined()
    })
  })

  describe('拒绝非法输入', () => {
    it('text 缺失被拒', () => {
      const result = voiceAsyncSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('非法 callback_url（非 URL）被拒', () => {
      const result = voiceAsyncSchema.safeParse({ text: '你好', callback_url: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('非法 callback_url（无协议）被拒', () => {
      const result = voiceAsyncSchema.safeParse({ text: '你好', callback_url: 'example.com' })
      expect(result.success).toBe(false)
    })
  })
})
