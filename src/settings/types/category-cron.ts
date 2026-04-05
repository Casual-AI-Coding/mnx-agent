export type RetryBackoffStrategy = 'exponential' | 'linear' | 'fixed'
export type MisfirePolicy = 'fire_once' | 'ignore' | 'fire_all'

export interface CronSettings {
  defaultTimezone: string
  timeoutSeconds: number
  maxRetries: number
  retryBackoff: RetryBackoffStrategy
  concurrency: number
  misfirePolicy: MisfirePolicy
}
