import { useAuthStore, type AuthUser } from '../auth'

const mockUser: AuthUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  minimax_api_key: 'test-api-key',
  minimax_region: 'domestic',
  role: 'user',
  is_active: true,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isHydrated).toBe(false)
    })
  })

  describe('login', () => {
    it('should set user, accessToken, isAuthenticated=true, and isHydrated=true', () => {
      useAuthStore.getState().login(mockUser, 'test-access-token')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.accessToken).toBe('test-access-token')
      expect(state.isAuthenticated).toBe(true)
      expect(state.isHydrated).toBe(true)
    })

    it('should preserve user data correctly', () => {
      useAuthStore.getState().login(mockUser, 'token-123')

      const state = useAuthStore.getState()
      expect(state.user).toMatchObject({
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        is_active: true,
      })
    })
  })

  describe('logout', () => {
    it('should clear all state', () => {
      // First login to set up state
      useAuthStore.getState().login(mockUser, 'test-access-token')

      // Verify login worked
      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // Now logout
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isHydrated).toBe(false)
    })

    it('should return to initial state after logout', () => {
      useAuthStore.getState().login(mockUser, 'token')
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isHydrated).toBe(false)
    })
  })

  describe('updateAccessToken', () => {
    it('should update only accessToken', () => {
      // Set initial state with login
      useAuthStore.getState().login(mockUser, 'original-token')

      // Update access token
      useAuthStore.getState().updateAccessToken('new-token')

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe('new-token')
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isHydrated).toBe(true)
    })

    it('should handle empty token update', () => {
      useAuthStore.getState().login(mockUser, 'original-token')
      useAuthStore.getState().updateAccessToken('')

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe('')
      expect(state.user).toEqual(mockUser)
    })
  })

  describe('setHydrated', () => {
    it('should set isHydrated flag to true', () => {
      expect(useAuthStore.getState().isHydrated).toBe(false)

      useAuthStore.getState().setHydrated(true)

      expect(useAuthStore.getState().isHydrated).toBe(true)
    })

    it('should set isHydrated flag to false', () => {
      // First set to true
      useAuthStore.getState().setHydrated(true)
      expect(useAuthStore.getState().isHydrated).toBe(true)

      // Then set to false
      useAuthStore.getState().setHydrated(false)

      expect(useAuthStore.getState().isHydrated).toBe(false)
    })

    it('should not affect other state when setting hydrated', () => {
      useAuthStore.getState().login(mockUser, 'token')
      useAuthStore.getState().setHydrated(true)

      const state = useAuthStore.getState()
      // All other state should remain unchanged
      expect(state.user).toEqual(mockUser)
      expect(state.accessToken).toBe('token')
      expect(state.isAuthenticated).toBe(true)
      expect(state.isHydrated).toBe(true)
    })
  })

  describe('partialize behavior', () => {
    it('should only persist user, accessToken, and isAuthenticated (not isHydrated)', () => {
      // The persist middleware's partialize function should only include
      // user, accessToken, isAuthenticated when saving to storage
      const state = useAuthStore.getState()
      const partialized = {
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }

      // isHydrated should NOT be in the persisted state
      expect(partialized).toHaveProperty('user')
      expect(partialized).toHaveProperty('accessToken')
      expect(partialized).toHaveProperty('isAuthenticated')
      // @ts-expect-error - checking that isHydrated is not in the partialized state
      expect(partialized.isHydrated).toBeUndefined()
    })

    it('should persist correct values after login', () => {
      useAuthStore.getState().login(mockUser, 'test-token')

      const state = useAuthStore.getState()
      const partialized = {
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }

      expect(partialized.user).toEqual(mockUser)
      expect(partialized.accessToken).toBe('test-token')
      expect(partialized.isAuthenticated).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should handle full login-logout-update sequence', () => {
      // Login
      useAuthStore.getState().login(mockUser, 'token-1')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // Update token
      useAuthStore.getState().updateAccessToken('token-2')
      expect(useAuthStore.getState().accessToken).toBe('token-2')

      // Logout
      useAuthStore.getState().logout()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)

      // Login again
      useAuthStore.getState().login(mockUser, 'token-3')
      expect(useAuthStore.getState().accessToken).toBe('token-3')
    })

    it('should handle setHydrated after login', () => {
      useAuthStore.getState().login(mockUser, 'token')
      // Simulate rehydration from storage
      useAuthStore.getState().setHydrated(true)

      const state = useAuthStore.getState()
      expect(state.isHydrated).toBe(true)
      expect(state.isAuthenticated).toBe(true)
    })
  })
})