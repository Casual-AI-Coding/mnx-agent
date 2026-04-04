import { useEffect } from 'react'
import { useTaskQueueStore } from '@/stores/taskQueue'

export function useTaskQueueWebSocket() {
  const subscribe = useTaskQueueStore((state) => state.subscribeToWebSocket)
  const unsubscribe = useTaskQueueStore((state) => state.unsubscribeFromWebSocket)

  useEffect(() => {
    subscribe()
    return () => unsubscribe()
  }, [subscribe, unsubscribe])
}