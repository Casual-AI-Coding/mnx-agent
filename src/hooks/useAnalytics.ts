import { useEffect, useCallback, useRef } from 'react'
import analytics from '@/lib/analytics'

export function usePageView(pageName: string): void {
  useEffect(() => {
    analytics.trackPageview(pageName)
  }, [pageName])
}

export function usePerformanceTracker(operationName: string) {
  const startTimeRef = useRef<number | null>(null)

  const start = useCallback(() => {
    startTimeRef.current = performance.now()
  }, [])

  const end = useCallback(
    (metadata?: Record<string, unknown>) => {
      if (startTimeRef.current !== null) {
        const duration = performance.now() - startTimeRef.current
        analytics.trackPerformance(operationName, duration, metadata)
        startTimeRef.current = null
        return duration
      }
      return null
    },
    [operationName]
  )

  return { start, end }
}

export function useAnalytics() {
  return {
    trackPageview: analytics.trackPageview,
    trackError: analytics.trackError,
    trackPerformance: analytics.trackPerformance,
    trackUsage: analytics.trackUsage,
    getSummary: analytics.getSummary,
    getEvents: analytics.getEvents,
    clearEvents: analytics.clearEvents,
  }
}