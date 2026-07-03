import { useExecutionLogsStore } from '@/stores/executionLogs'
import { useStoreWebSocketSubscription } from './useStoreWebSocketSubscription'

export function useExecutionLogsWebSocket() {
  const subscribeToWebSocket = useExecutionLogsStore((state) => state.subscribeToWebSocket)
  const unsubscribeFromWebSocket = useExecutionLogsStore((state) => state.unsubscribeFromWebSocket)

  useStoreWebSocketSubscription({ subscribeToWebSocket, unsubscribeFromWebSocket })
}
