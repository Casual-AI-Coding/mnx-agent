import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CapacityRecord, ServiceType } from '../types/cron'

interface CapacityState {
  records: CapacityRecord[]
  loading: boolean
  lastRefresh: number
  fetchCapacity: () => Promise<void>
  refreshCapacity: () => Promise<void>
}

const placeholderApi = {
  fetchCapacity: async (): Promise<CapacityRecord[]> => {
    return [
      {
        id: 'text-capacity',
        serviceType: 'text' as ServiceType,
        remainingQuota: 100000,
        totalQuota: 100000,
        resetAt: new Date(Date.now() + 86400000).toISOString(),
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'voice-sync-capacity',
        serviceType: 'voice_sync' as ServiceType,
        remainingQuota: 5000,
        totalQuota: 5000,
        resetAt: new Date(Date.now() + 86400000).toISOString(),
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'voice-async-capacity',
        serviceType: 'voice_async' as ServiceType,
        remainingQuota: 1000,
        totalQuota: 1000,
        resetAt: new Date(Date.now() + 86400000).toISOString(),
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'image-capacity',
        serviceType: 'image' as ServiceType,
        remainingQuota: 100,
        totalQuota: 100,
        resetAt: new Date(Date.now() + 86400000).toISOString(),
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'music-capacity',
        serviceType: 'music' as ServiceType,
        remainingQuota: 50,
        totalQuota: 50,
        resetAt: new Date(Date.now() + 86400000).toISOString(),
        lastCheckedAt: new Date().toISOString(),
      },
      {
        id: 'video-capacity',
        serviceType: 'video' as ServiceType,
        remainingQuota: 10,
        totalQuota: 10,
        resetAt: new Date(Date.now() + 86400000).toISOString(),
        lastCheckedAt: new Date().toISOString(),
      },
    ]
  },
}

export const useCapacityStore = create<CapacityState>()(
  persist(
    (set, get) => ({
      records: [],
      loading: false,
      lastRefresh: 0,

      fetchCapacity: async () => {
        set({ loading: true })
        try {
          const records = await placeholderApi.fetchCapacity()
          set({
            records,
            loading: false,
            lastRefresh: Date.now(),
          })
        } catch (err) {
          set({ loading: false })
        }
      },

      refreshCapacity: async () => {
        const now = Date.now()
        const lastRefresh = get().lastRefresh
        const minRefreshInterval = 60000

        if (now - lastRefresh < minRefreshInterval) {
          return
        }

        await get().fetchCapacity()
      },
    }),
    {
      name: 'minimax-capacity',
    }
  )
)

export const getCapacityByService = (
  records: CapacityRecord[],
  serviceType: ServiceType
): CapacityRecord | undefined =>
  records.find((record) => record.serviceType === serviceType)

export const hasCapacity = (
  records: CapacityRecord[],
  serviceType: ServiceType,
  requiredQuota = 1
): boolean => {
  const record = getCapacityByService(records, serviceType)
  if (!record) return false
  return record.remainingQuota >= requiredQuota
}