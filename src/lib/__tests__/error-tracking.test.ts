import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sentryInit = vi.fn()
const sentryCaptureException = vi.fn()

vi.mock('@sentry/react', () => ({
  init: sentryInit,
  browserTracingIntegration: vi.fn(() => 'browser-tracing'),
  captureException: sentryCaptureException,
}))

describe('client error tracking', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps client error tracking disabled when no DSN is configured', async () => {
    const { initializeClientErrorTracking, captureClientException, isClientErrorTrackingEnabled } = await import('../error-tracking')

    initializeClientErrorTracking()
    captureClientException(new Error('ignored'))

    expect(isClientErrorTrackingEnabled()).toBe(false)
    expect(sentryInit).not.toHaveBeenCalled()
    expect(sentryCaptureException).not.toHaveBeenCalled()
  })

  it('initializes Sentry when a DSN is configured', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.com/1')
    vi.stubEnv('VITE_SENTRY_TRACES_SAMPLE_RATE', '0.5')
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'production')

    const { initializeClientErrorTracking, isClientErrorTrackingEnabled } = await import('../error-tracking')

    initializeClientErrorTracking()

    expect(isClientErrorTrackingEnabled()).toBe(true)
    expect(sentryInit).toHaveBeenCalledWith({
      dsn: 'https://public@example.com/1',
      environment: 'production',
      integrations: ['browser-tracing'],
      tracesSampleRate: 0.5,
    })
  })

  it('captures client exceptions only after initialization', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.com/1')
    const error = new Error('render failed')

    const { initializeClientErrorTracking, captureClientException } = await import('../error-tracking')

    initializeClientErrorTracking()
    captureClientException(error, { componentStack: 'Component stack' })

    expect(sentryCaptureException).toHaveBeenCalledWith(error, {
      contexts: {
        react: {
          componentStack: 'Component stack',
        },
      },
    })
  })
})
