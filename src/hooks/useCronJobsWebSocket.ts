import { useCronJobsStore } from '@/stores/cronJobs'
import { useStoreWebSocketSubscription } from './useStoreWebSocketSubscription'

export function useCronJobsWebSocket() {
  const subscribeToWebSocket = useCronJobsStore((state) => state.subscribeToWebSocket)
  const unsubscribeFromWebSocket = useCronJobsStore((state) => state.unsubscribeFromWebSocket)

  useStoreWebSocketSubscription({ subscribeToWebSocket, unsubscribeFromWebSocket })
}
