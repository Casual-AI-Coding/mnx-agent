import { renderHook, waitFor } from '@testing-library/react'
import { useTaskQueueStore } from '../taskQueue'

vi.mock('@/lib/api/cron', () => ({
  getTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}))

import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api/cron'

describe('useTaskQueueStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch tasks from API', async () => {
    const mockTasks = [{ id: '1', jobId: 'job-1', taskType: 'text', status: 'pending' }]
    ;(getTasks as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: { tasks: mockTasks, total: 1 } })
    
    const { result } = renderHook(() => useTaskQueueStore())
    await result.current.fetchTasks()
    
    expect(getTasks).toHaveBeenCalled()
    expect(result.current.tasks).toEqual(mockTasks)
  })

  it('should create task via API', async () => {
    const newTask = { jobId: 'job-1', taskType: 'text', payload: {} }
    const createdTask = { id: '123', ...newTask, status: 'pending' }
    ;(createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: createdTask })
    
    const { result } = renderHook(() => useTaskQueueStore())
    const task = await result.current.createTask(newTask)
    
    expect(createTask).toHaveBeenCalled()
    expect(task.id).toBe('123')
  })

  it('should handle API errors gracefully', async () => {
    ;(getTasks as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Network error' })
    
    const { result } = renderHook(() => useTaskQueueStore())
    await result.current.fetchTasks()
    
    expect(result.current.error).toBe('Network error')
  })
})