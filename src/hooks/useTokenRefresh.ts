import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth'
import { calculateRefreshTime, isTokenExpired } from '@/lib/jwt'
import { refreshToken } from '@/lib/api/auth'

export function useTokenRefresh() {
  const { accessToken, isAuthenticated, updateAccessToken, logout } = useAuthStore()
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)
  const isMountedRef = useRef(true)
  const initializedRef = useRef(false)

  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    const refreshIn = calculateRefreshTime(token, 3 * 60 * 1000)

    if (refreshIn <= 0) {
      if (!isTokenExpired(token)) {
        performRefresh()
      }
      return
    }

    refreshTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && !isRefreshingRef.current) {
        performRefresh()
      }
    }, refreshIn)
  }, [])

  const performRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return
    isRefreshingRef.current = true

    try {
      const response = await refreshToken()

      if (response.success && response.data?.accessToken) {
        updateAccessToken(response.data.accessToken)
        scheduleRefresh(response.data.accessToken)
      } else {
        logout()
      }
    } catch {
      logout()
    } finally {
      isRefreshingRef.current = false
    }
  }, [updateAccessToken, logout, scheduleRefresh])

  useEffect(() => {
    isMountedRef.current = true

    if (!initializedRef.current) {
      initializedRef.current = true

      if (isAuthenticated && !accessToken) {
        performRefresh()
        return
      }
    }

    if (isAuthenticated && accessToken) {
      scheduleRefresh(accessToken)
    }

    return () => {
      isMountedRef.current = false
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [isAuthenticated, accessToken, scheduleRefresh, performRefresh])
}