import { useEffect } from 'react'
import { useTaskQueueStore } from '@/stores/taskQueue'
import { useAuthStore } from '@/stores/auth'

export function useTaskQueueWebSocket() {
  const { isHydrated, isAuthenticated } = useAuthStore()
  const subscribe = useTaskQueueStore((state) => state.subscribeToWebSocket)
  const unsubscribe = useTaskQueueStore((state) => state.unsubscribeFromWebSocket)

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return
    subscribe()
    return () => unsubscribe()
  }, [isHydrated, isAuthenticated, subscribe, unsubscribe])
}