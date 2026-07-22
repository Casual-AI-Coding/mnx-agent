/**
 * Music 生成请求体 schema。
 *
 * 业务规则：
 * - 纯音乐模式（music-2.6 / music-2.5+）：lyrics 可为空，但 style_prompt 或 prompt 必填
 * - 非纯音乐模式：lyrics 必填
 * - music-cover 模式：reference_audio_url 必填
 *
 * @packageDocumentation
 */
import { z } from 'zod'

/**
 * Music 生成请求体形状（参考定义）。
 *
 * 与运行时 schema 同步，详见 {@link musicGenerateSchema}。
 */
export interface MusicGenerateBody {
  model?: string
  /** 改为可选（纯音乐模式） */
  lyrics?: string
  style_prompt?: string
  optimize_lyrics?: boolean
  audio_setting?: {
    sample_rate?: number
    /** 改为 string ('128k', etc.) */
    bitrate?: string
    format?: 'mp3' | 'wav' | 'flac'
  }
  output_format?: 'hex' | 'url'
  /** 新增 */
  seed?: number
  /** music-cover 特有 */
  reference_audio_url?: string
  use_original_lyrics?: boolean
  /** 来自前端的 prompt */
  prompt?: string
}

const PURE_MUSIC_MODELS = ['music-2.6', 'music-2.5+'] as const

/**
 * Music 生成请求体 zod schema。
 *
 * 默认值：`model='music-2.5'`、`output_format='url'`。
 * 跨字段校验由 `superRefine` 处理，对应 {@link server/routes/music.ts} 原手写校验逻辑。
 */
export const musicGenerateSchema = z
  .object({
    model: z.string().optional(),
    lyrics: z.string().optional(),
    style_prompt: z.string().optional(),
    optimize_lyrics: z.boolean().optional(),
    audio_setting: z
      .object({
        sample_rate: z.number().int().positive().optional(),
        bitrate: z.string().optional(),
        format: z.enum(['mp3', 'wav', 'flac']).optional(),
      })
      .optional(),
    output_format: z.enum(['hex', 'url']).default('url'),
    seed: z.number().int().nonnegative().optional(),
    reference_audio_url: z.string().optional(),
    use_original_lyrics: z.boolean().optional(),
    prompt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isInstrumental = PURE_MUSIC_MODELS.includes(data.model as (typeof PURE_MUSIC_MODELS)[number])

    // 规则 1：所有模式至少需要 lyrics / style_prompt / prompt 中的一个
    if (!data.lyrics && !data.style_prompt && !data.prompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '纯音乐模式需要填写风格描述',
        path: ['style_prompt'],
      })
    }

    // 规则 2：非纯音乐模式 lyrics 必填
    if (!isInstrumental && !data.lyrics) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lyrics is required',
        path: ['lyrics'],
      })
    }

    // 规则 3：music-cover 模式 reference_audio_url 必填
    if (data.model === 'music-cover' && !data.reference_audio_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'reference_audio_url is required for music-cover model',
        path: ['reference_audio_url'],
      })
    }
  })

/** Music 生成请求体的运行时校验后类型（含默认值） */
export type MusicGenerateInput = z.infer<typeof musicGenerateSchema>
