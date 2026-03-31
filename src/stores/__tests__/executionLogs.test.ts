import { renderHook, waitFor } from '@testing-library/react'
import { useExecutionLogsStore } from '../executionLogs'

vi.mock('@/lib/api/cron', () => ({
  getLogs: vi.fn(),
  getLogById: vi.fn(),
}))

import { getLogs, getLogById } from '@/lib/api/cron'

describe('useExecutionLogsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch logs from API', async () => {
    const mockLogs = [{ id: '1', jobId: 'job-1', status: 'success' }]
    ;(getLogs as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: { logs: mockLogs, total: 1 } })

    const { result } = renderHook(() => useExecutionLogsStore())
    await result.current.fetchLogs()

    expect(getLogs).toHaveBeenCalled()
    expect(result.current.logs).toEqual(mockLogs)
  })

  it('should fetch single log by id', async () => {
    const mockLog = { id: '123', jobId: 'job-1', status: 'failed' }
    ;(getLogById as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: mockLog })

    const { result } = renderHook(() => useExecutionLogsStore())
    const log = await result.current.fetchLogById('123')

    expect(log).toEqual(mockLog)
  })
})