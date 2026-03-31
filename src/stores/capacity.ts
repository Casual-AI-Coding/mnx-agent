import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CapacityRecord, ServiceType } from '../types/cron'
import { useAppStore } from './app'

interface MiniMaxModelRemain {
  model_name: string
  current_interval_total_count: number
  current_interval_usage_count: number
  start_time: number
  end_time: number
  remains_time: number
  current_weekly_total_count: number
  current_weekly_usage_count: number
}

interface CodingPlanResponse {
  model_remains: MiniMaxModelRemain[]
  base_resp: { status_code: number; status_msg: string }
}

interface CapacityState {
  records: CapacityRecord[]
  codingPlan: CodingPlanResponse | null
  loading: boolean
  lastRefresh: number
  fetchCapacity: () => Promise<void>
  refreshCapacity: (force?: boolean) => Promise<void>
}

async function fetchCapacityFromApi(): Promise<{ records: CapacityRecord[]; codingPlan: CodingPlanResponse | null }> {
  const { apiKey, region } = useAppStore.getState()
  
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  
  if (apiKey && apiKey.trim()) {
    const cleanKey = apiKey.trim()
    if (/^[\x00-\x7F]*$/.test(cleanKey)) {
      headers['X-API-Key'] = cleanKey
      headers['X-Region'] = region === 'cn' ? 'cn' : 'intl'
    }
  }
  
  const response = await fetch('/api/capacity', {
    method: 'GET',
    headers,
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch capacity: ${response.status}`)
  }
  
  const data = await response.json()
  
  const codingPlan = data?.data?.codingPlan as CodingPlanResponse | null
  const records = data?.data?.records || []
  
  return {
    records: records.map((r: Record<string, unknown>) => ({
      id: String(r.id || ''),
      serviceType: r.service_type as ServiceType,
      remainingQuota: Number(r.remaining_quota) || 0,
      totalQuota: Number(r.total_quota) || 0,
      resetAt: r.reset_at as string | null,
      lastCheckedAt: r.last_checked_at as string || new Date().toISOString(),
    })),
    codingPlan,
  }
}

export const useCapacityStore = create<CapacityState>()(
  persist(
    (set, get) => ({
      records: [],
      codingPlan: null,
      loading: false,
      lastRefresh: 0,

      fetchCapacity: async () => {
        set({ loading: true })
        try {
          const { records, codingPlan } = await fetchCapacityFromApi()
          set({
            records,
            codingPlan,
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