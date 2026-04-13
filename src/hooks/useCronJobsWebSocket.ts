import { useEffect } from 'react'
import { useCronJobsStore } from '@/stores/cronJobs'

export function useCronJobsWebSocket() {
  useEffect(() => {
    useCronJobsStore.getState().subscribeToWebSocket()
    return () => useCronJobsStore.getState().unsubscribeFromWebSocket()
  }, [])
}