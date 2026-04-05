export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface RunStats {
  success: boolean
  tasksExecuted: number
  tasksSucceeded: number
  tasksFailed: number
  durationMs: number
  errorSummary?: string | null
}