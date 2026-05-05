export interface TestRunNodeResult {
  id: string
  status: 'completed' | 'failed' | 'running' | 'pending' | 'cancelled'
  output?: unknown
  error?: string
  duration?: number
  input?: unknown
  progress?: number
  startedAt?: string
  completedAt?: string
}
