import { describe, it, expect } from 'vitest'
import { videoAgentGenerateSchema } from '@mnx/shared-types/entities'

describe('videoAgentGenerateSchema', () => {
  describe('合法输入', () => {
    it('最小输入：template_id 必填通过', () => {
      const result = videoAgentGenerateSchema.safeParse({ template_id: 'tmpl-1' })
      expect(result.success).toBe(true)
    })

    it('带 text_inputs / media_inputs 数组通过', () => {
      const result = videoAgentGenerateSchema.safeParse({
        template_id: 'tmpl-1',
        text_inputs: [{ value: 'hello' }, { value: 'world' }],
        media_inputs: [{ value: 'media-1' }],
        callback_url: 'https://example.com/cb',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('非法输入', () => {
    it('template_id 缺失', () => {
      const result = videoAgentGenerateSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === 'template_id')
        expect(issue).toBeDefined()
      }
    })

    it('template_id 空字符串', () => {
      const result = videoAgentGenerateSchema.safeParse({ template_id: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === 'template_id')
        expect(issue?.message).toBe('template_id is required')
      }
    })

    it('text_inputs 数组内元素 value 空字符串', () => {
      const result = videoAgentGenerateSchema.safeParse({
        template_id: 'tmpl-1',
        text_inputs: [{ value: '' }],
      })
      expect(result.success).toBe(false)
    })

    it('callback_url 非合法 URL', () => {
      const result = videoAgentGenerateSchema.safeParse({
        template_id: 'tmpl-1',
        callback_url: 'bad',
      })
      expect(result.success).toBe(false)
    })
  })
})
