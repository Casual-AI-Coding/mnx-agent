import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../stores/auth'
import { useStoreWebSocketSubscription } from './useStoreWebSocketSubscription'

vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

const authenticatedState = {
  isHydrated: true,
  isAuthenticated: true,
} as const

const unauthenticatedState = {
  isHydrated: true,
  isAuthenticated: false,
} as const

const pendingHydrationState = {
  isHydrated: false,
  isAuthenticated: true,
} as const

describe('useStoreWebSocketSubscription', () => {
  const subscribeToWebSocket = vi.fn()
  const unsubscribeFromWebSocket = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('subscribes once when auth is hydrated and authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue(authenticatedState)

    const { unmount } = renderHook(() =>
      useStoreWebSocketSubscription({
        subscribeToWebSocket,
        unsubscribeFromWebSocket,
      }),
    )

    expect(subscribeToWebSocket).toHaveBeenCalledTimes(1)
    expect(unsubscribeFromWebSocket).not.toHaveBeenCalled()

    unmount()
  })

  it('does not subscribe before auth hydration completes', () => {
    vi.mocked(useAuthStore).mockReturnValue(pendingHydrationState)

    const { unmount } = renderHook(() =>
      useStoreWebSocketSubscription({
        subscribeToWebSocket,
        unsubscribeFromWebSocket,
      }),
    )

    expect(subscribeToWebSocket).not.toHaveBeenCalled()

    unmount()

    expect(unsubscribeFromWebSocket).not.toHaveBeenCalled()
  })

  it('does not subscribe when auth is hydrated but unauthenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue(unauthenticatedState)

    const { unmount } = renderHook(() =>
      useStoreWebSocketSubscription({
        subscribeToWebSocket,
        unsubscribeFromWebSocket,
      }),
    )

    expect(subscribeToWebSocket).not.toHaveBeenCalled()

    unmount()

    expect(unsubscribeFromWebSocket).not.toHaveBeenCalled()
  })

  it('unsubscribes once when mounted subscription unmounts', () => {
    vi.mocked(useAuthStore).mockReturnValue(authenticatedState)

    const { unmount } = renderHook(() =>
      useStoreWebSocketSubscription({
        subscribeToWebSocket,
        unsubscribeFromWebSocket,
      }),
    )

    unmount()

    expect(unsubscribeFromWebSocket).toHaveBeenCalledTimes(1)
  })

  it('subscribes when auth changes from pending hydration to authenticated', () => {
    vi.mocked(useAuthStore)
      .mockReturnValueOnce(pendingHydrationState)
      .mockReturnValueOnce(authenticatedState)

    const { rerender, unmount } = renderHook(() =>
      useStoreWebSocketSubscription({
        subscribeToWebSocket,
        unsubscribeFromWebSocket,
      }),
    )

    expect(subscribeToWebSocket).not.toHaveBeenCalled()

    rerender()

    expect(subscribeToWebSocket).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('unsubscribes when auth changes from authenticated to unauthenticated', () => {
    vi.mocked(useAuthStore)
      .mockReturnValueOnce(authenticatedState)
      .mockReturnValueOnce(unauthenticatedState)

    const { rerender } = renderHook(() =>
      useStoreWebSocketSubscription({
        subscribeToWebSocket,
        unsubscribeFromWebSocket,
      }),
    )

    expect(subscribeToWebSocket).toHaveBeenCalledTimes(1)

    rerender()

    expect(unsubscribeFromWebSocket).toHaveBeenCalledTimes(1)
  })
})
