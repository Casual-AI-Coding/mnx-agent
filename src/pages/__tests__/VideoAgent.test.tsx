import { render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import VideoAgent from '../VideoAgent'

describe('VideoAgent Component', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render without error', () => {
    const { container } = render(<VideoAgent />)
    expect(container).toBeTruthy()
  })

  it('should unmount without error', () => {
    const { unmount } = render(<VideoAgent />)
    expect(() => unmount()).not.toThrow()
  })
})