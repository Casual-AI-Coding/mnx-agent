import { renderHook, waitFor } from '@testing-library/react'
import { useCapacityStore, getCapacityByService, hasCapacity } from '../capacity'
import type { CapacityRecord, ServiceType } from '@/types/cron'

vi.mock('../app', () => ({
  useAppStore: {
    getState: () => ({ apiKey: 'test-key', region: 'cn' }),
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useCapacityStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useCapacityStore.setState({
      records: [],
      codingPlan: null,
      loading: false,
      lastRefresh: 0,
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useCapacityStore())
      expect(result.current.records).toEqual([])
      expect(result.current.codingPlan).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.lastRefresh).toBe(0)
    })
  })

  describe('fetchCapacity', () => {
    it('should fetch capacity from API', async () => {
      const mockCapacityData = {
        data: {
          records: [
            {
              id: '1',
              service_type: 'text',
              remaining_quota: 100,
              total_quota: 200,
              reset_at: '2024-01-01T00:00:00Z',
              last_checked_at: '2024-01-01T00:00:00Z',
            },
          ],
          codingPlan: {
            model_remains: [
              {
                model_name: 'abab6.5s-chat',
                current_interval_total_count: 1000,
                current_interval_usage_count: 500,
                start_time: 1000,
                end_time: 2000,
                remains_time: 1000,
                current_weekly_total_count: 7000,
                current_weekly_usage_count: 3500,
              },
            ],
            base_resp: { status_code: 0, status_msg: 'success' },
          },
        },
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCapacityData),
      })

      const { result } = renderHook(() => useCapacityStore())
      await result.current.fetchCapacity()

      expect(mockFetch).toHaveBeenCalledWith('/api/capacity', expect.objectContaining({
        method: 'GET',
      }))
      expect(result.current.records).toHaveLength(1)
      expect(result.current.records[0].serviceType).toBe('text')
      expect(result.current.records[0].remainingQuota).toBe(100)
      expect(result.current.codingPlan).not.toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.lastRefresh).toBeGreaterThan(0)
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void
      mockFetch.mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const { result } = renderHook(() => useCapacityStore())
      const promise = result.current.fetchCapacity()

      await waitFor(() => expect(result.current.loading).toBe(true))

      resolvePromise!({ ok: true, json: () => Promise.resolve({ data: { records: [] } }) })
      await promise

      await waitFor(() => expect(result.current.loading).toBe(false))
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useCapacityStore())

      await expect(result.current.fetchCapacity()).rejects.toThrow()
      expect(result.current.loading).toBe(false)
    })

    it('should handle empty data response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { records: [] } }),
      })

      const { result } = renderHook(() => useCapacityStore())
      await result.current.fetchCapacity()

      expect(result.current.records).toEqual([])
      expect(result.current.codingPlan).toBeUndefined()
    })
  })

  describe('refreshCapacity', () => {
    it('should skip refresh if too soon', async () => {
      useCapacityStore.setState({ lastRefresh: Date.now() })

      const { result } = renderHook(() => useCapacityStore())
      await result.current.refreshCapacity()

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should force refresh when force=true', async () => {
      useCapacityStore.setState({ lastRefresh: Date.now() })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { records: [] } }),
      })

      const { result } = renderHook(() => useCapacityStore())
      await result.current.refreshCapacity(true)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should refresh if interval passed', async () => {
      // Set lastRefresh to 2 minutes ago (beyond 60s interval)
      useCapacityStore.setState({ lastRefresh: Date.now() - 120000 })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { records: [] } }),
      })

      const { result } = renderHook(() => useCapacityStore())
      await result.current.refreshCapacity()

      expect(mockFetch).toHaveBeenCalled()
    })
  })
})

describe('helper functions', () => {
  const mockRecords: CapacityRecord[] = [
    {
      id: '1',
      serviceType: 'text' as ServiceType,
      remainingQuota: 100,
      totalQuota: 200,
      resetAt: '2024-01-01T00:00:00Z',
      lastCheckedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      serviceType: 'image' as ServiceType,
      remainingQuota: 50,
      totalQuota: 100,
      resetAt: '2024-01-01T00:00:00Z',
      lastCheckedAt: '2024-01-01T00:00:00Z',
    },
  ]

  describe('getCapacityByService', () => {
    it('should find record by service type', () => {
      const record = getCapacityByService(mockRecords, 'text' as ServiceType)
      expect(record).toBeDefined()
      expect(record?.id).toBe('1')
      expect(record?.remainingQuota).toBe(100)
    })

    it('should return undefined for unknown service type', () => {
      const record = getCapacityByService(mockRecords, 'video' as ServiceType)
      expect(record).toBeUndefined()
    })
  })

  describe('hasCapacity', () => {
    it('should return true when quota available', () => {
      expect(hasCapacity(mockRecords, 'text' as ServiceType, 50)).toBe(true)
    })

    it('should return false when quota insufficient', () => {
      expect(hasCapacity(mockRecords, 'text' as ServiceType, 150)).toBe(false)
    })

    it('should return false when no record found', () => {
      expect(hasCapacity(mockRecords, 'video' as ServiceType)).toBe(false)
    })

    it('should use default required quota of 1', () => {
      expect(hasCapacity(mockRecords, 'image' as ServiceType)).toBe(true)
    })
  })
})