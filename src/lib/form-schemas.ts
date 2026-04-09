import { z } from 'zod'
import { CHARACTER_LIMITS, TIMEOUTS } from '@/lib/config'

export const textGenSchema = z.object({
  input: z.string().min(1, '请输入内容').max(CHARACTER_LIMITS.TEXT_INPUT, '内容超长'),
  selectedModel: z.string().min(1, '请选择模型'),
  selectedTemplate: z.string(),
  temperature: z.number().min(0).max(1),
  topP: z.number().min(0).max(1),
  maxTokens: z.number().int().min(1).max(4096),
})

export const imageGenSchema = z.object({
  prompt: z.string().min(1, '请输入提示词').max(CHARACTER_LIMITS.PROMPT, '提示词超长'),
  model: z.enum(['image-01', 'image-01-live']),
  aspectRatio: z.enum(['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9']),
  numImages: z.number().int().min(1).max(4),
  seed: z.number().int().optional(),
  promptOptimizer: z.boolean(),
  style: z.string().optional(),
})

export const voiceSyncSchema = z.object({
  text: z.string().min(1, '请输入文本').max(CHARACTER_LIMITS.TEXT_INPUT, '超出字符限制'),
  model: z.string().min(1, '请选择模型'),
  voiceId: z.string().min(1, '请选择声音'),
  emotion: z.string(),
  speed: z.number().min(0.5).max(2),
  volume: z.number().min(0).max(2),
  pitch: z.number().int().min(-10).max(10),
})

export const voiceAsyncSchema = z.object({
  text: z.string().max(CHARACTER_LIMITS.LONG_TEXT, '超出字符限制').optional(),
  fileId: z.string().optional(),
  model: z.string().min(1, '请选择模型'),
  voiceId: z.string().min(1, '请选择声音'),
  emotion: z.string(),
  speed: z.number().min(0.5).max(2),
  activeTab: z.enum(['text', 'file']),
}).refine((data) => {
  if (data.activeTab === 'text') {
    return data.text && data.text.trim().length > 0
  }
  if (data.activeTab === 'file') {
    return data.fileId && data.fileId.length > 0
  }
  return false
}, {
  message: '请输入文本或上传文件',
  path: ['text'],
})

export const musicGenSchema = z.object({
  lyrics: z.string().min(1, '请输入歌词').max(CHARACTER_LIMITS.LYRICS, '歌词超长'),
  stylePrompt: z.string().max(2000, '风格提示词超长').optional(),
  model: z.string().min(1, '请选择模型'),
  optimizeLyrics: z.boolean(),
})

export const videoGenSchema = z.object({
  prompt: z.string().min(1, '请输入提示词').max(CHARACTER_LIMITS.PROMPT, '提示词超长'),
  model: z.string().min(1, '请选择模型'),
})

export const settingsSchema = z.object({
  apiKey: z.string().min(1, 'API Key 不能为空'),
  region: z.enum(['cn', 'intl']),
  apiMode: z.enum(['direct', 'proxy']),
  theme: z.enum(['system', 'light', 'dark']),
})

export type TextGenFormData = z.infer<typeof textGenSchema>
export type ImageGenFormData = z.infer<typeof imageGenSchema>
export type VoiceSyncFormData = z.infer<typeof voiceSyncSchema>
export type VoiceAsyncFormData = z.infer<typeof voiceAsyncSchema>
export type MusicGenFormData = z.infer<typeof musicGenSchema>
export type VideoGenFormData = z.infer<typeof videoGenSchema>
export type SettingsFormData = z.infer<typeof settingsSchema>

export const cronJobSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(255),
  description: z.string().optional(),
  cron_expression: z.string().min(1, 'Cron表达式不能为空'),
  timezone: z.string().min(1, '请选择时区'),
  workflow_id: z.string().min(1, '请选择工作流'),
  timeout_ms: z.number().min(TIMEOUTS.MIN_CRON, '最小超时时间为 1 秒').max(TIMEOUTS.MAX_CRON, '最大超时时间为 10 分钟').optional(),
  is_active: z.boolean(),
})

export type CronJobFormData = z.infer<typeof cronJobSchema>