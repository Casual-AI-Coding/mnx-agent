import type { Request } from 'express'
import { DEFAULT_CHAT_MODEL } from '../../config/model-defaults'
import { throwValidationError } from '../../middleware/http-error'

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
 * 设计目标（ADR-0006 Phase 2，ADR-0008 升级）：
 * - 消除 `/chat` 与 `/chat/stream` 之间重复的 `buildRequestBody` 逻辑；
 * - 把硬编码的 `'abab5.5-chat'` 集中到 {@link DEFAULT_CHAT_MODEL}；
 * - 让消息校验逻辑有单一来源，避免两处校验产生行为漂移；
 * - 失败时通过 {@link throwValidationError} 抛出标准 {@link HttpValidationError}
 *   （ADR-0008：替代重复的 `{ status, message }` 字面量构造）。
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
    throwValidationError('messages is required and must be a non-empty array')
  }

  const { model, messages, temperature, top_p, max_completion_tokens } = req.body

  if (messages.length === 0) {
    throwValidationError('messages is required and must be a non-empty array')
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
