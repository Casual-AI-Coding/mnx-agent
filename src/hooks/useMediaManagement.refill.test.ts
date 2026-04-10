import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMediaManagement } from './useMediaManagement'
import * as mediaApi from '@/lib/api/media'

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}
global.IntersectionObserver = IntersectionObserverMock as any

// Mock the API module
vi.mock('@/lib/api/media', () => ({
  listMedia: vi.fn(),
  deleteMedia: vi.fn(),
  batchDeleteMedia: vi.fn(),
  getMediaDownloadUrl: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useMediaManagement - Smart Refill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should refill page when last item deleted on page > 1', async () => {
    const mockRecordsPage1 = [
      { id: '1', filename: 'page1.png' },
      { id: '2', filename: 'page1_2.png' },
    ]
    const mockRecordsPage2 = [{ id: '3', filename: 'test.png' }]
    const refillRecords = [{ id: '4', filename: 'new.png' }]
    
    vi.mocked(mediaApi.listMedia)
      .mockResolvedValueOnce({
        success: true,
        data: {
          records: mockRecordsPage1,
          pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          records: mockRecordsPage2,
          pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          records: refillRecords,
          pagination: { page: 2, limit: 20, total: 20, totalPages: 1 },
        },
      })
    
    vi.mocked(mediaApi.deleteMedia).mockResolvedValue(undefined)

    const { result } = renderHook(() => useMediaManagement())
    
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    
    act(() => {
      result.current.handlePageChange(2)
    })
    
    await waitFor(() => expect(result.current.pagination.page).toBe(2))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    
    const initialCallCount = vi.mocked(mediaApi.listMedia).mock.calls.length
    
    await act(async () => {
      result.current.handleDelete(mockRecordsPage2[0])
    })
    
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    
    const finalCallCount = vi.mocked(mediaApi.listMedia).mock.calls.length
    expect(finalCallCount).toBeGreaterThan(initialCallCount)
  })

  it('should not refill when items remain on page', async () => {
    // Setup: Page 1 with 2 items
    const mockRecords = [
      { id: '1', filename: 'test1.png' },
      { id: '2', filename: 'test2.png' },
    ]
    
    const listMediaSpy = vi.fn()
    vi.mocked(mediaApi.listMedia)
      .mockImplementation(() => {
        listMediaSpy()
        return Promise.resolve({
          success: true,
          data: {
            records: mockRecords,
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
          },
        })
      })
    vi.mocked(mediaApi.deleteMedia).mockResolvedValue(undefined)

    const { result } = renderHook(() => useMediaManagement())
    
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const callsAfterInitialLoad = listMediaSpy.mock.calls.length
    
    // Delete one item (one remains)
    await act(async () => {
      result.current.handleDelete(mockRecords[0])
    })

    const callsAfterDelete = listMediaSpy.mock.calls.length
    console.log('Calls after initial load:', callsAfterInitialLoad)
    console.log('Calls after delete:', callsAfterDelete)
    
    // Should only call listMedia once (initial load)
    expect(listMediaSpy.mock.calls.length).toBe(1)
  })

  it('should update to empty state when page 1 becomes empty', async () => {
    const mockRecords = [{ id: '1', filename: 'test.png' }]
    
    vi.mocked(mediaApi.listMedia)
      .mockResolvedValueOnce({
        success: true,
        data: {
          records: mockRecords,
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      })
      .mockResolvedValue({
        success: true,
        data: {
          records: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        },
      })
    vi.mocked(mediaApi.deleteMedia).mockResolvedValue(undefined)

    const { result } = renderHook(() => useMediaManagement())
    
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    
    await act(async () => {
      result.current.handleDelete(mockRecords[0])
    })

    // Records should be empty, no refill needed on page 1
    expect(result.current.records).toHaveLength(0)
    expect(mediaApi.listMedia).toHaveBeenCalledTimes(1)
  })
})