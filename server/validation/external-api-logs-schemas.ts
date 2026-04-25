import { z } from 'zod'

export const serviceProviderEnum = z.enum(['minimax', 'openai', 'deepseek'])
export const externalApiStatusEnum = z.enum(['pending', 'success', 'failed'])

const forbiddenLogKeyPattern = /^(authorization|api[_-]?key|token|secret|cookie|password)$/i
const base64ImagePattern = /(?:data:image\/[a-zA-Z0-9.+-]+;base64,)?[A-Za-z0-9+/]{120,}={0,2}/

const rejectSensitiveLogContent = (value: unknown): boolean => {
  const visit = (input: unknown): boolean => {
    if (typeof input === 'string') {
      return !base64ImagePattern.test(input) && !/^Bearer\s+/i.test(input)
    }

    if (Array.isArray(input)) {
      return input.every(visit)
    }

    if (input && typeof input === 'object') {
      return Object.entries(input).every(
        ([key, nested]) => !forbiddenLogKeyPattern.test(key) && visit(nested)
      )
    }

    return true
  }

  return visit(value)
}

const safeJsonTextSchema = z.string().max(4096).refine((value) => {
  if (base64ImagePattern.test(value) || /Bearer\s+/i.test(value)) {
    return false
  }

  try {
    return rejectSensitiveLogContent(JSON.parse(value))
  }
  catch {
    return true
  }
}, '日志内容不能包含密钥、Bearer Token 或 base64 图片数据')

export const createExternalApiLogSchema = z.object({
  service_provider: serviceProviderEnum,
  api_endpoint: z.string().min(1).max(100),
  operation: z.string().min(1).max(50),
  request_params: z.record(z.string(), z.unknown()).optional().refine(
    (value) => value === undefined || rejectSensitiveLogContent(value),
    '请求参数不能包含密钥、Bearer Token 或 base64 图片数据'
  ),
  request_body: safeJsonTextSchema.optional(),
  response_body: safeJsonTextSchema.optional(),
  status: externalApiStatusEnum.default('pending'),
  error_message: z.string().max(2000).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  trace_id: z.string().max(32).optional(),
})

export const updateExternalApiLogSchema = z.object({
  response_body: safeJsonTextSchema.optional(),
  status: externalApiStatusEnum.optional(),
  error_message: z.string().max(2000).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
}).refine(
  (value) => value.status !== undefined
    || value.response_body !== undefined
    || value.error_message !== undefined
    || value.duration_ms !== undefined,
  '至少提供一个更新字段'
)

export const listExternalApiLogsQuerySchema = z.object({
  service_provider: serviceProviderEnum.optional(),
  status: externalApiStatusEnum.optional(),
  operation: z.string().min(1).optional(),
  user_id: z.string().min(1).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'duration_ms']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

export type ListExternalApiLogsQuery = z.infer<typeof listExternalApiLogsQuerySchema>
