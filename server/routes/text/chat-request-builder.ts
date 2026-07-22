import type { Request } from 'express'
import { DEFAULT_CHAT_MODEL } from '../../config/model-defaults'

/**
 * Chat 消息（与 MiniMax chat completion API 对齐）。
 *
 * 注意：与 server/routes/text.ts 旧版本中重复的局部 interface 不同，
 * 这里导出后供未来的 streaming / non-streaming / 测试代码共享。
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** `/chat` 与 `/chat/stream` 共享的请求体形状。 */
export interface ChatRequestBody {
  model?: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  top_p?: number
  max_completion_tokens?: number
}

/** {@link buildChatRequestBody} 抛出的错误对象形状。 */
export interface ChatRequestBodyError {
  readonly status: 400
  readonly message: string
}

/** 流式选项：是否在结果中追加 `stream: true`。 */
export interface BuildChatRequestBodyOptions {
  stream?: boolean
}

/**
 * 类型守卫：判断 {@link Request.body} 是否符合 {@link ChatRequestBody} 形状。
 *
 * 仅校验 messages 字段是数组（其他字段是可选的、由后续逻辑按需读取）。
 * 详细字段级校验应由 Zod schema + `validate` 中间件在路由层完成，
 * 这里只做最小的「能继续解构」校验。
 */
function isChatRequestBodyLike(body: unknown): body is ChatRequestBody {
  if (typeof body !== 'object' || body === null) return false
  const record = body as Record<string, unknown>
  return Array.isArray(record.messages)
}

/**
 * 把 Express {@link Request} 转换成 MiniMax chat completion 请求体。
 *
 * 设计目标（ADR-0006 Phase 2）：
 * - 消除 `/chat` 与 `/chat/stream` 之间重复的 `buildRequestBody` 逻辑；
 * - 把硬编码的 `'abab5.5-chat'` 集中到 {@link DEFAULT_CHAT_MODEL}；
 * - 让消息校验逻辑有单一来源，避免两处校验产生行为漂移。
 *
 * 失败时抛出 {@link ChatRequestBodyError} 形式的对象（与项目既有约定
 * 一致：`{ status, message }` 由 `asyncHandler` / `handleApiError`
 * 透传给全局错误中间件）。
 *
 * @param req Express 请求对象，需要 `req.body` 已经过 body-parser 解析
 * @param options 选项，`stream: true` 时会在结果中追加 `stream: true`
 * @returns 可直接传给 `client.chatCompletion` / `chatCompletionStream` 的请求体
 */
export function buildChatRequestBody(
  req: Request,
  options: BuildChatRequestBodyOptions = {}
): Record<string, unknown> {
  if (!isChatRequestBodyLike(req.body)) {
    const error: ChatRequestBodyError = {
      status: 400,
      message: 'messages is required and must be a non-empty array',
    }
    throw error
  }

  const { model, messages, temperature, top_p, max_completion_tokens } = req.body

  if (messages.length === 0) {
    const error: ChatRequestBodyError = {
      status: 400,
      message: 'messages is required and must be a non-empty array',
    }
    throw error
  }

  const body: Record<string, unknown> = {
    model: model || DEFAULT_CHAT_MODEL,
    messages,
  }

  if (options.stream) {
    body.stream = true
  }

  if (temperature !== undefined) body.temperature = temperature
  if (top_p !== undefined) body.top_p = top_p
  if (max_completion_tokens !== undefined) {
    body.max_completion_tokens = max_completion_tokens
  }

  return body
}

/**
 * 类型守卫：判断错误对象是否为 {@link ChatRequestBodyError} 形状。
 *
 * 供路由层在 `catch` 中区分「请求体校验失败」与其他异常使用，
 * 避免 `as` 类型断言（参见 docs/standards/coding-standards.md 1.2）。
 */
export function isChatRequestBodyError(
  error: unknown
): error is ChatRequestBodyError {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as { status?: unknown; message?: unknown }
  return (
    typeof candidate.status === 'number' &&
    typeof candidate.message === 'string'
  )
}
