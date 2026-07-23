/**
 * Voice 管理（Mgmt）路由的 4 个请求体 schema。
 *
 * 对应 `server/routes/voiceMgmt.ts` 的 4 个端点：list / clone / design / delete。
 *
 * @packageDocumentation
 */
import { z } from 'zod'

/** Voice 列表请求体 */
export interface VoiceListBody {
  voice_type?: string
}

/** Voice 克隆请求体 */
export interface VoiceCloneBody {
  voice_id: string
  /** 数字或字符串，路由层会 `Number()` 转换 */
  file_id: number | string
  /** 接受字符串（JSON 字符串）或对象；字符串形式会被路由层 JSON.parse */
  clone_prompt?: string | Record<string, unknown>
  text?: string
  model?: string
  language_boost?: string
}

/** Voice 设计请求体 */
export interface VoiceDesignBody {
  prompt: string
  preview_text: string
  voice_id?: string
}

/** Voice 删除请求体 */
export interface VoiceDeleteBody {
  voice_id: string
  voice_type: string
}

/** Voice 列表请求体 schema */
export const voiceListSchema = z.object({
  voice_type: z.string().optional(),
})

/** Voice 克隆请求体 schema */
export const voiceCloneSchema = z.object({
  voice_id: z.string().min(1, 'voice_id is required (8-256 chars, starts with letter)'),
  file_id: z.union([z.number().int().positive(), z.string().min(1)]),
  clone_prompt: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  text: z.string().optional(),
  model: z.string().optional(),
  language_boost: z.string().optional(),
})

/** Voice 设计请求体 schema */
export const voiceDesignSchema = z.object({
  prompt: z.string().min(1, 'prompt and preview_text are required'),
  preview_text: z.string().min(1, 'prompt and preview_text are required'),
  voice_id: z.string().optional(),
})

/** Voice 删除请求体 schema */
export const voiceDeleteSchema = z.object({
  voice_id: z.string().min(1, 'voice_id and voice_type are required'),
  voice_type: z.string().min(1, 'voice_id and voice_type are required'),
})

/** Voice 列表请求体的运行时校验后类型 */
export type VoiceListInput = z.infer<typeof voiceListSchema>

/** Voice 克隆请求体的运行时校验后类型 */
export type VoiceCloneInput = z.infer<typeof voiceCloneSchema>

/** Voice 设计请求体的运行时校验后类型 */
export type VoiceDesignInput = z.infer<typeof voiceDesignSchema>

/** Voice 删除请求体的运行时校验后类型 */
export type VoiceDeleteInput = z.infer<typeof voiceDeleteSchema>
