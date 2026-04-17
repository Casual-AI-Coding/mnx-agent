import { useEffect } from 'react'
import { useExecutionLogsStore } from '@/stores/executionLogs'
import { useAuthStore } from '@/stores/auth'

export function useExecutionLogsWebSocket() {
  const { isHydrated, isAuthenticated } = useAuthStore()
  const subscribe = useExecutionLogsStore((state) => state.subscribeToWebSocket)
  const unsubscribe = useExecutionLogsStore((state) => state.unsubscribeFromWebSocket)

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return
    subscribe()
    return () => unsubscribe()
  }, [isHydrated, isAuthenticated, subscribe, unsubscribe])
}