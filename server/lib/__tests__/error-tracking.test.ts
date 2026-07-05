import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sentryInit = vi.fn()
const sentryCaptureException = vi.fn()
const sentryWithScope = vi.fn((callback: (scope: { setTag: (key: string, value: string) => void; setContext: (key: string, value: Record<string, unknown>) => void; setUser: (user: { id: string }) => void }) => void) => {
  callback({
    setTag: vi.fn(),
    setContext: vi.fn(),
    setUser: vi.fn(),
  })
})

vi.mock('@sentry/node', () => ({
  init: sentryInit,
  captureException: sentryCaptureException,
  withScope: sentryWithScope,
}))

describe('server error tracking', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.SENTRY_DSN
    delete process.env.SENTRY_TRACES_SAMPLE_RATE
    delete process.env.SENTRY_ENVIRONMENT
  })

  afterEach(() => {
    delete process.env.SENTRY_DSN
    delete process.env.SENTRY_TRACES_SAMPLE_RATE
    delete process.env.SENTRY_ENVIRONMENT
  })

  it('keeps server error tracking disabled when no DSN is configured', async () => {
    const { initializeServerErrorTracking, isServerErrorTrackingEnabled, captureServerException } = await import('../error-tracking.js')

    initializeServerErrorTracking()
    captureServerException(new Error('ignored'), { statusCode: 500 })

    expect(isServerErrorTrackingEnabled()).toBe(false)
    expect(sentryInit).not.toHaveBeenCalled()
    expect(sentryCaptureException).not.toHaveBeenCalled()
  })

  it('initializes Sentry when a DSN is configured', async () => {
    process.env.SENTRY_DSN = 'https://public@example.com/1'
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.25'
    process.env.SENTRY_ENVIRONMENT = 'production'

    const { initializeServerErrorTracking, isServerErrorTrackingEnabled } = await import('../error-tracking.js')

    initializeServerErrorTracking()

    expect(isServerErrorTrackingEnabled()).toBe(true)
    expect(sentryInit).toHaveBeenCalledWith({
      dsn: 'https://public@example.com/1',
      environment: 'production',
      tracesSampleRate: 0.25,
    })
  })

  it('captures server exceptions with request context when enabled', async () => {
    process.env.SENTRY_DSN = 'https://public@example.com/1'
    const error = new Error('database failed')

    const { initializeServerErrorTracking, captureServerException } = await import('../error-tracking.js')

    initializeServerErrorTracking()
    captureServerException(error, {
      method: 'GET',
      path: '/api/media-records',
      statusCode: 500,
      traceId: 'trace-1',
      requestId: 'request-1',
      userId: 'user-1',
    })

    expect(sentryWithScope).toHaveBeenCalledOnce()
    expect(sentryCaptureException).toHaveBeenCalledWith(error)
  })
})
