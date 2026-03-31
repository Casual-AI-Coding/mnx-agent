import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  TaskQueueItem,
  TaskStatus,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskQueueFilter,
} from '../types/cron'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api/cron'

interface TaskQueueState {
  tasks: TaskQueueItem[]
  loading: boolean
  error: string | null
  filter: TaskQueueFilter
  fetchTasks: (filter?: TaskQueueFilter) => Promise<void>
  createTask: (task: CreateTaskDTO) => Promise<TaskQueueItem>
  updateTask: (id: string, updates: UpdateTaskDTO) => Promise<TaskQueueItem>
  deleteTask: (id: string) => Promise<void>
  setFilter: (filter: TaskQueueFilter) => void
}

const realApi = {
  fetchTasks: async (filter?: TaskQueueFilter): Promise<TaskQueueItem[]> => {
    const response = await getTasks(filter)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tasks')
    }
    return response.data.tasks
  },
  createTask: async (task: CreateTaskDTO): Promise<TaskQueueItem> => {
    const response = await createTask(task)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create task')
    }
    return response.data
  },
  updateTask: async (
    id: string,
    updates: UpdateTaskDTO
  ): Promise<TaskQueueItem> => {
    const response = await updateTask(id, updates)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update task')
    }
    return response.data
  },
  deleteTask: async (id: string): Promise<void> => {
    const response = await deleteTask(id)
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete task')
    }
  },
}

export const useTaskQueueStore = create<TaskQueueState>()(
  persist(
    (set, get) => ({
      tasks: [],
      loading: false,
      error: null,
      filter: {},

      fetchTasks: async (filter) => {
        set({ loading: true, error: null, filter: filter ?? {} })
        try {
          const tasks = await realApi.fetchTasks(filter)
          set({ tasks, loading: false })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch tasks',
            loading: false,
          })
        }
      },

      createTask: async (taskData) => {
        set({ loading: true, error: null })
        try {
          const newTask = await realApi.createTask(taskData)
          set((state) => ({
            tasks: [...state.tasks, newTask],
            loading: false,
          }))
          return newTask
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to create task',
            loading: false,
          })
          throw err
        }
      },

      updateTask: async (id, updates) => {
        set({ loading: true, error: null })
        try {
          const updatedTask = await realApi.updateTask(id, updates)
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, ...updatedTask } : task
            ),
            loading: false,
          }))
          return updatedTask
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to update task',
            loading: false,
          })
          throw err
        }
      },

      deleteTask: async (id) => {
        set({ loading: true, error: null })
        try {
          await realApi.deleteTask(id)
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
            loading: false,
          }))
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to delete task',
            loading: false,
          })
          throw err
        }
      },

      setFilter: (filter) => {
        set({ filter })
      },
    }),
    {
      name: 'minimax-task-queue',
    }
  )
)

export const getFilteredTasks = (state: TaskQueueState): TaskQueueItem[] => {
  const { tasks, filter } = state

  return tasks.filter((task) => {
    if (filter.status && task.status !== filter.status) {
      return false
    }
    if (filter.jobId && task.jobId !== filter.jobId) {
      return false
    }
    return true
  })
}

export const getPendingCount = (tasks: TaskQueueItem[]): number =>
  tasks.filter((t) => t.status === 'pending').length

export const getRunningCount = (tasks: TaskQueueItem[]): number =>
  tasks.filter((t) => t.status === 'running').length

export const getFailedCount = (tasks: TaskQueueItem[]): number =>
  tasks.filter((t) => t.status === 'failed').length