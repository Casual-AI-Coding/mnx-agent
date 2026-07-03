import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'

export interface StoreWebSocketSubscription {
  readonly subscribeToWebSocket: () => void
  readonly unsubscribeFromWebSocket: () => void
}

export function useStoreWebSocketSubscription({
  subscribeToWebSocket,
  unsubscribeFromWebSocket,
}: StoreWebSocketSubscription): void {
  const { isHydrated, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return
    }

    subscribeToWebSocket()

    return () => {
      unsubscribeFromWebSocket()
    }
  }, [isHydrated, isAuthenticated, subscribeToWebSocket, unsubscribeFromWebSocket])
}
