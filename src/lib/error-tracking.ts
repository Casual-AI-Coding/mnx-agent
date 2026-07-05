import * as Sentry from '@sentry/react'

export interface ClientErrorContext {
  readonly componentStack?: string
}

let enabled = false

function parseTraceSampleRate(value: string | undefined): number {
  if (value === undefined) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function initializeClientErrorTracking(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    enabled = false
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: parseTraceSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE),
  })
  enabled = true
}

export function isClientErrorTrackingEnabled(): boolean {
  return enabled
}

export function captureClientException(error: Error, context: ClientErrorContext = {}): void {
  if (!enabled) return

  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: context.componentStack,
      },
    },
  })
}
