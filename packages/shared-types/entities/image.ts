import { z } from 'zod'

/**
 * 图像生成请求体
 */
export interface ImageGenerateBody {
  /** 模型名称（默认 image-01） */
  model?: string
  /** 生成图像所需的提示词（必填） */
  prompt: string
  /** 生成图像数量 */
  n?: number
  /** n 的旧参数名（向后兼容） */
  num_images?: number
  /** 是否启用提示词优化器 */
  prompt_optimizer?: boolean
  /** 长宽比（例如 "16:9"） */
  aspect_ratio?: string
  /** 图像宽度（像素） */
  width?: number
  /** 图像高度（像素） */
  height?: number
  /** 随机种子，用于可复现结果 */
  seed?: number
  /** 风格预设 */
  style?: string
  /** 是否启用 AIGC 水印 */
  aigc_watermark?: boolean
}

/**
 * 图像生成请求体的 Zod 校验 schema。
 * 仅服务端校验，model 字段缺省时填入默认值 image-01。
 */
export const imageGenerateSchema = z.object({
  model: z.string().optional().default('image-01'),
  prompt: z.string().min(1, 'prompt is required'),
  n: z.number().int().positive().optional(),
  num_images: z.number().int().positive().optional(),
  prompt_optimizer: z.boolean().optional(),
  aspect_ratio: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  seed: z.number().int().positive().optional(),
  style: z.string().optional(),
  aigc_watermark: z.boolean().optional(),
})

/**
 * 由 schema 推断的输入类型。
 * 注意 model 字段在 zod `.default()` 作用后为 string（不再是 optional）。
 */
export type ImageGenerateInput = z.infer<typeof imageGenerateSchema>
