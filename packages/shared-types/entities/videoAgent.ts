/**
 * Video Agent 生成请求体 schema。
 *
 * @packageDocumentation
 */
import { z } from 'zod'

/**
 * Video Agent 生成请求体形状（参考定义）。
 */
export interface VideoAgentGenerateBody {
  template_id: string
  text_inputs?: Array<{ value: string }>
  media_inputs?: Array<{ value: string }>
  callback_url?: string
}

/**
 * Video Agent 生成请求体 zod schema。
 */
export const videoAgentGenerateSchema = z.object({
  template_id: z.string().min(1, 'template_id is required'),
  text_inputs: z.array(z.object({ value: z.string().min(1) })).optional(),
  media_inputs: z.array(z.object({ value: z.string().min(1) })).optional(),
  callback_url: z.string().url().optional(),
})

/** Video Agent 生成请求体的运行时校验后类型 */
export type VideoAgentGenerateInput = z.infer<typeof videoAgentGenerateSchema>
