import { renderHook, waitFor, act } from '@testing-library/react'
import { useTaskQueueStore } from '../taskQueue'

vi.mock('@/lib/api/cron', () => ({
  getTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}))

vi.mock('@/lib/websocket-client', () => ({
  getWebSocketClient: vi.fn(() => ({
    onEvent: vi.fn(() => vi.fn()),
    offEvent: vi.fn(),
  })),
}))

import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api/cron'

describe('useTaskQueueStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTaskQueueStore.setState({
      tasks: [],
      loading: false,
      error: null,
      filter: {},
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