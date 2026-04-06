import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExecutionLog, ExecutionLogDetail } from '../types/cron'
import { TaskStatus, TriggerType } from '../types/cron'
import { getLogs, getLogById, getLogDetails } from '@/lib/api/cron'
import { getWebSocketClient, type LogEventPayload } from '@/lib/websocket-client'

interface ExecutionLogsState {
  logs: ExecutionLog[]
  logDetails: Map<string, ExecutionLogDetail[]>
  loading: boolean
  detailsLoading: Set<string>
  error: string | null
  _wsUnsubscribe?: () => void
  fetchLogs: (jobId?: string, limit?: number) => Promise<void>
  fetchLogById: (id: string) => Promise<ExecutionLog | null>
  fetchLogDetails: (id: string) => Promise<ExecutionLogDetail[] | null>
  subscribeToWebSocket: () => void
  unsubscribeFromWebSocket: () => void
}

export const useExecutionLogsStore = create<ExecutionLogsState>()(
  persist(
    (set, get) => ({
      logs: [],
      logDetails: new Map(),
      loading: false,
      detailsLoading: new Set(),
      error: null,

      fetchLogs: async (jobId, limit = 50) => {
        set({ loading: true, error: null })
        try {
          const response = await getLogs({ jobId, limit })
          if (response.success && response.data) {
            set({ logs: response.data.logs, loading: false })
          } else {
            set({ error: response.error || 'Failed to fetch logs', loading: false })
          }
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch logs',
            loading: false,
          })
        }
      },

      fetchLogById: async (id) => {
        const cached = get().logs.find((log) => log.id === id)
        if (cached) return cached

        set({ loading: true, error: null })
        try {
          const response = await getLogById(id)
          if (response.success && response.data) {
            set((state) => ({
              logs: [response.data!, ...state.logs.filter((l) => l.id !== id)],
              loading: false,
            }))
            return response.data
          } else {
            set({ error: response.error || 'Failed to fetch log', loading: false })
            return null
          }
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch log',
            loading: false,
          })
          return null
        }
      },

      fetchLogDetails: async (id) => {
        const cached = get().logDetails.get(id)
        if (cached) return cached

        set((state) => ({
          detailsLoading: new Set(state.detailsLoading).add(id),
          error: null,
        }))

        try {
          const response = await getLogDetails(id)
          if (response.success && response.data) {
            set((state) => {
              const newDetails = new Map(state.logDetails)
              newDetails.set(id, response.data!.details)
              const newLoading = new Set(state.detailsLoading)
              newLoading.delete(id)
              return { logDetails: newDetails, detailsLoading: newLoading }
            })
            return response.data.details
          } else {
            set((state) => {
              const newLoading = new Set(state.detailsLoading)
              newLoading.delete(id)
              return { error: response.error || 'Failed to fetch log details', detailsLoading: newLoading }
            })
            return null
          }
        } catch (err) {
          set((state) => {
            const newLoading = new Set(state.detailsLoading)
            newLoading.delete(id)
            return {
              error: err instanceof Error ? err.message : 'Failed to fetch log details',
              detailsLoading: newLoading,
            }
          })
          return null
        }
      },

      subscribeToWebSocket: () => {
        const client = getWebSocketClient()
        if (!client) return

        const currentUnsub = get()._wsUnsubscribe
        if (currentUnsub) return

        const mapStatus = (status: string | undefined): TaskStatus => {
          switch (status) {
            case 'success':
              return TaskStatus.Completed
            case 'failed':
              return TaskStatus.Failed
            case 'running':
              return TaskStatus.Running
            default:
              return TaskStatus.Running
          }
        }

        const unsub = client.onEvent('logs', (event) => {
          const { type, payload } = event
          const logPayload = payload as LogEventPayload

          switch (type) {
            case 'log_created':
              if (logPayload.id && logPayload.jobId) {
                const { id, jobId, status, executedAt } = logPayload
                set((state) => {
                  if (state.logs.find((l) => l.id === id)) return state
                  const newLog: ExecutionLog = {
                    id,
                    jobId,
                    status: mapStatus(status),
                    triggerType: TriggerType.Cron,
                    startedAt: executedAt,
                    completedAt: null,
                    durationMs: null,
                    tasksExecuted: logPayload.tasksExecuted ?? 0,
                    tasksSucceeded: logPayload.tasksSucceeded ?? 0,
                    tasksFailed: logPayload.tasksFailed ?? 0,
                    errorSummary: logPayload.error ?? null,
                    logDetail: null,
                  }
                  return { logs: [newLog, ...state.logs].slice(0, 100) }
                })
              }
              break

            case 'log_updated':
              if (logPayload.id) {
                set((state) => ({
                  logs: state.logs.map((log) =>
                    log.id === logPayload.id
                      ? {
                          ...log,
                          status: logPayload.status ? mapStatus(logPayload.status) : log.status,
                          tasksExecuted: logPayload.tasksExecuted ?? log.tasksExecuted,
                          tasksSucceeded: logPayload.tasksSucceeded ?? log.tasksSucceeded,
                          tasksFailed: logPayload.tasksFailed ?? log.tasksFailed,
                          errorSummary: logPayload.error ?? log.errorSummary,
                        }
                      : log
                  ),
                }))
              }
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
      name: 'minimax-execution-logs',
      partialize: (state) => ({
        logs: state.logs,
      }),
    }
  )
)

export const getRecentLogs = (logs: ExecutionLog[], limit = 10): ExecutionLog[] =>
  logs.slice(0, limit)

export const getFailedLogs = (logs: ExecutionLog[]): ExecutionLog[] =>
  logs.filter((log) => log.status === 'failed')