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
import { getWebSocketClient, type TaskEventPayload } from '@/lib/websocket-client'

interface TaskQueueState {
  tasks: TaskQueueItem[]
  loading: boolean
  error: string | null
  filter: TaskQueueFilter
  _wsUnsubscribe?: () => void
  fetchTasks: (filter?: TaskQueueFilter) => Promise<void>
  createTask: (task: CreateTaskDTO) => Promise<TaskQueueItem>
  updateTask: (id: string, updates: UpdateTaskDTO) => Promise<TaskQueueItem>
  deleteTask: (id: string) => Promise<void>
  setFilter: (filter: TaskQueueFilter) => void
  subscribeToWebSocket: () => void
  unsubscribeFromWebSocket: () => void
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

      subscribeToWebSocket: () => {
        const client = getWebSocketClient()
        if (!client) return

        const currentUnsub = get()._wsUnsubscribe
        if (currentUnsub) return

        const unsub = client.onEvent('tasks', (event) => {
          const { type, payload } = event
          const taskPayload = payload as TaskEventPayload

          switch (type) {
            case 'task_created':
              if (
                taskPayload.id &&
                taskPayload.jobId &&
                taskPayload.taskType &&
                taskPayload.status
              ) {
                const {
                  id,
                  jobId,
                  taskType,
                  status,
                  retryCount,
                  error,
                } = taskPayload
                set((state) => {
                  if (state.tasks.find((t) => t.id === id)) return state
                  const newTask: TaskQueueItem = {
                    id,
                    jobId,
                    taskType,
                    status: status as TaskStatus,
                    payload: {},
                    priority: 5,
                    retryCount: retryCount ?? 0,
                    maxRetries: 5,
                    errorMessage: error ?? null,
                    result: null,
                    createdAt: new Date().toISOString(),
                    startedAt: null,
                    completedAt: null,
                  }
                  return { tasks: [newTask, ...state.tasks] }
                })
              }
              break

            case 'task_updated':
            case 'task_completed':
            case 'task_failed':
              set((state) => ({
                tasks: state.tasks.map((task) =>
                  task.id === taskPayload.id
                    ? {
                        ...task,
                        status: taskPayload.status as TaskStatus,
                        errorMessage: taskPayload.error ?? task.errorMessage,
                        result: taskPayload.result
                          ? (taskPayload.result as Record<string, unknown>)
                          : task.result,
                        completedAt:
                          taskPayload.status === 'completed' || taskPayload.status === 'failed'
                            ? new Date().toISOString()
                            : task.completedAt,
                      }
                    : task
                ),
              }))
              break

            case 'task_moved_to_dlq':
              if (taskPayload.id) {
                set((state) => ({
                  tasks: state.tasks.filter((task) => task.id !== taskPayload.id),
                }))
              }
              break

            case 'retry_scheduled':
              set((state) => ({
                tasks: state.tasks.map((task) =>
                  task.id === taskPayload.id
                    ? {
                        ...task,
                        status: 'pending' as TaskStatus,
                        retryCount: taskPayload.retryCount ?? task.retryCount + 1,
                      }
                    : task
                ),
              }))
              break
          }
        })

        set({ _wsUnsubscribe: unsub })
      },

      unsubscribeFromWebSocket: () => {
        const unsub = get()._wsUnsubscribe
        if (unsub) {
          unsub()
          set({ _wsUnsubscribe: undefined })
        }
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