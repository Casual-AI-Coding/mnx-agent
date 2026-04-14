/**
 * Retry utility with exponential backoff for transient API failures
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in milliseconds (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes?: number[]
}

/** Default retryable status codes for transient failures */
const DEFAULT_RETRYABLE_CODES = [429, 500, 502, 503, 504, 408]

/**
 * Calculate delay with exponential backoff and jitter
 * Formula: min(baseDelay * 2^attempt + jitter, maxDelay)
 * @internal Exported for testing purposes
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
  
  // Add jitter (±25% of the delay) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)
  
  // Total delay with jitter
  const totalDelay = exponentialDelay + jitter
  
  // Cap at max delay
  return Math.min(totalDelay, maxDelayMs)
}

/**
 * Sleep for a specified duration
 * @internal Exported for testing purposes
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if an error is retryable based on its status code
 * @internal Exported for testing purposes
 */
export function isRetryableError(
  error: unknown,
  retryableStatusCodes: number[]
): boolean {
  // Check for error with status code
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: number }).code
    return retryableStatusCodes.includes(code)
  }
  
  // Check for axios error with response status
  if (error && typeof error === 'object') {
    const err = error as { response?: { status?: number } }
    if (err.response?.status) {
      return retryableStatusCodes.includes(err.response.status)
    }
  }
  
  return false
}

/**
 * Execute a function with automatic retry and exponential backoff
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => api.call(),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = options ?? {}
  const maxRetries = opts.maxRetries ?? 3
  const baseDelayMs = opts.baseDelayMs ?? 1000
  const maxDelayMs = opts.maxDelayMs ?? 30000
  const retryableStatusCodes = opts.retryableStatusCodes ?? DEFAULT_RETRYABLE_CODES

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // If this is the last attempt, throw immediately
      if (attempt === maxRetries) {
        break
      }

      // Check if error is retryable
      if (!isRetryableError(error, retryableStatusCodes)) {
        throw error
      }

      // Calculate and sleep for the backoff delay
      const delay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs)
      await sleep(delay)
    }
  }

  throw lastError
}
