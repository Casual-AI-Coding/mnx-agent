import { useEffect } from 'react'
import { useCronJobsStore } from '@/stores/cronJobs'

export function useCronJobsWebSocket() {
  const subscribe = useCronJobsStore((state) => state.subscribeToWebSocket)
  const unsubscribe = useCronJobsStore((state) => state.unsubscribeFromWebSocket)

  useEffect(() => {
    subscribe()
    return () => unsubscribe()
  }, [subscribe, unsubscribe])
}