import { describe, it, expect } from 'vitest'
import {
  voiceListSchema,
  voiceCloneSchema,
  voiceDesignSchema,
  voiceDeleteSchema,
} from '@mnx/shared-types/entities'

describe('voiceListSchema', () => {
  it('空对象通过（voice_type 可选）', () => {
    expect(voiceListSchema.safeParse({}).success).toBe(true)
  })

  it('带 voice_type 通过', () => {
    expect(voiceListSchema.safeParse({ voice_type: 'all' }).success).toBe(true)
  })

  it('voice_type 非 string 被拒', () => {
    expect(voiceListSchema.safeParse({ voice_type: 123 }).success).toBe(false)
  })
})

describe('voiceCloneSchema', () => {
  describe('合法输入', () => {
    it('最小必填字段：voice_id + file_id (数字)', () => {
      const result = voiceCloneSchema.safeParse({ voice_id: 'voice-1', file_id: 42 })
      expect(result.success).toBe(true)
    })

    it('file_id 为字符串形式通过', () => {
      const result = voiceCloneSchema.safeParse({ voice_id: 'voice-1', file_id: '42' })
      expect(result.success).toBe(true)
    })

    it('clone_prompt 为对象通过', () => {
      const result = voiceCloneSchema.safeParse({
        voice_id: 'v',
        file_id: 1,
        clone_prompt: { key: 'val' },
      })
      expect(result.success).toBe(true)
    })

    it('clone_prompt 为字符串通过', () => {
      const result = voiceCloneSchema.safeParse({
        voice_id: 'v',
        file_id: 1,
        clone_prompt: '{"key":"val"}',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('非法输入', () => {
    it('voice_id 缺失', () => {
      const result = voiceCloneSchema.safeParse({ file_id: 1 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === 'voice_id')
        expect(issue).toBeDefined()
      }
    })

    it('file_id 缺失', () => {
      const result = voiceCloneSchema.safeParse({ voice_id: 'v' })
      expect(result.success).toBe(false)
    })

    it('file_id 为空字符串', () => {
      const result = voiceCloneSchema.safeParse({ voice_id: 'v', file_id: '' })
      expect(result.success).toBe(false)
    })
  })
})

describe('voiceDesignSchema', () => {
  it('最小必填：prompt + preview_text 通过', () => {
    expect(
      voiceDesignSchema.safeParse({ prompt: '温柔男声', preview_text: '你好' }).success,
    ).toBe(true)
  })

  it('带 voice_id 通过', () => {
    expect(
      voiceDesignSchema.safeParse({
        prompt: '温柔男声',
        preview_text: '你好',
        voice_id: 'v1',
      }).success,
    ).toBe(true)
  })

  it('prompt 缺失被拒', () => {
    const result = voiceDesignSchema.safeParse({ preview_text: '你好' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'prompt')
      expect(issue).toBeDefined()
    }
  })

  it('preview_text 空字符串被拒', () => {
    const result = voiceDesignSchema.safeParse({ prompt: 'x', preview_text: '' })
    expect(result.success).toBe(false)
  })
})

describe('voiceDeleteSchema', () => {
  it('两字段齐全通过', () => {
    expect(
      voiceDeleteSchema.safeParse({ voice_id: 'v1', voice_type: 'custom' }).success,
    ).toBe(true)
  })

  it('voice_id 缺失被拒', () => {
    const result = voiceDeleteSchema.safeParse({ voice_type: 'custom' })
    expect(result.success).toBe(false)
  })

  it('voice_type 缺失被拒', () => {
    const result = voiceDeleteSchema.safeParse({ voice_id: 'v1' })
    expect(result.success).toBe(false)
  })
})
