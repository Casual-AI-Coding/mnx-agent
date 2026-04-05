import { z } from 'zod'

export const textGenerationSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(1),
  topP: z.number().min(0).max(1),
  maxTokens: z.number().int().min(1).max(8192),
  promptCaching: z.boolean(),
  streamOutput: z.boolean(),
})

export const voiceGenerationSchema = z.object({
  model: z.string().min(1),
  voiceId: z.string().min(1),
  emotion: z.string(),
  speed: z.number().min(0.5).max(2),
  pitch: z.number().int().min(-10).max(10),
  volume: z.number().min(0).max(2),
})

export const imageGenerationSchema = z.object({
  model: z.string().min(1),
  aspectRatio: z.enum(['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9']),
  numImages: z.number().int().min(1).max(4),
  promptOptimizer: z.boolean(),
  style: z.string(),
})

export const musicGenerationSchema = z.object({
  model: z.string().min(1),
  optimizeLyrics: z.boolean(),
  duration: z.number().int().min(5).max(300),
})

export const videoGenerationSchema = z.object({
  model: z.string().min(1),
  quality: z.enum(['standard', 'high']),
  duration: z.number().int().min(3).max(10),
})

export const generationSettingsSchema = z.object({
  text: textGenerationSchema,
  voice: voiceGenerationSchema,
  image: imageGenerationSchema,
  music: musicGenerationSchema,
  video: videoGenerationSchema,
})

export type GenerationSettingsInput = z.infer<typeof generationSettingsSchema>