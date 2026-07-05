import * as Sentry from '@sentry/node'

export interface ServerErrorContext {
  readonly method?: string
  readonly path?: string
  readonly statusCode?: number
  readonly traceId?: string
  readonly requestId?: string
  readonly userId?: string
}

let enabled = false
let initialized = false

function parseTraceSampleRate(value: string | undefined): number {
  if (value === undefined) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function initializeServerErrorTracking(): void {
  initialized = true
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    enabled = false
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: parseTraceSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
  })
  enabled = true
}

export function isServerErrorTrackingEnabled(): boolean {
  return enabled
}

export function captureServerException(error: Error, context: ServerErrorContext = {}): void {
  if (!initialized) initializeServerErrorTracking()
  if (!enabled) return

  Sentry.withScope(scope => {
    if (context.statusCode !== undefined) scope.setTag('statusCode', String(context.statusCode))
    if (context.traceId !== undefined) scope.setTag('traceId', context.traceId)
    if (context.requestId !== undefined) scope.setTag('requestId', context.requestId)
    if (context.userId !== undefined) scope.setUser({ id: context.userId })

    scope.setContext('request', {
      method: context.method,
      path: context.path,
      statusCode: context.statusCode,
      traceId: context.traceId,
      requestId: context.requestId,
    })

    Sentry.captureException(error)
  })
}
