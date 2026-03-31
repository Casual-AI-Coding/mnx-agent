import { z } from 'zod'

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'content must be a non-empty string'),
})

export const chatRequestSchema = z.object({
  model: z.string().optional(),
  messages: z.array(chatMessageSchema).min(1, 'messages must be a non-empty array'),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(1).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_completion_tokens: z.number().int().min(1).max(4096).optional(),
})

export const imageRequestSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().min(1, 'prompt is required'),
  num_images: z.number().int().min(1).max(4).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  style: z.string().optional(),
})

export const voiceSyncRequestSchema = z.object({
  model: z.string().optional(),
  text: z.string().min(1, 'text is required'),
  stream: z.boolean().optional(),
})

export const voiceAsyncRequestSchema = z.object({
  model: z.string().optional(),
  text: z.string().min(1, 'text is required'),
})

const audioSettingSchema = z.object({
  sample_rate: z.number().int().positive().optional(),
  bitrate: z.number().int().positive().optional(),
  format: z.enum(['mp3', 'wav', 'flac']).optional(),
})

const subjectReferenceSchema = z.object({
  image_id: z.string().min(1, 'image_id is required'),
  description: z.string().optional(),
})

export const musicRequestSchema = z.object({
  model: z.string().optional(),
  lyrics: z.string().min(1, 'lyrics is required'),
  style_prompt: z.string().optional(),
  optimize_lyrics: z.boolean().optional(),
  audio_setting: audioSettingSchema.optional(),
  output_format: z.enum(['hex', 'url']).optional(),
})

export const videoRequestSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().min(1, 'prompt is required'),
  first_frame_image: z.string().optional(),
  last_frame_image: z.string().optional(),
  subject_reference: subjectReferenceSchema.optional(),
  callback_url: z.string().url().optional(),
})

export const fileDeleteRequestSchema = z.object({
  file_id: z.union([z.number(), z.string()]),
  purpose: z.string().min(1, 'purpose is required'),
})

export const fileUploadPurposeSchema = z.object({
  purpose: z.enum(['voice_clone', 'prompt_audio', 't2a_async_input']),
})

export const fileListQuerySchema = z.object({
  purpose: z.string().optional(),
})

export const fileRetrieveQuerySchema = z.object({
  file_id: z.string().min(1, 'file_id is required'),
})

export const videoStatusParamsSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
})

export const voiceAsyncParamsSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
})

const textInputSchema = z.object({
  value: z.string().min(1, 'value is required'),
})

const mediaInputSchema = z.object({
  value: z.string().min(1, 'value is required'),
})

export const videoAgentGenerateSchema = z.object({
  template_id: z.string().min(1, 'template_id is required'),
  text_inputs: z.array(textInputSchema).optional(),
  media_inputs: z.array(mediaInputSchema).optional(),
  callback_url: z.string().url().optional(),
})

export const videoAgentStatusParamsSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
})

export const voiceListRequestSchema = z.object({
  voice_type: z.enum(['all', 'system', 'clone']).optional(),
})

export const voiceCloneRequestSchema = z.object({
  file_id: z.union([z.number(), z.string()]),
  voice_id: z.string().min(8).max(256),
  clone_prompt: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  text: z.string().optional(),
  model: z.string().optional(),
  language_boost: z.string().optional(),
})

export const voiceDesignRequestSchema = z.object({
  prompt: z.string().min(1, 'prompt is required'),
  preview_text: z.string().min(1, 'preview_text is required'),
  voice_id: z.string().optional(),
})

export const voiceDeleteRequestSchema = z.object({
  voice_id: z.string().min(1, 'voice_id is required'),
  voice_type: z.enum(['system', 'clone']),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ImageRequest = z.infer<typeof imageRequestSchema>
export type VoiceSyncRequest = z.infer<typeof voiceSyncRequestSchema>
export type VoiceAsyncRequest = z.infer<typeof voiceAsyncRequestSchema>
export type MusicRequest = z.infer<typeof musicRequestSchema>
export type VideoRequest = z.infer<typeof videoRequestSchema>
export type FileDeleteRequest = z.infer<typeof fileDeleteRequestSchema>
export type VideoAgentGenerateRequest = z.infer<typeof videoAgentGenerateSchema>
export type VoiceCloneRequest = z.infer<typeof voiceCloneRequestSchema>
export type VoiceDesignRequest = z.infer<typeof voiceDesignRequestSchema>
export type VoiceDeleteRequest = z.infer<typeof voiceDeleteRequestSchema>