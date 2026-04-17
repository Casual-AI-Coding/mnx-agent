import { useEffect } from 'react'
import { useCronJobsStore } from '@/stores/cronJobs'
import { useAuthStore } from '@/stores/auth'

export function useCronJobsWebSocket() {
  const { isHydrated, isAuthenticated } = useAuthStore()
  
  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return
    useCronJobsStore.getState().subscribeToWebSocket()
    return () => useCronJobsStore.getState().unsubscribeFromWebSocket()
  }, [isHydrated, isAuthenticated])
}