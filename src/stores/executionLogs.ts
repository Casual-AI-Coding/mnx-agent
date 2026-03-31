import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExecutionLog } from '../types/cron'

interface ExecutionLogsState {
  logs: ExecutionLog[]
  loading: boolean
  error: string | null
  fetchLogs: (jobId?: string, limit?: number) => Promise<void>
  fetchLogById: (id: string) => Promise<ExecutionLog | null>
}

const placeholderApi = {
  fetchLogs: async (jobId?: string, limit?: number): Promise<ExecutionLog[]> => {
    return []
  },
  fetchLogById: async (id: string): Promise<ExecutionLog | null> => {
    return null
  },
}

export const useExecutionLogsStore = create<ExecutionLogsState>()(
  persist(
    (set, get) => ({
      logs: [],
      loading: false,
      error: null,

      fetchLogs: async (jobId, limit = 50) => {
        set({ loading: true, error: null })
        try {
          const logs = await placeholderApi.fetchLogs(jobId, limit)
          set({ logs, loading: false })
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
          const log = await placeholderApi.fetchLogById(id)
          if (log) {
            set((state) => ({
              logs: [log, ...state.logs.filter((l) => l.id !== id)],
              loading: false,
            }))
          } else {
            set({ loading: false })
          }
          return log
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch log',
            loading: false,
          })
          return null
        }
      },
    }),
    {
      name: 'minimax-execution-logs',
    }
  )
)

export const getRecentLogs = (logs: ExecutionLog[], limit = 10): ExecutionLog[] =>
  logs.slice(0, limit)

export const getFailedLogs = (logs: ExecutionLog[]): ExecutionLog[] =>
  logs.filter((log) => log.status === 'failed')