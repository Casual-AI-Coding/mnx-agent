export interface OpenAIImage2FormData {
  baseUrl: string
  endpointId: string
  bearerToken: string
  prompt: string
  model: string
  n: number
  size: string
  quality: string
  background: string
  outputFormat: string
  moderation: string
  retryCount: number
}

export type ResultStatus = 'idle' | 'creating-log' | 'generating' | 'updating-log' | 'saving-media' | 'success' | 'failed'

export interface RetryRecord {
  attempt: number
  status: 'generating' | 'success' | 'failed'
  error?: string
  durationMs?: number
  timestamp: string
  previewUrl?: string
  blob?: Blob
}

export interface OpenAIImage2Result {
  status: ResultStatus
  previewUrl?: string
  mediaRecordId?: string
  externalApiLogId?: number
  usage?: Record<string, unknown>
  durationMs?: number
  error?: string
}

export const STATUS_LABELS: Record<ResultStatus, string> = {
  idle: '等待生成',
  'creating-log': '创建调用日志...',
  generating: '正在调用外部 API...',
  'updating-log': '更新调用日志...',
  'saving-media': '保存媒体记录...',
  success: '生成成功',
  failed: '生成失败',
}

export const STATUS_COLORS: Record<ResultStatus, string> = {
  idle: 'text-muted-foreground',
  'creating-log': 'text-blue-500',
  generating: 'text-indigo-500',
  'updating-log': 'text-blue-500',
  'saving-media': 'text-blue-500',
  success: 'text-emerald-500',
  failed: 'text-red-500',
}

export const MODEL_OPTIONS = [
  { value: 'gpt-image-2', label: 'GPT Image 2' },
]

export const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'auto', label: 'Auto' },
]

export const BACKGROUND_OPTIONS = [
  { value: 'transparent', label: '透明' },
  { value: 'opaque', label: '不透明' },
  { value: 'auto', label: 'Auto' },
]

export const OUTPUT_FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]

export const MODERATION_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'low', label: 'Low' },
]

export function formatExternalApiError(err: unknown): string {
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return '请求失败（可能是 CORS 跨域限制）。请确认目标 API 支持跨域请求，或使用支持 CORS 的代理地址。'
  }
  return err instanceof Error ? err.message : '外部 API 调用失败'
}

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
}
