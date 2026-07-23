/**
 * Regression 测试：vitest alias 深层路径解析。
 *
 * 历史 bug：`vitest.server.config.ts` 的 alias `/^@mnx\/shared-types\/(.+)$/`
 * 把 replacement 写成 `dist/$1/index.js`，对所有单文件子路径都会映射到不存在的目录。
 * 例如 `@mnx/shared-types/entities/image` → `dist/entities/image/index.js`（错误），
 * 实际产物是 `dist/entities/image.js`。
 *
 * ADR-0012 修复：replacement 改为裸 `dist/$1`，由 vite extensions 自动解析。
 *
 * 本测试直接 import 所有深层路径变体，确保修复永久有效。
 */
import { describe, it, expect } from 'vitest'
import { imageGenerateSchema } from '@mnx/shared-types/entities/image'
import { voiceSyncSchema } from '@mnx/shared-types/entities/voice'
import { musicGenerateSchema } from '@mnx/shared-types/entities/music'
import { videoGenerateSchema } from '@mnx/shared-types/entities/video'
import { videoAgentGenerateSchema } from '@mnx/shared-types/entities/videoAgent'
import { voiceListSchema } from '@mnx/shared-types/entities/voiceMgmt'
import { lyricsGenerateSchema } from '@mnx/shared-types/entities/lyrics'
import type { ImageGenerateInput } from '@mnx/shared-types/entities/image'
import type { LyricsGenerateInput } from '@mnx/shared-types/entities/lyrics'

describe('vitest alias 深层路径解析（ADR-0012 regression）', () => {
  it('image.ts 深层路径可解析', () => {
    expect(imageGenerateSchema).toBeDefined()
    expect(imageGenerateSchema.safeParse({ prompt: 'cat' }).success).toBe(true)
  })

  it('lyrics.ts 深层路径可解析（项目历史 latent bug 触发点）', () => {
    expect(lyricsGenerateSchema).toBeDefined()
  })

  it('所有 entities 单文件深层路径都可解析', () => {
    expect(voiceSyncSchema).toBeDefined()
    expect(musicGenerateSchema).toBeDefined()
    expect(videoGenerateSchema).toBeDefined()
    expect(videoAgentGenerateSchema).toBeDefined()
    expect(voiceListSchema).toBeDefined()
  })

  it('深层路径 type 也能正常推断', () => {
    const imageInput: ImageGenerateInput = { model: 'image-01', prompt: 'test' }
    const lyricsInput: LyricsGenerateInput = {} as LyricsGenerateInput
    expect(imageInput.prompt).toBe('test')
    expect(lyricsInput).toBeDefined()
  })
})
