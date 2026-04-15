# Token Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automatic token refresh mechanism using httpOnly cookies for refresh tokens, with proactive expiration-based refresh and 401 fallback handling.

**Architecture:** Split into backend (Express + cookie-parser + JWT) and frontend (React + Zustand + Axios interceptors). Backend stores refresh tokens in httpOnly cookies for XSS protection. Frontend manages proactive token refresh via setTimeout and handles 401 errors with a refresh queue. Both systems support token rotation on each refresh.

**Tech Stack:** Express, cookie-parser, jsonwebtoken, React 18, Zustand, Axios, TypeScript

**Reference Spec:** @docs/specs/2026-04-08-token-refresh-design.md

**Current State:**
- Access tokens (15m expiry) and refresh tokens (7d expiry) are generated on login
- Both tokens are stored in localStorage (vulnerable to XSS)
- No refresh endpoint exists - users must re-login after 15 minutes
- 401 response simply redirects to login

**Target State:**
- Refresh tokens stored in httpOnly cookies (XSS protected)
- Access tokens kept in memory only
- Automatic proactive refresh before expiration (3 min buffer)
- 401 responses trigger token refresh with queue for concurrent requests

---

## Phase 1: Backend Foundation

### Task 1.1: Install cookie-parser dependency

**Files:**
- Modify: `package.json`

**Purpose:** Add cookie-parser middleware to parse incoming cookies.

- [ ] **Step 1: Check current dependencies**

Run: `grep "cookie-parser" package.json`
Expected: No output (cookie-parser not installed)

- [ ] **Step 2: Add cookie-parser dependency**

```bash
npm install cookie-parser
```
Expected: Package installed successfully

- [ ] **Step 3: Verify installation**

Run: `grep "cookie-parser" package.json`
Expected: Shows cookie-parser with version

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add cookie-parser for httpOnly cookie support"
```

---

### Task 1.2: Add cookie-parser middleware to Express

**Files:**
- Modify: `server/index.ts:1-70`

**Purpose:** Enable cookie parsing for all incoming requests.

- [ ] **Step 1: Import cookie-parser**

Add import at the top of `server/index.ts`:

```typescript
import cookieParser from 'cookie-parser'
```

- [ ] **Step 2: Add cookie-parser middleware**

Add after line 66 (after urlencoded middleware):

```typescript
app.use(cookieParser())
```

**Verification:**
The middleware should be placed like this:
```typescript
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())  // <-- Add this
app.use(requestLogger)
app.use(rateLimiter)
app.use(auditMiddleware)
```

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat(auth): add cookie-parser middleware"
```

---

### Task 1.3: Update UserService with verifyRefreshToken method

**Files:**
- Modify: `server/services/user-service.ts:248-259`

**Purpose:** Add static method to verify refresh tokens specifically.

- [ ] **Step 1: Add verifyRefreshToken method**

Replace the existing `verifyToken` method at line 248 with these two methods:

```typescript
  static verifyToken(token: string): TokenPayload | null {
    try {
      const secret = process.env.JWT_SECRET
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required')
      }
      const payload = jwt.verify(token, secret) as TokenPayload
      // Reject refresh tokens when expecting access tokens
      if ((payload as RefreshTokenPayload).type === 'refresh') {
        return null
      }
      return payload
    } catch {
      return null
    }
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const secret = process.env.JWT_SECRET
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required')
      }
      const payload = jwt.verify(token, secret) as RefreshTokenPayload
      // Must be a refresh token
      if (payload.type !== 'refresh') {
        return null
      }
      return payload
    } catch {
      return null
    }
  }
```

- [ ] **Step 2: Write test for verifyRefreshToken**

Create: `server/services/__tests__/user-service-token-refresh.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { UserService } from '../user-service.js'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret-for-token-refresh'

describe('UserService Token Verification', () => {
  describe('verifyToken', () => {
    it('should reject refresh tokens', () => {
      const refreshToken = jwt.sign(
        { userId: 'test-id', username: 'test', role: 'user', type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )
      
      const result = UserService.verifyToken(refreshToken)
      expect(result).toBeNull()
    })

    it('should accept valid access tokens', () => {
      const accessToken = jwt.sign(
        { userId: 'test-id', username: 'test', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      )
      
      const result = UserService.verifyToken(accessToken)
      expect(result).not.toBeNull()
      expect(result?.userId).toBe('test-id')
    })
  })

  describe('verifyRefreshToken', () => {
    it('should accept valid refresh tokens', () => {
      const refreshToken = jwt.sign(
        { userId: 'test-id', username: 'test', role: 'user', type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )
      
      const result = UserService.verifyRefreshToken(refreshToken)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('refresh')
    })

    it('should reject access tokens', () => {
      const accessToken = jwt.sign(
        { userId: 'test-id', username: 'test', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      )
      
      const result = UserService.verifyRefreshToken(accessToken)
      expect(result).toBeNull()
    })

    it('should reject expired tokens', () => {
      const expiredToken = jwt.sign(
        { userId: 'test-id', username: 'test', role: 'user', type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      )
      
      const result = UserService.verifyRefreshToken(expiredToken)
      expect(result).toBeNull()
    })
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npm run test:server -- server/services/__tests__/user-service-token-refresh.test.ts
```
Expected: All 6 tests pass

- [ ] **Step 4: Commit**

```bash
git add server/services/user-service.ts server/services/__tests__/user-service-token-refresh.test.ts
git commit -m "feat(auth): add verifyRefreshToken method to UserService"
```

---

### Task 1.4: Update auth routes with refresh endpoint

**Files:**
- Modify: `server/routes/auth.ts:1-122`

**Purpose:** Add POST /refresh endpoint that accepts httpOnly cookie, verifies refresh token, and returns new access token.

- [ ] **Step 1: Add refresh endpoint**

Add after line 52 (after login route):

```typescript
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken

  if (!refreshToken) {
    errorResponse(res, '未提供刷新令牌', 401)
    return
  }

  const payload = UserService.verifyRefreshToken(refreshToken)
  if (!payload) {
    errorResponse(res, '刷新令牌无效或已过期', 401)
    return
  }

  // Generate new tokens (token rotation)
  const userService = new UserService(getConnection())
  const user = await userService.getUserById(payload.userId)
  
  if (!user || !user.is_active) {
    errorResponse(res, '用户不存在或已被禁用', 401)
    return
  }

  const newAccessToken = userService.generateAccessToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  })
  const newRefreshToken = userService.generateRefreshToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  })

  // Set new refresh token in httpOnly cookie
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  successResponse(res, { accessToken: newAccessToken })
}))
```

- [ ] **Step 2: Add logout endpoint**

Add after refresh endpoint:

```typescript
router.post('/logout', authenticateJWT, asyncHandler(async (req: Request, res) => {
  // Clear refresh token cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  })

  successResponse(res, { message: '已登出' })
}))
```

- [ ] **Step 3: Write tests for refresh endpoint**

Create: `server/routes/__tests__/auth-refresh.test.ts`

```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'
import authRouter from '../auth.js'
import { getConnection } from '../../database/connection.js'
import { UserService } from '../../services/user-service.js'

process.env.JWT_SECRET = 'test-secret-refresh'

async function createTestUser() {
  const conn = getConnection()
  const userService = new UserService(conn)
  
  const result = await userService.register({
    username: 'refresh-test-user',
    password: 'testpassword123',
    invitationCode: 'TEST-CODE-123',
    email: 'test@example.com',
  })
  
  return result.user!
}

describe('POST /api/auth/refresh', () => {
  let app: express.Application
  let testUser: { id: string; username: string; role: string }
  let refreshToken: string
  let accessToken: string

  beforeAll(async () => {
    testUser = await createTestUser()
    const conn = getConnection()
    const userService = new UserService(conn)
    const loginResult = await userService.login('refresh-test-user', 'testpassword123')
    refreshToken = loginResult.refreshToken!
    accessToken = loginResult.accessToken!
  })

  beforeEach(() => {
    app = express()
    app.use(cookieParser())
    app.use(express.json())
    app.use('/api/auth', authRouter)
  })

  it('should refresh tokens with valid refresh token cookie', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`])
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.accessToken).toBeDefined()
    expect(response.headers['set-cookie']).toBeDefined()
  })

  it('should return 401 without refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .expect(401)

    expect(response.body.success).toBe(false)
    expect(response.body.error).toContain('刷新令牌')
  })

  it('should return 401 with invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=invalid-token'])
      .expect(401)

    expect(response.body.success).toBe(false)
  })

  it('should rotate refresh token on successful refresh', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`])
      .expect(200)

    const cookies = response.headers['set-cookie'] as string[]
    expect(cookies.some(c => c.includes('refreshToken='))).toBe(true)
    expect(cookies.some(c => c.includes('HttpOnly'))).toBe(true)
  })
})

describe('POST /api/auth/logout', () => {
  let app: express.Application
  let accessToken: string

  beforeAll(async () => {
    const conn = getConnection()
    const userService = new UserService(conn)
    const loginResult = await userService.login('refresh-test-user', 'testpassword123')
    accessToken = loginResult.accessToken!
  })

  beforeEach(() => {
    app = express()
    app.use(cookieParser())
    app.use(express.json())
    app.use('/api/auth', authRouter)
  })

  it('should clear refresh token cookie on logout', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(response.body.success).toBe(true)
    
    const cookies = response.headers['set-cookie'] as string[]
    expect(cookies.some(c => c.includes('Max-Age=0'))).toBe(true)
  })

  it('should require authentication', async () => {
    await request(app)
      .post('/api/auth/logout')
      .expect(401)
  })
})
```

- [ ] **Step 4: Run tests**

```bash
npm run test:server -- server/routes/__tests__/auth-refresh.test.ts
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add server/routes/auth.ts server/routes/__tests__/auth-refresh.test.ts
git commit -m "feat(auth): add refresh and logout endpoints"
```

---

### Task 1.5: Update login endpoint to use httpOnly cookie

**Files:**
- Modify: `server/routes/auth.ts:35-52`

**Purpose:** Modify login to return refresh token in httpOnly cookie instead of response body.

- [ ] **Step 1: Update login route**

Replace the login route (lines 35-52) with:

```typescript
router.post('/login', authRateLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body
  const conn = getConnection()
  const userService = new UserService(conn)

  const result = await userService.login(username, password)

  if (!result.success) {
    errorResponse(res, result.error ?? 'Login failed', 401)
    return
  }

  // Set refresh token in httpOnly cookie
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  // Only return access token in response body
  successResponse(res, {
    user: result.user,
    accessToken: result.accessToken,
    // refreshToken intentionally omitted - sent via cookie
  })
}))
```

- [ ] **Step 2: Update register route**

Similarly update the register route (lines 54-73) to use cookie:

```typescript
router.post('/register', authRateLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { username, password, invitationCode, email } = req.body
  const conn = getConnection()
  const userService = new UserService(conn)

  const result = await userService.register({ username, password, invitationCode, email })

  if (!result.success) {
    errorResponse(res, result.error ?? 'Registration failed', 400)
    return
  }

  const loginResult = await userService.login(username, password)

  // Set refresh token in httpOnly cookie
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('refreshToken', loginResult.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000

- [ ] **Step 3: Update tests for login/register**

Update `server/routes/__tests__/auth.test.ts` to verify cookie is set:

```typescript
  it('should set refresh token cookie on login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpassword' })
      .expect(200)

    expect(response.body.data).not.toHaveProperty('refreshToken')
    expect(response.body.data.accessToken).toBeDefined()
    
    const cookies = response.headers['set-cookie'] as string[]
    expect(cookies.some(c => c.includes('refreshToken='))).toBe(true)
    expect(cookies.some(c => c.includes('HttpOnly'))).toBe(true)
  })
```

- [ ] **Step 4: Run all auth tests**

```bash
npm run test:server -- server/routes/__tests__/auth*.test.ts
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add server/routes/auth.ts server/routes/__tests__/auth.test.ts
git commit -m "feat(auth): use httpOnly cookie for refresh token on login/register"
```

---

## Phase 2: Frontend JWT Utilities

### Task 2.1: Create JWT parsing utility

**Files:**
- Create: `src/lib/jwt.ts`

**Purpose:** Add utility functions to parse JWT expiration and calculate refresh timing.

- [ ] **Step 1: Create JWT utility file**

```typescript
/**
 * JWT utility functions for token refresh
 */

export interface JWTPayload {
  userId: string
  username: string
  role: string
  exp?: number
  iat?: number
}

/**
 * Parse JWT token and extract payload
 * Does NOT verify signature - for client-side timing only
 */
export function parseJWT(token: string): JWTPayload | null {
  try {
    const [, payloadB64] = token.split('.')
    if (!payloadB64) return null
    
    // Handle base64url encoding
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=')
    
    const json = atob(padded)
    return JSON.parse(json) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Extract expiration date from JWT token
 */
export function parseTokenExpiry(token: string): Date | null {
  const payload = parseJWT(token)
  if (!payload?.exp) return null
  return new Date(payload.exp * 1000)
}

/**
 * Calculate milliseconds until token expiration
 */
export function getTimeUntilExpiry(token: string): number {
  const expiry = parseTokenExpiry(token)
  if (!expiry) return 0
  return Math.max(0, expiry.getTime() - Date.now())
}

/**
 * Calculate when to refresh token (3 minutes before expiry)
 * Returns milliseconds, or 0 if already expired/expiry unknown
 */
export function calculateRefreshTime(token: string, bufferMs: number = 3 * 60 * 1000): number {
  const timeUntilExpiry = getTimeUntilExpiry(token)
  if (timeUntilExpiry <= 0) return 0
  return Math.max(0, timeUntilExpiry - bufferMs)
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const timeUntilExpiry = getTimeUntilExpiry(token)
  return timeUntilExpiry <= 0
}

/**
 * Check if token needs refresh (within buffer time of expiry)
 */
export function shouldRefreshToken(token: string, bufferMs: number = 3 * 60 * 1000): boolean {
  const timeUntilExpiry = getTimeUntilExpiry(token)
  return timeUntilExpiry <= bufferMs
}
```

- [ ] **Step 2: Write tests for JWT utilities**

Create: `src/lib/__tests__/jwt.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  parseJWT,
  parseTokenExpiry,
  getTimeUntilExpiry,
  calculateRefreshTime,
  isTokenExpired,
  shouldRefreshToken,
} from '../jwt'

// Helper to create a test JWT
function createTestJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${header}.${body}.`
}

describe('JWT Utilities', () => {
  describe('parseJWT', () => {
    it('should parse valid JWT payload', () => {
      const payload = { userId: 'test', username: 'testuser', role: 'user' }
      const token = createTestJWT(payload)
      const result = parseJWT(token)
      
      expect(result).not.toBeNull()
      expect(result?.userId).toBe('test')
      expect(result?.username).toBe('testuser')
    })

    it('should handle malformed tokens', () => {
      expect(parseJWT('invalid')).toBeNull()
      expect(parseJWT('')).toBeNull()
      expect(parseJWT('header.only')).toBeNull()
    })
  })

  describe('parseTokenExpiry', () => {
    it('should extract expiration date', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const token = createTestJWT({ exp })
      const result = parseTokenExpiry(token)
      
      expect(result).not.toBeNull()
      expect(result?.getTime()).toBe(exp * 1000)
    })

    it('should return null for tokens without exp', () => {
      const token = createTestJWT({ userId: 'test' })
      expect(parseTokenExpiry(token)).toBeNull()
    })
  })

  describe('getTimeUntilExpiry', () => {
    it('should return positive time for future expiry', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const token = createTestJWT({ exp })
      const timeLeft = getTimeUntilExpiry(token)
      
      expect(timeLeft).toBeGreaterThan(0)
      expect(timeLeft).toBeLessThanOrEqual(3600 * 1000)
    })

    it('should return 0 for expired tokens', () => {
      const exp = Math.floor(Date.now() / 1000) - 3600
      const token = createTestJWT({ exp })
      expect(getTimeUntilExpiry(token)).toBe(0)
    })
  })

  describe('calculateRefreshTime', () => {
    it('should calculate refresh time with buffer', () => {
      const exp = Math.floor(Date.now() / 1000) + 600 // 10 minutes
      const token = createTestJWT({ exp })
      const refreshTime = calculateRefreshTime(token, 3 * 60 * 1000) // 3 min buffer
      
      // Should be ~7 minutes (10 - 3)
      expect(refreshTime).toBeGreaterThan(6 * 60 * 1000)
      expect(refreshTime).toBeLessThan(8 * 60 * 1000)
    })

    it('should return 0 for expired tokens', () => {
      const exp = Math.floor(Date.now() / 1000) - 60
      const token = createTestJWT({ exp })
      expect(calculateRefreshTime(token)).toBe(0)
    })
  })

  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      const token = createTestJWT({ exp: Math.floor(Date.now() / 1000) - 1 })
      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return false for valid token', () => {
      const token = createTestJWT({ exp: Math.floor(Date.now() / 1000) + 3600 })
      expect(isTokenExpired(token)).toBe(false)
    })
  })

  describe('shouldRefreshToken', () => {
    it('should return true if within buffer time', () => {
      const token = createTestJWT({ exp: Math.floor(Date.now() / 1000) + 60 }) // 1 min left
      expect(shouldRefreshToken(token, 3 * 60 * 1000)).toBe(true)
    })

    it('should return false if outside buffer time', () => {
      const token = createTestJWT({ exp: Math.floor(Date.now() / 1000) + 600 }) // 10 min left
      expect(shouldRefreshToken(token, 3 * 60 * 1000)).toBe(false)
    })
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/lib/__tests__/jwt.test.ts
```
Expected: All 14 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/jwt.ts src/lib/__tests__/jwt.test.ts
git commit -m "feat(auth): add JWT parsing utilities"
```

---

## Phase 3: Frontend Auth API Updates

### Task 3.1: Update auth API client

**Files:**
- Modify: `src/lib/api/auth.ts`

**Purpose:** Update auth API to handle cookie-based authentication and add refresh/logout functions.

- [ ] **Step 1: Update LoginResponse interface**

```typescript
export interface LoginResponse {
  success: boolean
  data?: { user: AuthUser; accessToken: string }  // Removed refreshToken
  error?: string
}

export interface RefreshResponse {
  success: boolean
  data?: { accessToken: string }
  error?: string
}

export interface LogoutResponse {
  success: boolean
  data?: { message: string }
  error?: string
}
```

- [ ] **Step 2: Update axios instance with credentials**

```typescript
const authApi = axios.create({
  baseURL: '/api/auth',
  timeout: 10000,
  withCredentials: true, // Enable sending/receiving cookies
})
```

- [ ] **Step 3: Add refresh function**

```typescript
export async function refreshToken(): Promise<RefreshResponse> {
  const response = await authApi.post<RefreshResponse>('/refresh', {}, {
    withCredentials: true,
  })
  return response.data
}
```

- [ ] **Step 4: Add logout function**

```typescript
export async function logout(accessToken: string): Promise<LogoutResponse> {
  const response = await authApi.post<LogoutResponse>('/logout', {}, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return response.data
}
```

- [ ] **Step 5: Update login and register functions**

Ensure they use `withCredentials: true`:

```typescript
export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/login', { username, password }, {
    withCredentials: true,
  })
  return response.data
}

export async function register(
  username: string,
  password: string,
  invitationCode: string,
  email?: string | null
): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/register', {
    username, password, invitationCode, email,
  }, {
    withCredentials: true,
  })
  return response.data
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/auth.ts
git commit -m "feat(auth): update auth API for cookie-based refresh"
```

---

## Phase 4: Auth Store Updates

### Task 4.1: Update auth store

**Files:**
- Modify: `src/stores/auth.ts`

**Purpose:** Remove refreshToken from persistence, add updateAccessToken action.

- [ ] **Step 1: Update AuthState interface**

```typescript
interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  // refreshToken removed - now in httpOnly cookie
  isAuthenticated: boolean
  login: (user: AuthUser, accessToken: string) => void
  logout: () => void
  updateAccessToken: (accessToken: string) => void
  clearAuth: () => void
}
```

- [ ] **Step 2: Update store implementation**

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (user, accessToken) => set({
        user,
        accessToken,
        isAuthenticated: true,
      }),
      logout: () => set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      }),
      updateAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      }),
    }),
    { 
      name: 'auth-storage',
      // Only persist user info, NOT access token (keep in memory for security)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // accessToken intentionally NOT persisted
      }),
    }
  )
)
```

- [ ] **Step 3: Update imports in Login page**

Check `src/pages/Login.tsx` and update to remove refreshToken:

```typescript
// Before:
const { login } = useAuthStore()
login(response.data.user, response.data.accessToken, response.data.refreshToken)

// After:
const { login } = useAuthStore()
login(response.data.user, response.data.accessToken)
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/auth.ts src/pages/Login.tsx
git commit -m "feat(auth): update auth store for memory-only access tokens"
```

---

## Phase 5: API Client Interceptor Updates

### Task 5.1: Update API client with refresh handling

**Files:**
- Modify: `src/lib/api/client.ts`

**Purpose:** Add 401 interceptor that triggers token refresh with concurrent request queuing.

- [ ] **Step 1: Add refresh state tracking**

Add at the top of InternalAPIClient class (after line 18):

```typescript
  private isRefreshing = false
  private refreshSubscribers: Array<(token: string) => void> = []

  private onRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token))
    this.refreshSubscribers = []
  }

  private addRefreshSubscriber(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback)
  }
```

- [ ] **Step 2: Add refresh token method**

Add method to handle token refresh:

```typescript
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const response = await axios.post<{
        success: boolean
        data?: { accessToken: string }
        error?: string
      }>('/api/auth/refresh', {}, { withCredentials: true })
      
      if (response.data.success && response.data.data?.accessToken) {
        const newToken = response.data.data.accessToken
        useAuthStore.getState().updateAccessToken(newToken)
        return newToken
      }
      return null
    } catch (error) {
      return null
    }
  }
```

- [ ] **Step 3: Update response interceptor**

Replace the response interceptor (lines 43-59) with:

```typescript
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<{ error?: string; base_resp?: { status_code: number; status_msg: string } }>) => {
        const originalRequest = error.config

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && originalRequest) {
          // Don't retry refresh endpoint itself
          if (originalRequest.url?.includes('/auth/refresh')) {
            useAuthStore.getState().logout()
            window.location.href = '/login'
            return Promise.reject(error)
          }

          // If already refreshing, queue this request
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.addRefreshSubscriber((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers['Authorization'] = `Bearer ${token}`
                }
                resolve(this.client.request(originalRequest))
              })
            })
          }

          this.isRefreshing = true

          try {
            const newToken = await this.refreshAccessToken()
            
            if (newToken) {
              this.isRefreshing = false
              this.onRefreshed(newToken)
              
              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              }
              return this.client.request(originalRequest)
            } else {
              // Refresh failed - logout
              this.isRefreshing = false
              useAuthStore.getState().logout()
              window.location.href = '/login'
            }
          } catch (refreshError) {
            this.isRefreshing = false
            useAuthStore.getState().logout()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        // Handle other errors
        const statusCode = error.response?.status
        const apiCode = error.response?.data?.base_resp?.status_code
        const message =
          error.response?.data?.error ||
          error.response?.data?.base_resp?.status_msg ||
          error.message ||
          'Unknown error'
        return Promise.reject(new ApiError(message, statusCode, apiCode?.toString()))
      }
    )
```

- [ ] **Step 4: Add withCredentials to axios config**

Update constructor config:

```typescript
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      withCredentials: true, // Enable cookies for auth endpoints
      headers: {
        'Content-Type': 'application/json',
      },
    })
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/client.ts
git commit -m "feat(auth): add 401 interceptor with token refresh queue"
```

---

## Phase 6: Token Refresh Hook

### Task 6.1: Create useTokenRefresh hook

**Files:**
- Create: `src/hooks/useTokenRefresh.ts`

**Purpose:** Hook to proactively refresh token before expiration using setTimeout.

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth'
import { calculateRefreshTime, isTokenExpired } from '@/lib/jwt'
import { refreshToken } from '@/lib/api/auth'

/**
 * Hook to automatically refresh access token before expiration
 * Runs a timer that refreshes the token 3 minutes before expiry
 */
export function useTokenRefresh() {
  const { accessToken, isAuthenticated, updateAccessToken, logout } = useAuthStore()
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const scheduleRefresh = useCallback((token: string) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    // Calculate when to refresh (3 minutes before expiry)
    const refreshIn = calculateRefreshTime(token, 3 * 60 * 1000)
    
    if (refreshIn <= 0) {
      // Token already expired or close to expiry, refresh immediately
      if (!isTokenExpired(token)) {
        performRefresh()
      }
      return
    }

    // Schedule refresh
    refreshTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        performRefresh()
      }
    }, refreshIn)
  }, [])

  const performRefresh = useCallback(async () => {
    try {
      const response = await refreshToken()
      
      if (response.success && response.data?.accessToken) {
        updateAccessToken(response.data.accessToken)
        // Reschedule next refresh
        scheduleRefresh(response.data.accessToken)
      } else {
        // Refresh failed, logout
        logout()
        window.location.href = '/login'
      }
    } catch (error) {
      // Refresh error, logout
      logout()
      window.location.href = '/login'
    }
  }, [updateAccessToken, logout, scheduleRefresh])

  useEffect(() => {
    isMountedRef.current = true
    
    // Only run when authenticated and we have a token
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
  }, [isAuthenticated, accessToken, scheduleRefresh])

  // Re-schedule when token changes
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      scheduleRefresh(accessToken)
    }
  }, [accessToken, isAuthenticated, scheduleRefresh])
}
```

- [ ] **Step 2: Export from hooks index**

Update `src/hooks/index.ts`:

```typescript
export { useTokenRefresh } from './useTokenRefresh'
```

- [ ] **Step 3: Write tests for the hook**

Create: `src/hooks/__tests__/useTokenRefresh.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTokenRefresh } from '../useTokenRefresh'
import * as authApi from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth'

// Mock the auth API
vi.mock('@/lib/api/auth', () => ({
  refreshToken: vi.fn(),
}))

// Mock the auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

describe('useTokenRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should not schedule refresh when not authenticated', () => {
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      accessToken: 'test-token',
      isAuthenticated: false,
      updateAccessToken: vi.fn(),
      logout: vi.fn(),
    })

    renderHook(() => useTokenRefresh())
    
    expect(authApi.refreshToken).not.toHaveBeenCalled()
  })

  it('should schedule refresh when authenticated with valid token', () => {
    // Create token that expires in 15 minutes
    const exp = Math.floor(Date.now() / 1000) + 15 * 60
    const token = `header.${btoa(JSON.stringify({ exp })).replace(/=/g, '')}.`
    
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      accessToken: token,
      isAuthenticated: true,
      updateAccessToken: vi.fn(),
      logout: vi.fn(),
    })

    ;(authApi.refreshToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { accessToken: 'new-token' },
    })

    renderHook(() => useTokenRefresh())

    // Should not refresh immediately
    expect(authApi.refreshToken).not.toHaveBeenCalled()

    // Advance time by 12 minutes (should refresh 3 min before 15 min expiry)
    vi.advanceTimersByTime(12 * 60 * 1000)
    
    expect(authApi.refreshToken).toHaveBeenCalledTimes(1)
  })

  it('should logout on refresh failure', async () => {
    const logout = vi.fn()
    const exp = Math.floor(Date.now() / 1000) + 15 * 60
    const token = `header.${btoa(JSON.stringify({ exp })).replace(/=/g, '')}.`
    
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      accessToken: token,
      isAuthenticated: true,
      updateAccessToken: vi.fn(),
      logout,
    })

    ;(authApi.refreshToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Refresh failed',
    })

    renderHook(() => useTokenRefresh())
    
    vi.advanceTimersByTime(12 * 60 * 1000)
    
    // Wait for async operation
    await vi.runOnlyPendingTimersAsync()
    
    expect(logout).toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/hooks/__tests__/useTokenRefresh.test.ts
```
Expected: Tests pass

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTokenRefresh.ts src/hooks/index.ts src/hooks/__tests__/useTokenRefresh.test.ts
git commit -m "feat(auth): add useTokenRefresh hook for proactive token refresh"
```

---

## Phase 7: App Integration

### Task 7.1: Add TokenRefreshProvider to App

**Files:**
- Modify: `src/App.tsx:1-20`

**Purpose:** Initialize token refresh on app mount for authenticated users.

- [ ] **Step 1: Import the hook**

```typescript
import { useTokenRefresh } from '@/hooks/useTokenRefresh'
```

- [ ] **Step 2: Create TokenRefreshProvider component**

Add before AppContent:

```typescript
function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  useTokenRefresh()
  return <>{children}</>
}
```

- [ ] **Step 3: Wrap app content**

Wrap Routes with TokenRefreshProvider:

```typescript
function AppContent() {
  // ... existing code

  return (
    <TokenRefreshProvider>
      <Routes>
        {/* ... existing routes ... */}
      </Routes>
    </TokenRefreshProvider>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(auth): integrate token refresh provider in App"
```

---

## Phase 8: Integration & Verification

### Task 8.1: Run full test suite

- [ ] **Step 1: Run backend tests**

```bash
npm run test:server
```
Expected: All tests pass (including new auth tests)

- [ ] **Step 2: Run frontend tests**

```bash
npm test
```
Expected: All tests pass

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```
Expected: No TypeScript errors

- [ ] **Step 4: Build check**

```bash
npm run build
```
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(auth): verify all tests pass for token refresh feature"
```

---

## Phase 9: Manual Testing Checklist

Perform these manual tests in the browser:

- [ ] **Test 1: Login sets cookie**
1. Open browser dev tools → Network tab
2. Login with valid credentials
3. Verify Response Headers contain `Set-Cookie: refreshToken=...; HttpOnly`
4. Verify Response Body does NOT contain `refreshToken`

- [ ] **Test 2: Refresh token endpoint works**
1. Login
2. Wait 12+ minutes (or use dev tools to manually test)
3. Make an API call
4. Verify new access token is received

- [ ] **Test 3: 401 triggers refresh**
1. Login
2. Delete accessToken from localStorage (simulating expiration)
3. Make an API call
4. Verify the app refreshes token and retries the request

- [ ] **Test 4: Logout clears cookie**
1. Login
2. Logout
3. Check cookies - refreshToken should be cleared
4. Verify redirected to login page

- [ ] **Test 5: Concurrent requests during refresh**
1. Login
2. Delete accessToken from localStorage
3. Trigger multiple API calls simultaneously
4. Verify only ONE refresh request is made
5. Verify all original requests succeed after refresh

---

## Atomic Commit Strategy

| Commit | Scope | Description |
|--------|-------|-------------|
| 1 | deps | Add cookie-parser dependency |
| 2 | backend | Add cookie-parser middleware |
| 3 | backend | Add verifyRefreshToken to UserService |
| 4 | backend | Add refresh and logout endpoints |
| 5 | backend | Use httpOnly cookie for refresh token |
| 6 | frontend | Add JWT parsing utilities |
| 7 | frontend | Update auth API for cookies |
| 8 | frontend | Update auth store (memory-only tokens) |
| 9 | frontend | Add 401 interceptor with refresh queue |
| 10 | frontend | Add useTokenRefresh hook |
| 11 | frontend | Integrate token refresh in App |
| 12 | tests | Verification and integration tests |

---

## Parallel Execution Strategy

### Backend Track (Independent)
1. Install cookie-parser
2. Add middleware
3. Add verifyRefreshToken method
4. Add refresh/logout endpoints
5. Update login/register for cookies

### Frontend Track (Independent until API integration)
1. Create JWT utilities
2. Update auth API (prepare for cookies)
3. Update auth store
4. Create useTokenRefresh hook
5. Update API client interceptor
6. Integrate in App

### Integration Point
- Both tracks depend on the API contract:
  - `POST /auth/refresh` returns `{ success: true, data: { accessToken } }`
  - Cookie `refreshToken` is httpOnly
  - Login response no longer includes `refreshToken`

---

## Verification Checkpoints

| Checkpoint | Location | Validation |
|------------|----------|------------|
| CP1 | Backend tests | All auth tests pass |
| CP2 | Frontend tests | JWT utils + hook tests pass |
| CP3 | Integration | Login sets HttpOnly cookie |
| CP4 | Integration | 401 triggers refresh |
| CP5 | Integration | Logout clears cookie |
| CP6 | Security | refreshToken not in localStorage |
| CP7 | Build | No TypeScript errors, build succeeds |

---

## Files Modified/Created Summary

### Backend
| File | Action | Lines |
|------|--------|-------|
| `package.json` | Modify | Add cookie-parser dep |
| `server/index.ts` | Modify | +cookie-parser middleware |
| `server/services/user-service.ts` | Modify | +verifyRefreshToken method |
| `server/routes/auth.ts` | Modify | +refresh/logout endpoints, update login/register |
| `server/services/__tests__/user-service-token-refresh.test.ts` | Create | New tests |
| `server/routes/__tests__/auth-refresh.test.ts` | Create | New tests |

### Frontend
| File | Action | Lines |
|------|--------|-------|
| `src/lib/jwt.ts` | Create | JWT parsing utilities |
| `src/lib/__tests__/jwt.test.ts` | Create | Unit tests |
| `src/lib/api/auth.ts` | Modify | +refresh/logout, +withCredentials |
| `src/stores/auth.ts` | Modify | Remove refreshToken, add updateAccessToken |
| `src/lib/api/client.ts` | Modify | +401 interceptor with queue |
| `src/hooks/useTokenRefresh.ts` | Create | Proactive refresh hook |
| `src/hooks/index.ts` | Modify | Export new hook |
| `src/hooks/__tests__/useTokenRefresh.test.ts` | Create | Hook tests |
| `src/App.tsx` | Modify | +TokenRefreshProvider |
| `src/pages/Login.tsx` | Modify | Update login call signature |

---

## Rollback Plan

If issues arise:

1. **Immediate**: Revert to previous commit: `git revert HEAD~N`
2. **Frontend only**: Remove TokenRefreshProvider from App.tsx
3. **Backend only**: Revert auth.ts changes, keep cookie-parser (no harm)
4. **Full rollback**: Checkout pre-feature branch

**Backup strategy**: Create feature branch before starting:
```bash
git checkout -b feature/token-refresh
git push -u origin feature/token-refresh
```

---

Plan complete. Ready for implementation via subagent-driven-development or inline execution.
