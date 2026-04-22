import { describe, expect, it, vi } from 'vitest'
import type { Response } from 'express'
import { handleApiError } from '../errorHandler'

describe('handleApiError', () => {
  it('should fall back to a generic message for non-Error values', () => {
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    const res = { status } as unknown as Response

    handleApiError(res, 'plain-string-error')

    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: 'Unknown error',
    })
  })
})
