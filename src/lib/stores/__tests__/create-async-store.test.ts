import { createAsyncStore } from '../create-async-store'
import { act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AsyncState } from '../types'

describe('createAsyncStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should create store with async action returning success', async () => {
    const mockApi = vi.fn().mockResolvedValue({ success: true, data: { items: [1, 2, 3] } })

    const useTestStore = createAsyncStore<AsyncState & { items: number[] }>({
      name: 'test-store-success',
      initialState: { items: [], loading: false, error: null },
      actions: {
        fetchItems: {
          apiCall: mockApi,
          onSuccess: (state, data) => { state.items = data.items }
        }
      }
    })

    await act(async () => {
      await useTestStore.getState().fetchItems()
    })

    expect(useTestStore.getState().loading).toBe(false)
    expect(useTestStore.getState().error).toBeNull()
    expect(useTestStore.getState().items).toEqual([1, 2, 3])
  })

  it('should handle API errors', async () => {
    const mockApi = vi.fn().mockResolvedValue({ success: false, error: 'API failed' })

    const useTestStore = createAsyncStore<AsyncState & { items: number[] }>({
      name: 'test-store-api-error',
      initialState: { items: [], loading: false, error: null },
      actions: {
        fetchItems: {
          apiCall: mockApi,
          onSuccess: (state, data) => { state.items = data.items }
        }
      }
    })

    await act(async () => {
      try {
        await useTestStore.getState().fetchItems()
      } catch (e) {
        // Expected - factory throws on error
      }
    })

    expect(useTestStore.getState().loading).toBe(false)
    expect(useTestStore.getState().error).toBe('API failed')
    expect(useTestStore.getState().items).toEqual([])
  })

  it('should handle network errors', async () => {
    const mockApi = vi.fn().mockRejectedValue(new Error('Network error'))

    const useTestStore = createAsyncStore<AsyncState & { items: number[] }>({
      name: 'test-store-network-error',
      initialState: { items: [], loading: false, error: null },
      actions: {
        fetchItems: {
          apiCall: mockApi,
          onSuccess: (state, data) => { state.items = data.items }
        }
      }
    })

    await act(async () => {
      try {
        await useTestStore.getState().fetchItems()
      } catch (e) {
        // Expected - factory throws on error
      }
    })

    expect(useTestStore.getState().error).toBe('Network error')
    expect(useTestStore.getState().loading).toBe(false)
  })
})