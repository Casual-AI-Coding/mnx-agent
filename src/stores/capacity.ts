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

async function fetchCapacityFromApi(): Promise<CapacityRecord[]> {
  const response = await fetch('/api/cron/capacity', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch capacity')
  }
  
  const data = await response.json()
  const records = data?.data?.records || []
  
  return records.map((r: Record<string, unknown>) => ({
    id: String(r.id || ''),
    serviceType: r.service_type as ServiceType,
    remainingQuota: Number(r.remaining_quota) || 0,
    totalQuota: Number(r.total_quota) || 0,
    resetAt: r.reset_at as string | null,
    lastCheckedAt: r.last_checked_at as string || new Date().toISOString(),
  }))
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
          const records = await fetchCapacityFromApi()
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