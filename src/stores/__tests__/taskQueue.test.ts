import { renderHook, waitFor, act } from '@testing-library/react'
import { useTaskQueueStore } from '../taskQueue'

vi.mock('@/lib/api/cron', () => ({
  getTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}))

const mockWsClient = {
  onEvent: vi.fn(),
  offEvent: vi.fn(),
}
vi.mock('@/lib/websocket-client', () => ({
  getWebSocketClient: vi.fn(() => mockWsClient),
}))

import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api/cron'
import { getWebSocketClient } from '@/lib/websocket-client'

describe('useTaskQueueStore', () => {
  beforeEach(() => {
    mockWsClient.onEvent.mockReturnValue(vi.fn())
    localStorage.removeItem('minimax-task-queue')
    useTaskQueueStore.setState({
      tasks: [],
      loading: false,
      error: null,
      filter: {},
      _wsUnsubscribe: undefined,
    })
  })

  describe('fetchTasks', () => {
    it('should fetch tasks from API', async () => {
      const mockTasks = [{ id: '1', jobId: 'job-1', taskType: 'text', status: 'pending' }]
      ;(getTasks as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: { tasks: mockTasks, total: 1 } })

      const { result } = renderHook(() => useTaskQueueStore())
      await result.current.fetchTasks()

      expect(getTasks).toHaveBeenCalled()
      expect(result.current.tasks).toEqual(mockTasks)
      expect(result.current.loading).toBe(false)
    })

    it('should handle API errors', async () => {
      ;(getTasks as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Network error' })

      const { result } = renderHook(() => useTaskQueueStore())
      await result.current.fetchTasks()

      expect(result.current.error).toBe('Network error')
      expect(result.current.loading).toBe(false)
    })

    it('should handle thrown errors', async () => {
      ;(getTasks as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fetch failed'))

      const { result } = renderHook(() => useTaskQueueStore())
      await result.current.fetchTasks()

      expect(result.current.error).toBe('Fetch failed')
      expect(result.current.loading).toBe(false)
    })

    it('should handle non-Error thrown values', async () => {
      ;(getTasks as ReturnType<typeof vi.fn>).mockRejectedValue('unknown')

      const { result } = renderHook(() => useTaskQueueStore())
      await result.current.fetchTasks()

      expect(result.current.error).toBe('Failed to fetch tasks')
      expect(result.current.loading).toBe(false)
    })

    it('should apply filter to API call', async () => {
      ;(getTasks as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: { tasks: [], total: 0 } })

      const { result } = renderHook(() => useTaskQueueStore())
      await result.current.fetchTasks({ status: 'pending' })

      expect(getTasks).toHaveBeenCalledWith({ status: 'pending' })
    })
  })

  describe('createTask', () => {
    it('should create task via API', async () => {
      const newTask = { jobId: 'job-1', taskType: 'text', payload: {} }
      const createdTask = { id: '123', ...newTask, status: 'pending' }
      ;(createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: createdTask })

      const { result } = renderHook(() => useTaskQueueStore())
      const task = await result.current.createTask(newTask)

      expect(createTask).toHaveBeenCalled()
      expect(task.id).toBe('123')
      expect(result.current.tasks).toContainEqual(createdTask)
    })

    it('should throw error on API failure', async () => {
      const newTask = { jobId: 'job-1', taskType: 'text', payload: {} }
      ;(createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Creation failed' })

      const { result } = renderHook(() => useTaskQueueStore())

      await expect(result.current.createTask(newTask)).rejects.toThrow()
      expect(result.current.error).toBe('Creation failed')
    })

    it('should handle thrown errors', async () => {
      const newTask = { jobId: 'job-1', taskType: 'text', payload: {} }
      ;(createTask as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTaskQueueStore())

      await expect(result.current.createTask(newTask)).rejects.toThrow()
      expect(result.current.error).toBe('Network error')
    })

    it('should handle non-Error thrown values', async () => {
      const newTask = { jobId: 'job-1', taskType: 'text', payload: {} }
      ;(createTask as ReturnType<typeof vi.fn>).mockRejectedValue('unknown')

      const { result } = renderHook(() => useTaskQueueStore())

      await expect(result.current.createTask(newTask)).rejects.toThrow()
      expect(result.current.error).toBe('Failed to create task')
    })

  })

  describe('updateTask', () => {
    it('should update task via API', async () => {
      const existingTask = { id: '1', jobId: 'job-1', taskType: 'text', status: 'pending', payload: {} }
      const updatedTask = { ...existingTask, status: 'completed' }
      ;(updateTask as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: updatedTask })
      useTaskQueueStore.setState({ tasks: [existingTask] })

      const { result } = renderHook(() => useTaskQueueStore())
      const task = await result.current.updateTask('1', { status: 'completed' })

      expect(updateTask).toHaveBeenCalledWith('1', { status: 'completed' })
      expect(task.status).toBe('completed')
    })

    it('should throw error on API failure', async () => {
      ;(updateTask as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Update failed' })
      useTaskQueueStore.setState({ tasks: [{ id: '1', jobId: 'job-1', taskType: 'text', status: 'pending', payload: {} }] })

      const { result } = renderHook(() => useTaskQueueStore())

      await expect(result.current.updateTask('1', { status: 'completed' })).rejects.toThrow()
      expect(result.current.error).toBe('Update failed')
    })

    it('should handle thrown errors', async () => {
      ;(updateTask as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))
      useTaskQueueStore.setState({ tasks: [{ id: '1', jobId: 'job-1', taskType: 'text', status: 'pending', payload: {} }] })

      const { result } = renderHook(() => useTaskQueueStore())

      await expect(result.current.updateTask('1', { status: 'completed' })).rejects.toThrow()
      expect(result.current.error).toBe('Network error')
    })

    it('should handle non-Error thrown values', async () => {
      ;(updateTask as ReturnType<typeof vi.fn>).mockRejectedValue('unknown')
      useTaskQueueStore.setState({ tasks: [{ id: '1', jobId: 'job-1', taskType: 'text', status: 'pending', payload: {} }] })

      const { result } = renderHook(() => useTaskQueueStore())

      await expect(result.current.updateTask('1', { status: 'completed' })).rejects.toThrow()
      expect(result.current.error).toBe('Failed to update task')
    })
  })

  describe('deleteTask', () => {
    it('should delete task via API', async () => {
      const existingTask = { id: '1', jobId: 'job-1', taskType: 'text', status: 'pending', payload: {} }
      ;(deleteTask as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })
      useTaskQueueStore.setState({ tasks: [existingTask] })

      const { result } = renderHook(() => useTaskQueueStore())
      await result.current.deleteTask('1')

      expect(deleteTask).toHaveBeenCalledWith('1')
      expect(result.current.tasks).toHaveLength(0)
    })

    it('should throw error on API failure', async () => {
      const existingTask = { id: '1', jobId: 'job-1', taskType: 'text', status: 'pending', payload: {} }
      ;(deleteTask as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Delete failed' })
      useTaskQueueStore.setState({ tasks: [existingTask] })

      const { result } = renderHook(() => useTaskQueueStore())

      await expect(result.current.deleteTask('1')).rejects.toThrow()
      expect(result.current.error).toBe('Delete failed')
    })

    it('should handle thrown errors', async () => {
      const existingTask = { id: '1', jobId: 'job-1', taskType: 'text', status: 'pending', payload: {} }
      ;(deleteTask as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))
      useTaskQueueStore.setState({ tasks: [existingTask] })

      const { result } = renderHook(() => useTaskQueueStore())

      await expect(result.current.deleteTask('1')).rejects.toThrow()
      expect(result.current.error).toBe('Network error')
    })

    it('should handle non-Error thrown values', async () => {
      const existingTask = { id: '1', jobId: 'job-1', taskType: 'text', status: 'pending', payload: {} }
      ;(deleteTask as ReturnType<typeof vi.fn>).mockRejectedValue('unknown')
      useTaskQueueStore.setState({ tasks: [existingTask] })

      const { result } = renderHook(() => useTaskQueueStore())

      await expect(result.current.deleteTask('1')).rejects.toThrow()
      expect(result.current.error).toBe('Failed to delete task')
    })
  })

  describe('setFilter', () => {
    it('should set filter', async () => {
      const { result } = renderHook(() => useTaskQueueStore())
      await act(async () => {
        result.current.setFilter({ status: 'completed' })
      })

      expect(result.current.filter.status).toBe('completed')
    })
  })

  describe('WebSocket subscription', () => {
    it('should call getWebSocketClient without error', () => {
      const { result } = renderHook(() => useTaskQueueStore())
      expect(() => result.current.subscribeToWebSocket()).not.toThrow()
    })

    it('should call unsubscribe without error when not subscribed', () => {
      const { result } = renderHook(() => useTaskQueueStore())
      expect(() => result.current.unsubscribeFromWebSocket()).not.toThrow()
    })
  })
})

// Helper function tests
import { getFilteredTasks, getPendingCount, getRunningCount, getFailedCount, type TaskQueueItem } from '../taskQueue'

describe('taskQueue helper functions', () => {
  const createTask = (status: TaskQueueItem['status'], jobId = 'job-1'): TaskQueueItem => ({
    id: Math.random().toString(),
    jobId,
    taskType: 'text',
    status,
    payload: {},
    priority: 5,
    retryCount: 0,
    maxRetries: 3,
    errorMessage: null,
    result: null,
    createdAt: '2024-01-01',
    startedAt: null,
    completedAt: null,
  })

  describe('getFilteredTasks', () => {
    it('should return all tasks when no filter', () => {
      const tasks = [createTask('pending'), createTask('running'), createTask('failed')]
      const state = { tasks, filter: {}, loading: false, error: null }

      const result = getFilteredTasks(state as any)
      expect(result).toHaveLength(3)
    })

    it('should filter by status', () => {
      const tasks = [createTask('pending'), createTask('running'), createTask('failed')]
      const state = { tasks, filter: { status: 'pending' }, loading: false, error: null }

      const result = getFilteredTasks(state as any)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('pending')
    })

    it('should filter by jobId', () => {
      const tasks = [createTask('pending', 'job-1'), createTask('pending', 'job-2'), createTask('pending', 'job-3')]
      const state = { tasks, filter: { jobId: 'job-2' }, loading: false, error: null }

      const result = getFilteredTasks(state as any)
      expect(result).toHaveLength(1)
      expect(result[0].jobId).toBe('job-2')
    })

    it('should filter by both status and jobId', () => {
      const tasks = [
        createTask('pending', 'job-1'),
        createTask('pending', 'job-2'),
        createTask('failed', 'job-1'),
        createTask('failed', 'job-2'),
      ]
      const state = { tasks, filter: { status: 'failed', jobId: 'job-1' }, loading: false, error: null }

      const result = getFilteredTasks(state as any)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('failed')
      expect(result[0].jobId).toBe('job-1')
    })
  })

  describe('getPendingCount', () => {
    it('should return count of pending tasks', () => {
      const tasks = [
        createTask('pending'),
        createTask('pending'),
        createTask('running'),
        createTask('failed'),
      ]

      expect(getPendingCount(tasks)).toBe(2)
    })

    it('should return 0 for empty array', () => {
      expect(getPendingCount([])).toBe(0)
    })

    it('should return 0 when no pending tasks', () => {
      const tasks = [createTask('running'), createTask('failed'), createTask('completed')]
      expect(getPendingCount(tasks)).toBe(0)
    })
  })

  describe('getRunningCount', () => {
    it('should return count of running tasks', () => {
      const tasks = [
        createTask('pending'),
        createTask('running'),
        createTask('running'),
        createTask('failed'),
      ]

      expect(getRunningCount(tasks)).toBe(2)
    })

    it('should return 0 for empty array', () => {
      expect(getRunningCount([])).toBe(0)
    })
  })

  describe('getFailedCount', () => {
    it('should return count of failed tasks', () => {
      const tasks = [
        createTask('pending'),
        createTask('running'),
        createTask('failed'),
        createTask('failed'),
        createTask('failed'),
      ]

      expect(getFailedCount(tasks)).toBe(3)
    })

    it('should return 0 for empty array', () => {
      expect(getFailedCount([])).toBe(0)
    })
  })
})

describe('useTaskQueueStore WebSocket', () => {
  beforeEach(() => {
    mockWsClient.onEvent.mockReturnValue(vi.fn())
    localStorage.removeItem('minimax-task-queue')
    useTaskQueueStore.setState({
      tasks: [],
      loading: false,
      error: null,
      filter: {},
      _wsUnsubscribe: undefined,
    })
  })

  describe('setFilter', () => {
    it('should update filter state', () => {
      useTaskQueueStore.setState({ filter: {} })
      const { result } = renderHook(() => useTaskQueueStore())
      act(() => {
        result.current.setFilter({ status: 'pending' })
      })

      expect(result.current.filter).toEqual({ status: 'pending' })
    })
  })

  describe('subscribeToWebSocket', () => {
    it('should call subscribeToWebSocket and register event handler', () => {
      const { result } = renderHook(() => useTaskQueueStore())
      result.current.subscribeToWebSocket()

      expect(mockWsClient.onEvent).toHaveBeenCalledWith('tasks', expect.any(Function))
    })

    it('should call unsubscribeFromWebSocket', () => {
      const { result } = renderHook(() => useTaskQueueStore())
      result.current.subscribeToWebSocket()
      result.current.unsubscribeFromWebSocket()

      expect(result.current._wsUnsubscribe).toBeUndefined()
    })

    it('should return early from subscribeToWebSocket if already subscribed', () => {
      const { result } = renderHook(() => useTaskQueueStore())
      result.current.subscribeToWebSocket()
      const firstCallCount = mockWsClient.onEvent.mock.calls.length
      result.current.subscribeToWebSocket()
      const secondCallCount = mockWsClient.onEvent.mock.calls.length

      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should return early when client is null', () => {
      vi.mocked(getWebSocketClient).mockReturnValue(null as any)

      const { result } = renderHook(() => useTaskQueueStore())
      result.current.subscribeToWebSocket()

      expect(result.current._wsUnsubscribe).toBeUndefined()
    })

    it('should handle task_created event', () => {
      const { result } = renderHook(() => useTaskQueueStore())
      result.current.subscribeToWebSocket()

      expect(mockWsClient.onEvent).toHaveBeenCalled()
      const handler = mockWsClient.onEvent.mock.calls[0][1]
      const createdTask = {
        id: 'new-task-1',
        jobId: 'job-1',
        taskType: 'text',
        status: 'pending',
        retryCount: 0,
        error: null,
      }

      act(() => {
        handler({ type: 'task_created', payload: createdTask })
      })

      expect(result.current.tasks).toHaveLength(1)
      expect(result.current.tasks[0].id).toBe('new-task-1')
    })

    it('should handle task_updated event', () => {
      const existingTask = {
        id: 'task-1',
        jobId: 'job-1',
        taskType: 'text',
        status: 'pending' as const,
        payload: {},
        priority: 5,
        retryCount: 0,
        maxRetries: 3,
        errorMessage: null,
        result: null,
        createdAt: '2024-01-01',
        startedAt: null,
        completedAt: null,
      }
      useTaskQueueStore.setState({ tasks: [existingTask] })

      const { result } = renderHook(() => useTaskQueueStore())
      result.current.subscribeToWebSocket()

      const handler = mockWsClient.onEvent.mock.calls[0][1]
      const updatedTask = {
        id: 'task-1',
        status: 'completed',
        result: { output: 'success' },
      }

      act(() => {
        handler({ type: 'task_updated', payload: updatedTask })
      })

      expect(result.current.tasks[0].status).toBe('completed')
      expect(result.current.tasks[0].result).toEqual({ output: 'success' })
    })

    it('should handle task_moved_to_dlq event (task deleted)', () => {
      const existingTask = {
        id: 'task-1',
        jobId: 'job-1',
        taskType: 'text',
        status: 'failed' as const,
        payload: {},
        priority: 5,
        retryCount: 3,
        maxRetries: 3,
        errorMessage: 'Max retries exceeded',
        result: null,
        createdAt: '2024-01-01',
        startedAt: null,
        completedAt: null,
      }
      useTaskQueueStore.setState({ tasks: [existingTask] })

      const { result } = renderHook(() => useTaskQueueStore())
      result.current.subscribeToWebSocket()

      const handler = mockWsClient.onEvent.mock.calls[0][1]

      act(() => {
        handler({ type: 'task_moved_to_dlq', payload: { id: 'task-1' } })
      })

      expect(result.current.tasks).toHaveLength(0)
    })
  })
})