import { describe, it, expect } from 'vitest'
import { videoGenerateSchema } from '@mnx/shared-types/entities'

describe('videoGenerateSchema', () => {
  describe('合法输入', () => {
    it('最小输入：prompt 必填通过', () => {
      const result = videoGenerateSchema.safeParse({ prompt: '猫在奔跑' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.prompt).toBe('猫在奔跑')
      }
    })

    it('带可选字段通过', () => {
      const result = videoGenerateSchema.safeParse({
        prompt: 'x',
        first_frame_image: 'https://example.com/a.png',
        last_frame_image: 'https://example.com/b.png',
        callback_url: 'https://example.com/cb',
      })
      expect(result.success).toBe(true)
    })

    it('subject_reference 嵌套对象通过', () => {
      const result = videoGenerateSchema.safeParse({
        prompt: 'x',
        subject_reference: { image_id: 'img-1', description: '人物' },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('非法输入', () => {
    it('prompt 缺失', () => {
      const result = videoGenerateSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        const promptIssue = result.error.issues.find((i) => i.path[0] === 'prompt')
        expect(promptIssue).toBeDefined()
      }
    })

    it('prompt 空字符串', () => {
      const result = videoGenerateSchema.safeParse({ prompt: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const promptIssue = result.error.issues.find((i) => i.path[0] === 'prompt')
        expect(promptIssue?.message).toBe('prompt is required')
      }
    })

    it('callback_url 非合法 URL', () => {
      const result = videoGenerateSchema.safeParse({ prompt: 'x', callback_url: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('subject_reference.image_id 缺失', () => {
      const result = videoGenerateSchema.safeParse({
        prompt: 'x',
        subject_reference: { description: '无 image_id' },
      })
      expect(result.success).toBe(false)
    })
  })
})
