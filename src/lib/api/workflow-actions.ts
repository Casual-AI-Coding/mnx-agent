import { apiClient } from '@/lib/api/client'
import { GroupedActionNodes } from '@/types/cron'

const actionsCache: {
  data: GroupedActionNodes | null
  timestamp: number
  promise: Promise<GroupedActionNodes> | null
} = {
  data: null,
  timestamp: 0,
  promise: null,
}

const CACHE_TTL = 5 * 60 * 1000

export async function fetchAvailableActions(): Promise<GroupedActionNodes> {
  const now = Date.now()

  if (actionsCache.data && (now - actionsCache.timestamp) < CACHE_TTL) {
    return actionsCache.data
  }

  if (actionsCache.promise) {
    return actionsCache.promise
  }

  actionsCache.promise = apiClient.get<GroupedActionNodes>('/workflows/available-actions')
    .then(data => {
      actionsCache.data = data
      actionsCache.timestamp = now
      return data
    })
    .finally(() => {
      actionsCache.promise = null
    })

  return actionsCache.promise
}

export function clearActionsCache() {
  actionsCache.data = null
  actionsCache.timestamp = 0
  actionsCache.promise = null
}