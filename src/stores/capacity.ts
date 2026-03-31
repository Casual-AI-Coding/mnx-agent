import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CapacityRecord, ServiceType } from '../types/cron'
import { useAppStore } from './app'

interface CapacityState {
  records: CapacityRecord[]
  loading: boolean
  lastRefresh: number
  fetchCapacity: () => Promise<void>
  refreshCapacity: (force?: boolean) => Promise<void>
}

async function fetchCapacityFromApi(): Promise<CapacityRecord[]> {
  const { apiKey, region } = useAppStore.getState()
  
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (apiKey && apiKey.trim()) {
    headers['X-API-Key'] = apiKey.trim()
    headers['X-Region'] = region === 'cn' ? 'cn' : 'intl'
  }
  
  console.log('[CapacityAPI] Fetching capacity...')
  
  const response = await fetch('/api/cron/capacity', {
    method: 'GET',
    headers,
  })
  
  console.log('[CapacityAPI] Response status:', response.status)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[CapacityAPI] Error response:', errorText)
    throw new Error(`Failed to fetch capacity: ${response.status}`)
  }
  
  const data = await response.json()
  console.log('[CapacityAPI] Response data:', data)
  
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
          console.error('[CapacityStore] fetchCapacity error:', err)
          set({ loading: false })
          throw err
        }
      },

      refreshCapacity: async (force = false) => {
        if (!force) {
          const now = Date.now()
          const lastRefresh = get().lastRefresh
          const minRefreshInterval = 60000

          if (now - lastRefresh < minRefreshInterval) {
            console.log('[CapacityStore] Skipping refresh, too soon')
            return
          }
        }

        await get().fetchCapacity()
      },
    }),
    {
      name: 'minimax-capacity',
      partialize: (state) => ({ records: state.records }),
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