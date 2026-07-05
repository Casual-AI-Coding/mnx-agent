import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

vi.mock('../../lib/error-tracking', () => ({
  captureClientException: vi.fn(),
}))

import { captureClientException } from '../../lib/error-tracking'

function ThrowingChild(): React.ReactNode {
  throw new Error('render failed')
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  const preventDefault = (event: ErrorEvent): void => {
    event.preventDefault()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.addEventListener('error', preventDefault)
  })

  afterEach(() => {
    window.removeEventListener('error', preventDefault)
    consoleErrorSpy.mockRestore()
  })

  it('captures render errors and keeps the existing fallback behavior', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('出错了')).toBeTruthy()
    expect(onError).toHaveBeenCalledOnce()
    expect(captureClientException).toHaveBeenCalledOnce()
  })
})
