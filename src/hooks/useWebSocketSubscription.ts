import { useEffect, useState } from 'react'
import { getWebSocketClient, WebSocketChannel } from '@/lib/websocket-client'

export interface WebSocketHookOptions<T> {
  eventType: WebSocketChannel
  transformEvent: (payload: unknown) => T
  onCreated?: (item: T) => void
  onUpdated?: (item: T) => void
  onDeleted?: (id: string) => void
}

export function createWebSocketHook<T>(options: WebSocketHookOptions<T>) {
  return function useWebSocketSubscription() {
    const client = getWebSocketClient()
    const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null)

    useEffect(() => {
      if (!client || unsubscribe) return

      const unsub = client.onEvent(options.eventType, (event) => {
        const { type, payload } = event
        switch (type) {
          case 'created':
            options.onCreated?.(options.transformEvent(payload))
            break
          case 'updated':
            options.onUpdated?.(options.transformEvent(payload))
            break
          case 'deleted':
            options.onDeleted?.((payload as { id: string }).id)
            break
        }
      })

      setUnsubscribe(() => unsub)
      return () => unsub()
    }, [client])

    return { unsubscribe }
  }
}