export interface TimeoutOptions {
  timeoutMs: number
  errorMessage?: string
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number, context?: string) {
    const message = context 
      ? `${context} timed out after ${timeoutMs / 1000}s`
      : `Operation timed out after ${timeoutMs / 1000}s`
    super(message)
    this.name = 'TimeoutError'
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new TimeoutError(timeoutMs, context)), timeoutMs)
    }),
  ])
}

export function createTimeoutController(timeoutMs: number): {
  signal: AbortSignal
  cleanup: () => void
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  }
}

export const DEFAULT_TIMEOUTS = {
  SYNC_TASK: 5 * 60 * 1000,
  ASYNC_TASK: 10 * 60 * 1000,
  WEBHOOK: 30 * 1000,
  WORKFLOW_NODE: 5 * 60 * 1000,
} as const