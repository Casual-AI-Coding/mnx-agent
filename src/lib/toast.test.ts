import { describe, expect, it, vi, beforeEach } from 'vitest'
import { toastSuccess, toastError, toastInfo, toastLoading } from './toast'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    promise: vi.fn().mockReturnValue({
      unwrap: vi.fn(),
    }),
  },
}))

describe('Toast Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toastSuccess calls toast.success with message and description', async () => {
    const { toast } = await import('sonner')
    toastSuccess('Operation successful', 'Everything worked')
    expect(toast.success).toHaveBeenCalledWith('Operation successful', {
      description: 'Everything worked',
    })
  })

  it('toastError calls toast.error with message and description', async () => {
    const { toast } = await import('sonner')
    toastError('Something went wrong', 'Please try again')
    expect(toast.error).toHaveBeenCalledWith('Something went wrong', {
      description: 'Please try again',
    })
  })

  it('toastInfo calls toast.info with message and description', async () => {
    const { toast } = await import('sonner')
    toastInfo('Here is some info', 'For your reference')
    expect(toast.info).toHaveBeenCalledWith('Here is some info', {
      description: 'For your reference',
    })
  })
})