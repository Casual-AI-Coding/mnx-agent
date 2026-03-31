import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  TaskQueueItem,
  TaskStatus,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskQueueFilter,
} from '../types/cron'

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

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const placeholderApi = {
  fetchTasks: async (filter?: TaskQueueFilter): Promise<TaskQueueItem[]> => {
    return []
  },
  createTask: async (task: CreateTaskDTO): Promise<TaskQueueItem> => {
    return {
      id: generateId(),
      jobId: task.jobId,
      taskType: task.taskType,
      payload: task.payload,
      priority: task.priority ?? 1,
      status: 'pending' as TaskStatus,
      retryCount: 0,
      maxRetries: task.maxRetries ?? 3,
      errorMessage: null,
      result: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    }
  },
  updateTask: async (
    id: string,
    updates: UpdateTaskDTO
  ): Promise<TaskQueueItem> => {
    return {
      id,
      jobId: 'placeholder',
      taskType: 'placeholder',
      payload: {},
      priority: 1,
      status: updates.status ?? 'pending' as TaskStatus,
      retryCount: updates.retryCount ?? 0,
      maxRetries: 3,
      errorMessage: updates.errorMessage ?? null,
      result: updates.result ?? null,
      createdAt: new Date().toISOString(),
      startedAt: updates.startedAt ?? null,
      completedAt: updates.completedAt ?? null,
    }
  },
  deleteTask: async (id: string): Promise<void> => {
    console.log(`Placeholder: Deleting task ${id}`)
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
          const tasks = await placeholderApi.fetchTasks(filter)
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
          const newTask = await placeholderApi.createTask(taskData)
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
          const updatedTask = await placeholderApi.updateTask(id, updates)
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
          await placeholderApi.deleteTask(id)
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