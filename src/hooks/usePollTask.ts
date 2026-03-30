import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePollTaskOptions<T> {
  pollInterval?: number
  maxAttempts?: number
  isComplete?: (result: T) => boolean
  onComplete?: (result: T) => void
  onError?: (error: Error) => void
}

export function usePollTask<T>(
  fetchFn: () => Promise<T>,
  options: UsePollTaskOptions<T> = {}
) {
  const {
    pollInterval = 3000,
    maxAttempts = 100,
    isComplete = (result: T) => (result as { status?: string }).status === 'completed',
    onComplete,
    onError,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [attempts, setAttempts] = useState(0)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortRef = useRef(false)

  const start = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setAttempts(0)
    abortRef.current = false
    setData(null)
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsLoading(false)
    abortRef.current = true
  }, [])

  const poll = useCallback(async () => {
    if (abortRef.current || attempts >= maxAttempts) {
      stop()
      return
    }

    try {
      const result = await fetchFn()
      setData(result)
      setAttempts((prev) => prev + 1)

      if (isComplete(result)) {
        stop()
        onComplete?.(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      stop()
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  }, [fetchFn, attempts, maxAttempts, isComplete, stop, onComplete, onError])

  useEffect(() => {
    if (isLoading && !intervalRef.current) {
      poll()
      intervalRef.current = setInterval(poll, pollInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isLoading, poll, pollInterval])

  return {
    data,
    isLoading,
    error,
    attempts,
    start,
    stop,
  }
}