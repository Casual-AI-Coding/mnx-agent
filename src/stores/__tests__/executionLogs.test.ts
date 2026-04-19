import { renderHook, waitFor, act } from '@testing-library/react'
import { useExecutionLogsStore } from '../executionLogs'

vi.mock('@/lib/api/cron', () => ({
  getLogs: vi.fn(),
  getLogById: vi.fn(),
  getLogDetails: vi.fn(),
}))

vi.mock('@/lib/websocket-client', () => ({
  getWebSocketClient: vi.fn(() => ({
    subscribe: vi.fn(() => vi.fn()),
  })),
}))

import { getLogs, getLogById, getLogDetails } from '@/lib/api/cron'

describe('useExecutionLogsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useExecutionLogsStore.setState({
      logs: [],
      logDetails: new Map(),
      loading: false,
      detailsLoading: new Set(),
      error: null,
    })
  })

  describe('fetchLogs', () => {
    it('should fetch logs from API', async () => {
      const mockLogs = [{ id: '1', jobId: 'job-1', status: 'success' }]
      ;(getLogs as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: { logs: mockLogs, total: 1 } })

      const { result } = renderHook(() => useExecutionLogsStore())
      await result.current.fetchLogs()

      expect(getLogs).toHaveBeenCalled()
      expect(result.current.logs).toEqual(mockLogs)
      expect(result.current.loading).toBe(false)
    })

    it('should handle API errors', async () => {
      ;(getLogs as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Network error' })

      const { result } = renderHook(() => useExecutionLogsStore())
      await result.current.fetchLogs()

      expect(result.current.error).toBe('Network error')
      expect(result.current.loading).toBe(false)
    })

    it('should set loading state during fetch', async () => {
      let resolve: (value: unknown) => void
      ;(getLogs as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(r => resolve = r))

      const { result } = renderHook(() => useExecutionLogsStore())
      const promise = result.current.fetchLogs()

      await waitFor(() => {
        expect(result.current.loading).toBe(true)
      }, { timeout: 100 })

      resolve!({ success: true, data: { logs: [], total: 0 } })
      await promise

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('fetchLogById', () => {
    it('should fetch single log by id', async () => {
      const mockLog = { id: '123', jobId: 'job-1', status: 'failed' }
      ;(getLogById as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: mockLog })

      const { result } = renderHook(() => useExecutionLogsStore())
      const log = await result.current.fetchLogById('123')

      expect(log).toEqual(mockLog)
    })

    it('should return cached log if exists in store', async () => {
      const cachedLog = { id: 'cached-1', jobId: 'job-1', status: 'success' }
      useExecutionLogsStore.setState({ logs: [cachedLog] })

      const { result } = renderHook(() => useExecutionLogsStore())
      const log = await result.current.fetchLogById('cached-1')

      expect(log).toEqual(cachedLog)
      expect(getLogById).not.toHaveBeenCalled()
    })

    it('should add fetched log to store', async () => {
      const mockLog = { id: '123', jobId: 'job-1', status: 'failed' }
      ;(getLogById as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: mockLog })

      const { result } = renderHook(() => useExecutionLogsStore())
      await result.current.fetchLogById('123')

      expect(result.current.logs).toContainEqual(mockLog)
    })

    it('should return null on API failure', async () => {
      ;(getLogById as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Not found' })

      const { result } = renderHook(() => useExecutionLogsStore())
      const log = await result.current.fetchLogById('invalid')

      expect(log).toBeNull()
      expect(result.current.error).toBe('Not found')
    })
  })

  describe('fetchLogDetails', () => {
    it('should fetch log details from API', async () => {
      const mockDetails = [
        { id: '1', logId: 'log-1', step: 'start', status: 'success', timestamp: '2024-01-01T00:00:00Z' },
        { id: '2', logId: 'log-1', step: 'end', status: 'success', timestamp: '2024-01-01T00:01:00Z' },
      ]
      ;(getLogDetails as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: { details: mockDetails } })

      const { result } = renderHook(() => useExecutionLogsStore())
      const details = await result.current.fetchLogDetails('log-1')

      expect(getLogDetails).toHaveBeenCalledWith('log-1')
      expect(details).toEqual(mockDetails)
      expect(result.current.detailsLoading.has('log-1')).toBe(false)
    })

    it('should return cached details if exists', async () => {
      const cachedDetails = [{ id: '1', logId: 'log-1', step: 'cached', status: 'success', timestamp: '2024-01-01T00:00:00Z' }]
      const detailsMap = new Map([['log-1', cachedDetails]])
      useExecutionLogsStore.setState({ logDetails: detailsMap })

      const { result } = renderHook(() => useExecutionLogsStore())
      const details = await result.current.fetchLogDetails('log-1')

      expect(details).toEqual(cachedDetails)
      expect(getLogDetails).not.toHaveBeenCalled()
    })

    it('should handle API errors', async () => {
      ;(getLogDetails as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Failed to fetch details' })

      const { result } = renderHook(() => useExecutionLogsStore())
      const details = await result.current.fetchLogDetails('log-1')

      expect(details).toBeNull()
      expect(result.current.error).toBe('Failed to fetch details')
    })

    it('should track loading state for details', async () => {
      let resolve: (value: unknown) => void
      ;(getLogDetails as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(r => resolve = r))

      const { result } = renderHook(() => useExecutionLogsStore())
      const promise = result.current.fetchLogDetails('log-1')

      resolve!({ success: true, data: [] })
      await promise

      expect(result.current.detailsLoading.has('log-1')).toBe(false)
    })
  })

  // WebSocket subscription tests skipped - requires complex mock setup
  // The store's WebSocket integration is tested via integration tests
})