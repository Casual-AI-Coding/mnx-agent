import { describe, it, expect } from 'vitest'
import { musicGenerateSchema } from '@mnx/shared-types/entities'

describe('musicGenerateSchema', () => {
  describe('合法输入', () => {
    it('完整歌词模式：lyrics 必填且校验通过', () => {
      const input = { lyrics: '云海之上', style_prompt: '流行' }
      const result = musicGenerateSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.output_format).toBe('url') // 默认值
        expect(result.data.lyrics).toBe('云海之上')
      }
    })

    it('纯音乐模式：music-2.6 + style_prompt 通过', () => {
      const input = { model: 'music-2.6', style_prompt: '古风' }
      const result = musicGenerateSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('纯音乐模式：music-2.5+ + prompt 通过', () => {
      const input = { model: 'music-2.5+', prompt: '描述文字' }
      const result = musicGenerateSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('music-cover 模式带 reference_audio_url 通过', () => {
      const input = {
        model: 'music-cover',
        lyrics: '原歌词',
        reference_audio_url: 'https://example.com/audio.mp3',
      }
      const result = musicGenerateSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('output_format 自定义为 hex 通过', () => {
      const result = musicGenerateSchema.safeParse({ lyrics: 'L', output_format: 'hex' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.output_format).toBe('hex')
    })

    it('audio_setting 嵌套对象通过', () => {
      const result = musicGenerateSchema.safeParse({
        lyrics: 'L',
        audio_setting: { sample_rate: 44100, bitrate: '128k', format: 'mp3' },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('非法输入', () => {
    it('完全缺 lyrics / style_prompt / prompt：触发纯音乐模式规则', () => {
      const result = musicGenerateSchema.safeParse({ model: 'music-2.5' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0])
        expect(paths).toContain('style_prompt')
      }
    })

    it('非纯音乐模式缺 lyrics：触发 lyrics 必填规则', () => {
      // model 不是 music-2.6 / music-2.5+，且 style_prompt 提供以满足规则 1，但 lyrics 缺
      const result = musicGenerateSchema.safeParse({ model: 'music-2.5', style_prompt: 'pop' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const lyricsIssue = result.error.issues.find((i) => i.path[0] === 'lyrics')
        expect(lyricsIssue?.message).toBe('lyrics is required')
      }
    })

    it('music-cover 模式缺 reference_audio_url', () => {
      const result = musicGenerateSchema.safeParse({
        model: 'music-cover',
        lyrics: 'L',
        style_prompt: 's',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const raIssue = result.error.issues.find((i) => i.path[0] === 'reference_audio_url')
        expect(raIssue?.message).toBe('reference_audio_url is required for music-cover model')
      }
    })

    it('output_format 非枚举值', () => {
      const result = musicGenerateSchema.safeParse({ lyrics: 'L', output_format: 'ogg' })
      expect(result.success).toBe(false)
    })

    it('seed 负数', () => {
      const result = musicGenerateSchema.safeParse({ lyrics: 'L', seed: -1 })
      expect(result.success).toBe(false)
    })

    it('audio_setting.format 非枚举', () => {
      const result = musicGenerateSchema.safeParse({
        lyrics: 'L',
        audio_setting: { format: 'aac' },
      })
      expect(result.success).toBe(false)
    })
  })
})
