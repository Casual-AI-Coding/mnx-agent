import { renderHook, waitFor, act } from '@testing-library/react'
import { useExecutionLogsStore, getRecentLogs, getFailedLogs } from '../executionLogs'
import type { ExecutionLog } from '../types/cron'
import { TaskStatus } from '@/types/cron'

vi.mock('@/lib/api/cron', () => ({
  getLogs: vi.fn(),
  getLogById: vi.fn(),
  getLogDetails: vi.fn(),
}))

const mockClient = {
  subscribe: vi.fn(() => vi.fn()),
  onEvent: vi.fn(() => {
    return vi.fn()
  }),
  _handler: null as ((event: { type: string; payload: unknown }) => void) | null,
}
vi.mock('@/lib/websocket-client', () => ({
  getWebSocketClient: vi.fn(() => mockClient),
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

    it('should handle thrown errors', async () => {
      ;(getLogs as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fetch failed'))

      const { result } = renderHook(() => useExecutionLogsStore())
      await result.current.fetchLogs()

      expect(result.current.error).toBe('Fetch failed')
      expect(result.current.loading).toBe(false)
    })

    it('should handle non-Error thrown values', async () => {
      ;(getLogs as ReturnType<typeof vi.fn>).mockRejectedValue('unknown error')

      const { result } = renderHook(() => useExecutionLogsStore())
      await result.current.fetchLogs()

      expect(result.current.error).toBe('Failed to fetch logs')
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

    it('should handle thrown errors', async () => {
      ;(getLogById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useExecutionLogsStore())
      const log = await result.current.fetchLogById('123')

      expect(log).toBeNull()
      expect(result.current.error).toBe('Network error')
    })

    it('should handle non-Error thrown values', async () => {
      ;(getLogById as ReturnType<typeof vi.fn>).mockRejectedValue('unknown')

      const { result } = renderHook(() => useExecutionLogsStore())
      const log = await result.current.fetchLogById('123')

      expect(log).toBeNull()
      expect(result.current.error).toBe('Failed to fetch log')
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

    it('should handle thrown errors', async () => {
      ;(getLogDetails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useExecutionLogsStore())
      const details = await result.current.fetchLogDetails('log-1')

      expect(details).toBeNull()
      expect(result.current.error).toBe('Network error')
    })

    it('should handle non-Error thrown values', async () => {
      ;(getLogDetails as ReturnType<typeof vi.fn>).mockRejectedValue('unknown')

      const { result } = renderHook(() => useExecutionLogsStore())
      const details = await result.current.fetchLogDetails('log-1')

      expect(details).toBeNull()
      expect(result.current.error).toBe('Failed to fetch log details')
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
})

describe('useExecutionLogsStore WebSocket', () => {
  beforeEach(() => {
    mockClient.onEvent.mockReturnValue(vi.fn())
    localStorage.removeItem('minimax-execution-logs')
    useExecutionLogsStore.setState({
      logs: [],
      logDetails: new Map(),
      loading: false,
      detailsLoading: new Set(),
      error: null,
      _wsUnsubscribe: undefined,
    })
  })

  const triggerHandler = (event: { type: string; payload: Record<string, unknown> }) => {
    const calls = mockClient.onEvent.mock.calls
    if (calls.length > 0) {
      const handler = calls[calls.length - 1][1] as (event: { type: string; payload: unknown }) => void
      act(() => {
        handler(event)
      })
    }
  }

  const getLogs = () => useExecutionLogsStore.getState().logs

  describe('subscribeToWebSocket', () => {
    it('should call subscribeToWebSocket and register event handler', () => {
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      expect(mockClient.onEvent).toHaveBeenCalledWith('logs', expect.any(Function))
    })

    it('should call unsubscribeFromWebSocket', () => {
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()
      result.current.unsubscribeFromWebSocket()

      expect(result.current._wsUnsubscribe).toBeUndefined()
    })

    it('should return early from subscribeToWebSocket if already subscribed', () => {
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()
      const firstCallCount = mockClient.onEvent.mock.calls.length
      result.current.subscribeToWebSocket()
      const secondCallCount = mockClient.onEvent.mock.calls.length

      expect(secondCallCount).toBe(firstCallCount)
    })
  })

  describe('WebSocket event handling - mapStatus switch', () => {
    it('should map status "success" to TaskStatus.Completed', async () => {
      useExecutionLogsStore.setState({ logs: [] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_created',
        payload: { id: '1', jobId: 'job-1', status: 'success', executedAt: '2024-01-01T00:00:00Z' },
      })

      expect(getLogs()[0].status).toBe('completed')
    })

    it('should map status "failed" to TaskStatus.Failed', async () => {
      useExecutionLogsStore.setState({ logs: [] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_created',
        payload: { id: '2', jobId: 'job-1', status: 'failed', executedAt: '2024-01-01T00:00:00Z' },
      })

      expect(getLogs()[0].status).toBe('failed')
    })

    it('should map status "running" to TaskStatus.Running', async () => {
      useExecutionLogsStore.setState({ logs: [] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_created',
        payload: { id: '3', jobId: 'job-1', status: 'running', executedAt: '2024-01-01T00:00:00Z' },
      })

      expect(getLogs()[0].status).toBe('running')
    })

    it('should use default status for unknown status value', async () => {
      useExecutionLogsStore.setState({ logs: [] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_created',
        payload: { id: '4', jobId: 'job-1', status: 'unknown_status', executedAt: '2024-01-01T00:00:00Z' },
      })

      expect(getLogs()[0].status).toBe('running')
    })
  })

  describe('WebSocket event handling - event.type switch', () => {
    it('should handle log_created event type', async () => {
      useExecutionLogsStore.setState({ logs: [] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_created',
        payload: {
          id: 'log-new-1',
          jobId: 'job-1',
          status: 'success',
          executedAt: '2024-01-01T00:00:00Z',
          tasksExecuted: 5,
          tasksSucceeded: 4,
          tasksFailed: 1,
          error: 'Partial failure',
        },
      })

      expect(getLogs()).toHaveLength(1)
      expect(getLogs()[0].id).toBe('log-new-1')
      expect(getLogs()[0].tasksExecuted).toBe(5)
      expect(getLogs()[0].tasksFailed).toBe(1)
      expect(getLogs()[0].errorSummary).toBe('Partial failure')
    })

    it('should handle log_updated event type', async () => {
      const existingLog = {
        id: 'existing-log',
        jobId: 'job-1',
        status: 'running' as const,
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: null,
        durationMs: null,
        tasksExecuted: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        errorSummary: null,
        triggerType: 'cron' as const,
        logDetail: null,
      }
      useExecutionLogsStore.setState({ logs: [existingLog] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_updated',
        payload: {
          id: 'existing-log',
          status: 'failed',
          tasksExecuted: 3,
          tasksSucceeded: 2,
          tasksFailed: 1,
          error: 'Task failed',
        },
      })

      expect(getLogs()[0].status).toBe('failed')
      expect(getLogs()[0].tasksExecuted).toBe(3)
      expect(getLogs()[0].tasksSucceeded).toBe(2)
      expect(getLogs()[0].tasksFailed).toBe(1)
      expect(getLogs()[0].errorSummary).toBe('Task failed')
    })

    it('should not duplicate log on log_created if id already exists', async () => {
      const existingLog = {
        id: 'duplicate-id',
        jobId: 'job-1',
        status: 'running' as const,
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: null,
        durationMs: null,
        tasksExecuted: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        errorSummary: null,
        triggerType: 'cron' as const,
        logDetail: null,
      }
      useExecutionLogsStore.setState({ logs: [existingLog] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_created',
        payload: { id: 'duplicate-id', jobId: 'job-1', status: 'success', executedAt: '2024-01-02T00:00:00Z' },
      })

      expect(getLogs()).toHaveLength(1)
      expect(getLogs()[0].id).toBe('duplicate-id')
    })
  })

  describe('WebSocket event handling - conditional branches', () => {
    it('should not add log when logPayload.id is missing on log_created', async () => {
      useExecutionLogsStore.setState({ logs: [] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_created',
        payload: { jobId: 'job-1', status: 'success', executedAt: '2024-01-01T00:00:00Z' },
      })

      expect(getLogs()).toHaveLength(0)
    })

    it('should not add log when logPayload.jobId is missing on log_created', async () => {
      useExecutionLogsStore.setState({ logs: [] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_created',
        payload: { id: 'log-1', status: 'success', executedAt: '2024-01-01T00:00:00Z' },
      })

      expect(getLogs()).toHaveLength(0)
    })

    it('should not update log when logPayload.id is missing on log_updated', async () => {
      const existingLog = {
        id: 'existing-log',
        jobId: 'job-1',
        status: 'running' as const,
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: null,
        durationMs: null,
        tasksExecuted: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        errorSummary: null,
        triggerType: 'cron' as const,
        logDetail: null,
      }
      useExecutionLogsStore.setState({ logs: [existingLog] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_updated',
        payload: { status: 'failed', tasksFailed: 1 },
      })

      expect(getLogs()[0].status).toBe('running')
      expect(getLogs()[0].tasksFailed).toBe(0)
    })

    it('should update log_partialy when only some fields present on log_updated', async () => {
      const existingLog = {
        id: 'existing-log',
        jobId: 'job-1',
        status: 'running' as const,
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: null,
        durationMs: null,
        tasksExecuted: 5,
        tasksSucceeded: 5,
        tasksFailed: 0,
        errorSummary: null,
        triggerType: 'cron' as const,
        logDetail: null,
      }
      useExecutionLogsStore.setState({ logs: [existingLog] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      await triggerHandler({
        type: 'log_updated',
        payload: { id: 'existing-log', tasksFailed: 2 },
      })

      expect(getLogs()[0].tasksExecuted).toBe(5)
      expect(getLogs()[0].tasksSucceeded).toBe(5)
      expect(getLogs()[0].tasksFailed).toBe(2)
    })

    it('should limit logs to 100 entries', async () => {
      useExecutionLogsStore.setState({ logs: [] })
      const { result } = renderHook(() => useExecutionLogsStore())
      result.current.subscribeToWebSocket()

      for (let i = 0; i < 105; i++) {
        await triggerHandler({
          type: 'log_created',
          payload: {
            id: `log-${i}`,
            jobId: 'job-1',
            status: 'success',
            executedAt: '2024-01-01T00:00:00Z',
          },
        })
      }

      expect(getLogs()).toHaveLength(100)
      expect(getLogs()[0].id).toBe('log-104')
    })
  })
})

describe('executionLogs helper functions', () => {
  describe('getRecentLogs', () => {
    it('should return limited number of recent logs', () => {
      const logs: ExecutionLog[] = [
        { id: '1', jobId: 'job-1', status: 'success', startedAt: '2024-01-01' },
        { id: '2', jobId: 'job-1', status: 'success', startedAt: '2024-01-02' },
        { id: '3', jobId: 'job-1', status: 'success', startedAt: '2024-01-03' },
        { id: '4', jobId: 'job-1', status: 'success', startedAt: '2024-01-04' },
        { id: '5', jobId: 'job-1', status: 'success', startedAt: '2024-01-05' },
      ]

      const result = getRecentLogs(logs, 3)

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('1')
      expect(result[2].id).toBe('3')
    })

    it('should use default limit of 10', () => {
      const logs: ExecutionLog[] = Array.from({ length: 15 }, (_, i) => ({
        id: String(i),
        jobId: 'job-1',
        status: 'success' as const,
        startedAt: '2024-01-01',
      }))

      const result = getRecentLogs(logs)

      expect(result).toHaveLength(10)
    })

    it('should return all logs if fewer than limit', () => {
      const logs: ExecutionLog[] = [
        { id: '1', jobId: 'job-1', status: 'success', startedAt: '2024-01-01' },
        { id: '2', jobId: 'job-1', status: 'success', startedAt: '2024-01-02' },
      ]

      const result = getRecentLogs(logs, 10)

      expect(result).toHaveLength(2)
    })

    it('should return empty array when no logs', () => {
      const result = getRecentLogs([])
      expect(result).toHaveLength(0)
    })
  })

  describe('getFailedLogs', () => {
    it('should return only failed logs', () => {
      const logs: ExecutionLog[] = [
        { id: '1', jobId: 'job-1', status: 'success', startedAt: '2024-01-01' },
        { id: '2', jobId: 'job-1', status: 'failed', startedAt: '2024-01-02' },
        { id: '3', jobId: 'job-1', status: 'success', startedAt: '2024-01-03' },
        { id: '4', jobId: 'job-1', status: 'failed', startedAt: '2024-01-04' },
      ]

      const result = getFailedLogs(logs)

      expect(result).toHaveLength(2)
      expect(result.every((log) => log.status === 'failed')).toBe(true)
    })

    it('should return empty array when no failed logs', () => {
      const logs: ExecutionLog[] = [
        { id: '1', jobId: 'job-1', status: 'success', startedAt: '2024-01-01' },
        { id: '2', jobId: 'job-1', status: 'success', startedAt: '2024-01-02' },
      ]

      const result = getFailedLogs(logs)
      expect(result).toHaveLength(0)
    })

    it('should return empty array when no logs', () => {
      const result = getFailedLogs([])
      expect(result).toHaveLength(0)
    })
  })
})