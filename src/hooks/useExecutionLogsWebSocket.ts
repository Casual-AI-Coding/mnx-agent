import { useEffect } from 'react'
import { useExecutionLogsStore } from '@/stores/executionLogs'

export function useExecutionLogsWebSocket() {
  const subscribe = useExecutionLogsStore((state) => state.subscribeToWebSocket)
  const unsubscribe = useExecutionLogsStore((state) => state.unsubscribeFromWebSocket)

  useEffect(() => {
    subscribe()
    return () => unsubscribe()
  }, [subscribe, unsubscribe])
}