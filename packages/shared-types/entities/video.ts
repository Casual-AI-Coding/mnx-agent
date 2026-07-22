/**
 * Video 生成请求体 schema。
 *
 * @packageDocumentation
 */
import { z } from 'zod'

/**
 * Video 生成请求体形状（参考定义）。
 */
export interface VideoGenerateBody {
  model?: string
  prompt: string
  first_frame_image?: string
  last_frame_image?: string
  subject_reference?: {
    image_id: string
    description?: string
  }
  callback_url?: string
}

/**
 * Video 生成请求体 zod schema。
 *
 * 默认值：`model='video-01'`。
 */
export const videoGenerateSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().min(1, 'prompt is required'),
  first_frame_image: z.string().optional(),
  last_frame_image: z.string().optional(),
  subject_reference: z
    .object({
      image_id: z.string().min(1),
      description: z.string().optional(),
    })
    .optional(),
  callback_url: z.string().url().optional(),
})

/** Video 生成请求体的运行时校验后类型 */
export type VideoGenerateInput = z.infer<typeof videoGenerateSchema>
