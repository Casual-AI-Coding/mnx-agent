import { useTaskQueueStore } from '@/stores/taskQueue'
import { useStoreWebSocketSubscription } from './useStoreWebSocketSubscription'

export function useTaskQueueWebSocket() {
  const subscribeToWebSocket = useTaskQueueStore((state) => state.subscribeToWebSocket)
  const unsubscribeFromWebSocket = useTaskQueueStore((state) => state.unsubscribeFromWebSocket)

  useStoreWebSocketSubscription({ subscribeToWebSocket, unsubscribeFromWebSocket })
}
