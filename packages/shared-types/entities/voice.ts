import { z } from 'zod'

/**
 * 同步语音生成请求体
 */
export interface VoiceSyncBody {
  /** 模型名称（默认 speech-01） */
  model?: string
  /** 待合成文本（必填） */
  text: string
  /** 是否启用流式响应 */
  stream?: boolean
}

/**
 * 异步语音生成请求体
 */
export interface VoiceAsyncBody {
  /** 模型名称（默认 speech-01） */
  model?: string
  /** 待合成文本（必填） */
  text: string
  /** 异步结果回调地址 */
  callback_url?: string
}

/**
 * 同步语音生成请求体的 Zod 校验 schema。
 * model 字段缺省时填入默认值 speech-01。
 */
export const voiceSyncSchema = z.object({
  model: z.string().optional().default('speech-01'),
  text: z.string().min(1, 'text is required'),
  stream: z.boolean().optional(),
})

/**
 * 异步语音生成请求体的 Zod 校验 schema。
 * callback_url 若提供则必须是合法 URL。
 */
export const voiceAsyncSchema = z.object({
  model: z.string().optional().default('speech-01'),
  text: z.string().min(1, 'text is required'),
  callback_url: z.string().url('callback_url must be a valid URL').optional(),
})

/**
 * 由 schema 推断的输入类型。
 * model 字段在 zod `.default()` 作用后为 string（不再是 optional）。
 */
export type VoiceSyncInput = z.infer<typeof voiceSyncSchema>
export type VoiceAsyncInput = z.infer<typeof voiceAsyncSchema>
