import { describe, expect, it } from 'vitest'
import { imageGenerateSchema } from '@mnx/shared-types/entities'

describe('imageGenerateSchema', () => {
  describe('合法输入', () => {
    it('最小合法输入（仅 prompt），model 填入默认值 image-01', () => {
      const parsed = imageGenerateSchema.parse({ prompt: '一只猫' })
      expect(parsed.prompt).toBe('一只猫')
      expect(parsed.model).toBe('image-01')
    })

    it('显式 model 字段时覆盖默认值', () => {
      const parsed = imageGenerateSchema.parse({ prompt: '一只猫', model: 'image-02' })
      expect(parsed.model).toBe('image-02')
    })

    it('全部可选字段一次性通过', () => {
      const parsed = imageGenerateSchema.parse({
        model: 'image-02',
        prompt: '一只猫',
        n: 2,
        num_images: 3,
        prompt_optimizer: true,
        aspect_ratio: '16:9',
        width: 1024,
        height: 768,
        seed: 42,
        style: 'cyberpunk',
        aigc_watermark: false,
      })
      expect(parsed.n).toBe(2)
      expect(parsed.num_images).toBe(3)
      expect(parsed.prompt_optimizer).toBe(true)
      expect(parsed.aspect_ratio).toBe('16:9')
      expect(parsed.width).toBe(1024)
      expect(parsed.height).toBe(768)
      expect(parsed.seed).toBe(42)
      expect(parsed.style).toBe('cyberpunk')
      expect(parsed.aigc_watermark).toBe(false)
    })

    it('允许只传部分可选字段', () => {
      const parsed = imageGenerateSchema.parse({ prompt: 'x', width: 512 })
      expect(parsed.width).toBe(512)
      expect(parsed.height).toBeUndefined()
      expect(parsed.n).toBeUndefined()
    })
  })

  describe('拒绝非法输入', () => {
    it('prompt 缺失被拒', () => {
      const result = imageGenerateSchema.safeParse({})
      expect(result.success).toBe(false)
      // zod 对缺失 required 字段返回 invalid_type；对空字符串触发 min(1) 自定义 message
      expect(result.success === false && result.error.issues.some(i => i.path[0] === 'prompt')).toBe(true)
    })

    it('prompt 为空字符串被拒', () => {
      const result = imageGenerateSchema.safeParse({ prompt: '' })
      expect(result.success).toBe(false)
    })

    it('n 为负数被拒', () => {
      const result = imageGenerateSchema.safeParse({ prompt: 'x', n: -1 })
      expect(result.success).toBe(false)
    })

    it('n 为非整数被拒', () => {
      const result = imageGenerateSchema.safeParse({ prompt: 'x', n: 1.5 })
      expect(result.success).toBe(false)
    })

    it('width 为 0 被拒（必须正整数）', () => {
      const result = imageGenerateSchema.safeParse({ prompt: 'x', width: 0 })
      expect(result.success).toBe(false)
    })

    it('prompt_optimizer 类型错误被拒', () => {
      const result = imageGenerateSchema.safeParse({ prompt: 'x', prompt_optimizer: 'yes' })
      expect(result.success).toBe(false)
    })

    it('aigc_watermark 类型错误被拒', () => {
      const result = imageGenerateSchema.safeParse({ prompt: 'x', aigc_watermark: 1 })
      expect(result.success).toBe(false)
    })
  })
})
