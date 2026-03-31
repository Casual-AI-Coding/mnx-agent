import { useState, useCallback, useRef } from 'react'

interface UseRetryOptions {
  maxRetries?: number // default 3
  baseDelay?: number // default 1000ms
  onRetry?: (attempt: number, error: Error) => void
}

interface UseRetryReturn<T> {
  execute: (fn: () => Promise<T>) => Promise<T | null>
  isRetrying: boolean
  lastError: Error | null
  retryCount: number
  reset: () => void
}

// Error codes that should NOT be retried (auth and balance errors)
const NON_RETRYABLE_CODES = [1004, 1008]

/**
 * Custom hook for retrying failed operations with exponential backoff
 * 
 * @param options Configuration options
 * @returns Object with execute function, retry state, and reset function
 */
export function useRetry<T = unknown>(options?: UseRetryOptions): UseRetryReturn<T> {
  const maxRetries = options?.maxRetries ?? 3
  const baseDelay = options?.baseDelay ?? 1000
  const onRetry = options?.onRetry

  const [isRetrying, setIsRetrying] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Track retry state in ref to avoid stale closure issues
  const retryAttemptRef = useRef(0)

  const shouldSkipRetry = (error: Error): boolean => {
    const errorCodeMatch = error.message.match(/code[:\s]*(\d+)/i)
    if (errorCodeMatch) {
      const code = parseInt(errorCodeMatch[1], 10)
      return NON_RETRYABLE_CODES.includes(code)
    }
    
    const authPatterns = ['invalid api key', 'authentication', 'unauthorized', 'balance', 'insufficient']
    return authPatterns.some(p => error.message.toLowerCase().includes(p))
  }

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

  const calculateDelay = (attempt: number) => baseDelay * Math.pow(2, attempt - 1)

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    retryAttemptRef.current = 0
    setLastError(null)
    setRetryCount(0)

    while (retryAttemptRef.current <= maxRetries) {
      try {
        return await fn()
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        
        if (shouldSkipRetry(err)) {
          setLastError(err)
          return null
        }

        retryAttemptRef.current++
        setRetryCount(retryAttemptRef.current)
        setLastError(err)

        if (retryAttemptRef.current < maxRetries) {
          setIsRetrying(true)
          onRetry?.(retryAttemptRef.current, err)
          await sleep(calculateDelay(retryAttemptRef.current))
        } else {
          setIsRetrying(false)
          return null
        }
      }
    }

    setIsRetrying(false)
    return null
  }, [maxRetries, baseDelay, onRetry])

  const reset = useCallback(() => {
    setIsRetrying(false)
    setLastError(null)
    setRetryCount(0)
    retryAttemptRef.current = 0
  }, [])

  return {
    execute,
    isRetrying,
    lastError,
    retryCount,
    reset,
  }
}