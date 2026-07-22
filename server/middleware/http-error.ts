/**
 * HTTP 错误识别工具（ADR-0007 Phase A，ADR-0008 扩展）。
 *
 * 项目既有约定：routes 层有 14 处 `throw { status, message }` 纯对象，
 * 也存在 `throw new Error()` 后赋 `err.code = 400` 的模式。
 * asyncHandler 与 handleApiError 共用此处的提取逻辑，避免实现分叉。
 * 优先级：status > code > 500。
 *
 * ADR-0008 新增 `throwValidationError` / `isHttpValidationError` 作为路由层
 * 校验错误抛出的单一权威模式（替代 16 处重复的 `throw { status: 400, message }`）。
 */

const UNKNOWN_STATUS = 500
const VALIDATION_ERROR_STATUS = 400

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

/**
 * 路由层校验错误对象形状（ADR-0008）。
 * 与 `throw { status: 400, message }` 字面量形状一致，但约束 status 为字面量 400。
 */
export interface HttpValidationError {
  readonly status: typeof VALIDATION_ERROR_STATUS
  readonly message: string
}

/**
 * 抛出路由层校验错误（ADR-0008）。
 * 单一权威模式，替代 16 处 `throw { status: 400, message }` 字面量。
 * 返回 never 让 TS 流分析把后续代码视为 unreachable。
 */
export function throwValidationError(message: string): never {
  const error: HttpValidationError = {
    status: VALIDATION_ERROR_STATUS,
    message,
  }
  throw error
}

/**
 * 类型守卫：判断对象是否为 {@link HttpValidationError}（status===400 且 message 为字符串）。
 * 供 catch 块区分校验失败与其他异常，避免 as 类型断言（coding-standards.md 1.2）。
 */
export function isHttpValidationError(error: unknown): error is HttpValidationError {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as { status?: unknown; message?: unknown }
  return (
    candidate.status === VALIDATION_ERROR_STATUS &&
    typeof candidate.message === 'string'
  )
}
