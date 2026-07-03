import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCronJobsStore } from '../stores/cronJobs'
import { useExecutionLogsStore } from '../stores/executionLogs'
import { useTaskQueueStore } from '../stores/taskQueue'
import { useCronJobsWebSocket } from './useCronJobsWebSocket'
import { useExecutionLogsWebSocket } from './useExecutionLogsWebSocket'
import { useStoreWebSocketSubscription } from './useStoreWebSocketSubscription'
import { useTaskQueueWebSocket } from './useTaskQueueWebSocket'

vi.mock('../stores/cronJobs', () => ({
  useCronJobsStore: vi.fn(),
}))

vi.mock('../stores/taskQueue', () => ({
  useTaskQueueStore: vi.fn(),
}))

vi.mock('../stores/executionLogs', () => ({
  useExecutionLogsStore: vi.fn(),
}))

vi.mock('./useStoreWebSocketSubscription', () => ({
  useStoreWebSocketSubscription: vi.fn(),
}))

describe('Cron WebSocket hook wrappers', () => {
  const cronJobsSubscribeToWebSocket = vi.fn()
  const cronJobsUnsubscribeFromWebSocket = vi.fn()
  const taskQueueSubscribeToWebSocket = vi.fn()
  const taskQueueUnsubscribeFromWebSocket = vi.fn()
  const executionLogsSubscribeToWebSocket = vi.fn()
  const executionLogsUnsubscribeFromWebSocket = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useCronJobsStore)
      .mockReturnValueOnce(cronJobsSubscribeToWebSocket)
      .mockReturnValueOnce(cronJobsUnsubscribeFromWebSocket)

    vi.mocked(useTaskQueueStore)
      .mockReturnValueOnce(taskQueueSubscribeToWebSocket)
      .mockReturnValueOnce(taskQueueUnsubscribeFromWebSocket)

    vi.mocked(useExecutionLogsStore)
      .mockReturnValueOnce(executionLogsSubscribeToWebSocket)
      .mockReturnValueOnce(executionLogsUnsubscribeFromWebSocket)
  })

  it('delegates cron job subscriptions to the shared store lifecycle hook', () => {
    renderHook(() => useCronJobsWebSocket())

    expect(useStoreWebSocketSubscription).toHaveBeenCalledWith({
      subscribeToWebSocket: cronJobsSubscribeToWebSocket,
      unsubscribeFromWebSocket: cronJobsUnsubscribeFromWebSocket,
    })
  })

  it('delegates task queue subscriptions to the shared store lifecycle hook', () => {
    renderHook(() => useTaskQueueWebSocket())

    expect(useStoreWebSocketSubscription).toHaveBeenCalledWith({
      subscribeToWebSocket: taskQueueSubscribeToWebSocket,
      unsubscribeFromWebSocket: taskQueueUnsubscribeFromWebSocket,
    })
  })

  it('delegates execution log subscriptions to the shared store lifecycle hook', () => {
    renderHook(() => useExecutionLogsWebSocket())

    expect(useStoreWebSocketSubscription).toHaveBeenCalledWith({
      subscribeToWebSocket: executionLogsSubscribeToWebSocket,
      unsubscribeFromWebSocket: executionLogsUnsubscribeFromWebSocket,
    })
  })
})
