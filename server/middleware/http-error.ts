/**
 * HTTP 错误识别工具（ADR-0007 Phase A）。
 *
 * 项目既有约定：routes 层有 14 处 `throw { status, message }` 纯对象，
 * 也存在 `throw new Error()` 后赋 `err.code = 400` 的模式。
 * asyncHandler 与 handleApiError 共用此处的提取逻辑，避免实现分叉。
 * 优先级：status > code > 500。
 */

const UNKNOWN_STATUS = 500

type HttpErrorLike = {
  message?: unknown
  code?: unknown
  status?: unknown
  stack?: unknown
}

function pickNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < min || value >= max) return undefined
  return value
}

function toHttpErrorLike(error: unknown): HttpErrorLike {
  if (typeof error !== 'object' || error === null) return {}
  return error as HttpErrorLike
}

export function pickHttpStatusCode(error: unknown): number {
  const e = toHttpErrorLike(error)
  const status = pickNumber(e.status, 100, 600)
  if (status !== undefined) return status
  const code = pickNumber(e.code, 100, 600)
  if (code !== undefined) return code
  return UNKNOWN_STATUS
}

export function pickHttpErrorMessage(error: unknown): string {
  const e = toHttpErrorLike(error)
  if (typeof e.message === 'string' && e.message.length > 0) return e.message
  return 'Unknown error'
}

export function pickHttpErrorStack(error: unknown): string | undefined {
  const e = toHttpErrorLike(error)
  return typeof e.stack === 'string' ? e.stack : undefined
}

export function toErrorInstance(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(pickHttpErrorMessage(error))
}
