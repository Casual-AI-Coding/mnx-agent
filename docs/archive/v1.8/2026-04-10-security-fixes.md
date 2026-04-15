# Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix P0, P1, and P2 security vulnerabilities identified in the mnx-agent v1.7.3 code review. Skip large architectural refactors (god objects).

**Architecture:** Atomic commits per logical fix group, TDD approach with failing tests first, parallel execution where possible, dependency-ordered sequential execution where required.

**Tech Stack:** Node.js, Express, TypeScript, better-sqlite3, React, JWT

---

## Summary of Fixes

| Priority | Issue | File(s) | Fix Strategy |
|----------|-------|---------|--------------|
| **P0** | Committed secrets in .env | `.env`, `.env.example`, `.gitignore` | Create .env.example, rotate secrets |
| **P0** | Invitation code race condition | `server/services/user-service.ts` | Atomic transaction with SELECT FOR UPDATE |
| **P0** | Capacity tracking race condition | `server/repositories/capacity-repository.ts` | Single atomic UPDATE with WHERE |
| **P1** | IDOR in updateRunStats | `server/repositories/job-repository.ts` | Add owner_id to WHERE clause |
| **P1** | Query param token leakage | `server/middleware/auth-middleware.ts` | Remove query param support |
| **P2** | Hardcoded JWT fallback | `server/config/index.ts` | Fail-fast validation at startup |
| **P2** | Swallowed file deletion errors | `server/routes/media.ts` | Log errors properly |
| **P2** | Swallowed parsing errors | `server/services/notification-service.ts` | Log warning with context |
| **P2** | Misleading security claim | `src/i18n/locales/en.json` | Update text |
| **P2** | JWT_SECRET dual purpose | `server/lib/media-token.ts` | Use MEDIA_TOKEN_SECRET |

---

## Dependency Graph

```
Phase 1 (Independent - can parallelize):
├── Task 1.1: .env → .env.example (no deps)
├── Task 1.2: JWT fallback fail-fast (no deps)
└── Task 1.3: MEDIA_TOKEN_SECRET env var (no deps)

Phase 2 (Independent - can parallelize):
├── Task 2.1: Capacity atomic UPDATE (no deps)
├── Task 2.2: Invitation code transaction (no deps)
└── Task 2.3: Job stats owner_id fix (no deps)

Phase 3 (Independent - can parallelize):
├── Task 3.1: Remove query param tokens (no deps)
└── Task 3.2: Error handling improvements (no deps)

Phase 4 (Final cleanup):
└── Task 4.1: Update i18n security text (no deps)
```

---

## Phase 1: Environment Security

### Task 1.1: Create .env.example and Clean .env

**Files:**
- Create: `.env.example`
- Modify: `.gitignore` (verify .env is ignored)
- Note: `.env` contains REAL SECRETS that must be rotated after this fix

**Prerequisites:**
- [ ] Verify current `.env` contents
- [ ] Check `.gitignore` for `.env` entry

**Steps:**

- [ ] **Step 1.1.1: Read current .env structure**

```bash
head -50 /home/ogslp/Projects/Opencode/mnx-agent/.env
```

Expected: See environment variables structure with real values

- [ ] **Step 1.1.2: Create .env.example with placeholders**

Create `.env.example`:

```bash
# ============================================
# MiniMax AI API Configuration
# ============================================
# Get your API key from: https://www.minimaxi.com/
MINIMAX_API_KEY=your_minimax_api_key_here

# Region: 'domestic' (China) or 'international'
MINIMAX_REGION=international

# ============================================
# Database Configuration (PostgreSQL)
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mnx_agent
DB_USER=mnx_agent_user
DB_PASSWORD=your_secure_db_password_here

# ============================================
# Authentication & Security
# ============================================
# JWT_SECRET: Must be at least 32 characters, cryptographically random
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=your_jwt_secret_min_32_chars_here

# MEDIA_TOKEN_SECRET: Separate secret for media access tokens
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
MEDIA_TOKEN_SECRET=your_media_token_secret_min_32_chars_here

# ============================================
# Server Configuration
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# Test Account (Optional - for development only)
# ============================================
TEST_USERNAME=testuser
TEST_PASSWORD=testpass123
```

- [ ] **Step 1.1.3: Verify .gitignore has .env**

```bash
grep -E "^\.env" /home/ogslp/Projects/Opencode/mnx-agent/.gitignore
```

Expected: `.env` or `.env*` is listed

- [ ] **Step 1.1.4: Write test for config validation**

Create `server/config/__tests__/config-validation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Config Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('should throw error when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET
    
    await expect(import('../index')).rejects.toThrow('JWT_SECRET')
  })

  it('should throw error when JWT_SECRET is too short', async () => {
    process.env.JWT_SECRET = 'short'
    
    await expect(import('../index')).rejects.toThrow('JWT_SECRET')
  })

  it('should throw error when MEDIA_TOKEN_SECRET is missing', async () => {
    delete process.env.MEDIA_TOKEN_SECRET
    
    await expect(import('../index')).rejects.toThrow('MEDIA_TOKEN_SECRET')
  })
})
```

- [ ] **Step 1.1.5: Run test to verify it fails**

```bash
npm test server/config/__tests__/config-validation.test.ts
```

Expected: FAIL - tests should fail because validation not yet implemented

- [ ] **Step 1.1.6: Commit .env.example**

```bash
git add .env.example
git commit -m "chore(security): add .env.example template

- Documents all required environment variables
- Provides secure placeholder values
- Includes instructions for generating secrets"
```

**⚠️ CRITICAL POST-DEPLOYMENT ACTION:** After deploying this fix, ALL secrets in `.env` must be rotated:
- Generate new JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- Generate new MEDIA_TOKEN_SECRET (see Task 1.3)
- Rotate MiniMax API key via MiniMax dashboard
- Change database password
- Re-issue all test credentials

---

### Task 1.2: JWT_SECRET Fail-Fast Validation

**Files:**
- Modify: `server/config/index.ts:128`
- Test: `server/config/__tests__/config-validation.test.ts` (from Task 1.1)

**Prerequisites:** Task 1.1.4 (test created)

**Steps:**

- [ ] **Step 1.2.1: Read current config/index.ts**

```bash
sed -n '120,135p' /home/ogslp/Projects/Opencode/mnx-agent/server/config/index.ts
```

- [ ] **Step 2.2.2: Add validation function**

Add to `server/config/index.ts` before config export:

```typescript
function validateConfig(): void {
  const jwtSecret = process.env.JWT_SECRET
  
  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
  
  if (jwtSecret.length < 32) {
    throw new Error(
      `JWT_SECRET must be at least 32 characters (got ${jwtSecret.length}). ` +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
  
  // Warn about weak development fallback
  if (jwtSecret === 'dev-secret-change-in-production') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET. This is insecure for production!')
  }
}

// Run validation at startup
validateConfig()
```

- [ ] **Step 1.2.3: Update config object**

Change line 128 from:
```typescript
jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
```

To:
```typescript
jwtSecret: process.env.JWT_SECRET!,
```

- [ ] **Step 1.2.4: Run tests to verify**

```bash
npm test server/config/__tests__/config-validation.test.ts
```

Expected: PASS

- [ ] **Step 1.2.5: Run build to verify TypeScript**

```bash
npm run build:server
```

Expected: No errors

- [ ] **Step 1.2.6: Commit**

```bash
git add server/config/index.ts server/config/__tests__/config-validation.test.ts
git commit -m "fix(security): JWT_SECRET fail-fast validation

- Throws error at startup if JWT_SECRET is missing
- Validates minimum length (32 chars)
- Removes hardcoded fallback secret
- Prevents deployment with weak default secret"
```

---

### Task 1.3: MEDIA_TOKEN_SECRET Environment Variable

**Files:**
- Modify: `server/lib/media-token.ts`
- Modify: `server/config/index.ts` (add to config)
- Test: Create `server/lib/__tests__/media-token.test.ts`

**Prerequisites:** Task 1.2 (config validation pattern established)

**Steps:**

- [ ] **Step 1.3.1: Read current media-token.ts**

```bash
cat /home/ogslp/Projects/Opencode/mnx-agent/server/lib/media-token.ts
```

- [ ] **Step 1.3.2: Write failing test**

Create `server/lib/__tests__/media-token.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Media Token Secret', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('should use MEDIA_TOKEN_SECRET instead of JWT_SECRET', async () => {
    process.env.MEDIA_TOKEN_SECRET = 'media-secret-32-chars-long-min'
    process.env.JWT_SECRET = 'jwt-secret-32-chars-long-min'
    
    const { getMediaTokenSecret } = await import('../media-token')
    const secret = getMediaTokenSecret()
    
    expect(secret).toBe('media-secret-32-chars-long-min')
    expect(secret).not.toBe('jwt-secret-32-chars-long-min')
  })

  it('should throw if MEDIA_TOKEN_SECRET is missing', async () => {
    delete process.env.MEDIA_TOKEN_SECRET
    process.env.JWT_SECRET = 'jwt-secret-32-chars-long-min'
    
    await expect(import('../media-token')).rejects.toThrow('MEDIA_TOKEN_SECRET')
  })
})
```

- [ ] **Step 1.3.3: Run test to verify it fails**

```bash
npm test server/lib/__tests__/media-token.test.ts
```

Expected: FAIL

- [ ] **Step 1.3.4: Modify media-token.ts to use MEDIA_TOKEN_SECRET**

Replace entire content of `server/lib/media-token.ts`:

```typescript
import logger from './logger.js'

/**
 * Get the secret used for signing media access tokens.
 * Media tokens use a separate secret from JWT auth tokens for security isolation.
 */
export function getMediaTokenSecret(): string {
  const secret = process.env.MEDIA_TOKEN_SECRET
  
  if (!secret) {
    throw new Error(
      'MEDIA_TOKEN_SECRET environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
  
  if (secret.length < 32) {
    throw new Error(
      `MEDIA_TOKEN_SECRET must be at least 32 characters (got ${secret.length})`
    )
  }
  
  return secret
}

/**
 * Validates that MEDIA_TOKEN_SECRET is properly configured.
 * Called at application startup.
 */
export function validateMediaTokenConfig(): void {
  // This will throw if invalid
  getMediaTokenSecret()
  logger.debug('Media token configuration validated')
}
```

- [ ] **Step 1.3.5: Add MEDIA_TOKEN_SECRET to config validation**

Add to `server/config/index.ts` in the `validateConfig()` function:

```typescript
function validateConfig(): void {
  // ... existing JWT_SECRET validation ...
  
  // Validate MEDIA_TOKEN_SECRET
  const mediaTokenSecret = process.env.MEDIA_TOKEN_SECRET
  if (!mediaTokenSecret) {
    throw new Error(
      'MEDIA_TOKEN_SECRET environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
  
  if (mediaTokenSecret.length < 32) {
    throw new Error(
      `MEDIA_TOKEN_SECRET must be at least 32 characters (got ${mediaTokenSecret.length})`
    )
  }
}
```

- [ ] **Step 1.3.6: Add MEDIA_TOKEN_SECRET to config object**

In `server/config/index.ts` config export:

```typescript
export const config = {
  // ... existing config ...
  jwtSecret: process.env.JWT_SECRET!,
  mediaTokenSecret: process.env.MEDIA_TOKEN_SECRET!,
  // ... rest of config ...
}
```

- [ ] **Step 1.3.7: Run tests to verify**

```bash
npm test server/lib/__tests__/media-token.test.ts
npm test server/config/__tests__/config-validation.test.ts
```

Expected: PASS

- [ ] **Step 1.3.8: Run build**

```bash
npm run build:server
```

Expected: No errors

- [ ] **Step 1.3.9: Commit**

```bash
git add server/lib/media-token.ts server/lib/__tests__/media-token.test.ts server/config/index.ts
git commit -m "fix(security): separate MEDIA_TOKEN_SECRET from JWT_SECRET

- Media tokens now use dedicated MEDIA_TOKEN_SECRET env var
- Prevents token confusion and enables independent rotation
- Adds validation for minimum 32 character length
- Includes startup validation in config"
```

---

## Phase 2: Database Race Conditions

### Task 2.1: Capacity Tracking Atomic Update

**Files:**
- Modify: `server/repositories/capacity-repository.ts:72-82`
- Test: Create `server/repositories/__tests__/capacity-repository.test.ts`

**Prerequisites:** None (independent task)

**Steps:**

- [ ] **Step 2.1.1: Read current capacity-repository.ts**

```bash
sed -n '60,90p' /home/ogslp/Projects/Opencode/mnx-agent/server/repositories/capacity-repository.ts
```

- [ ] **Step 2.1.2: Write failing test for race condition**

Create `server/repositories/__tests__/capacity-repository.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DatabaseConnection } from '../../database/connection.js'
import { CapacityRepository } from '../capacity-repository.js'

describe('CapacityRepository', () => {
  let db: DatabaseConnection
  let repo: CapacityRepository

  beforeEach(() => {
    // Setup in-memory test database
    db = new DatabaseConnection(':memory:')
    db.exec(`
      CREATE TABLE capacity_tracking (
        id INTEGER PRIMARY KEY,
        service_type TEXT UNIQUE NOT NULL,
        remaining_quota INTEGER NOT NULL,
        total_quota INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Insert test data
    db.prepare(`
      INSERT INTO capacity_tracking (service_type, remaining_quota, total_quota)
      VALUES ('text_generation', 100, 100)
    `).run()
    
    repo = new CapacityRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  it('should atomically decrement capacity with single UPDATE', () => {
    // Simulate concurrent decrements
    const promises = Array(10).fill(null).map(() => 
      repo.decrementCapacity('text_generation', 5)
    )
    
    // All should succeed since we have 100 quota
    return expect(Promise.all(promises)).resolves.toHaveLength(10)
  })

  it('should not allow capacity to go below zero', async () => {
    // Try to decrement more than available
    const result = await repo.decrementCapacity('text_generation', 150)
    
    // Should fail gracefully
    expect(result.success).toBe(false)
    
    // Capacity should remain unchanged
    const row = db.prepare('SELECT remaining_quota FROM capacity_tracking WHERE service_type = ?')
      .get('text_generation') as { remaining_quota: number }
    expect(row.remaining_quota).toBe(100)
  })

  it('should handle concurrent decrements without overspending', async () => {
    // Start with 50 quota
    db.prepare('UPDATE capacity_tracking SET remaining_quota = 50').run()
    
    // Simulate 20 concurrent requests for 10 units each (total 200 requested)
    const results = await Promise.all(
      Array(20).fill(null).map(() => 
        repo.decrementCapacity('text_generation', 10)
          .then(r => r.success)
          .catch(() => false)
      )
    )
    
    // Only 5 should succeed (50 / 10 = 5)
    const successCount = results.filter(Boolean).length
    expect(successCount).toBe(5)
    
    // Verify final capacity is 0
    const row = db.prepare('SELECT remaining_quota FROM capacity_tracking WHERE service_type = ?')
      .get('text_generation') as { remaining_quota: number }
    expect(row.remaining_quota).toBe(0)
  })
})
```

- [ ] **Step 2.1.3: Run test to verify it fails**

```bash
npm test server/repositories/__tests__/capacity-repository.test.ts
```

Expected: FAIL - current implementation has race condition

- [ ] **Step 2.1.4: Implement atomic decrementCapacity**

Replace the `decrementCapacity` method in `server/repositories/capacity-repository.ts`:

```typescript
/**
 * Atomically decrement capacity for a service type.
 * Uses single UPDATE with WHERE clause to prevent race conditions.
 * 
 * @param serviceType - The service type to decrement
 * @param amount - Amount to decrement
 * @returns Object indicating success and remaining quota
 */
async decrementCapacity(
  serviceType: string, 
  amount: number
): Promise<{ success: boolean; remaining: number; message?: string }> {
  if (amount <= 0) {
    return { success: false, remaining: 0, message: 'Amount must be positive' }
  }

  try {
    // Single atomic UPDATE - no read-modify-write race condition
    const result = this.db.prepare(`
      UPDATE capacity_tracking 
      SET remaining_quota = remaining_quota - @amount,
          updated_at = CURRENT_TIMESTAMP
      WHERE service_type = @serviceType 
        AND remaining_quota >= @amount
      RETURNING remaining_quota
    `).get({ serviceType, amount }) as { remaining_quota: number } | undefined

    if (!result) {
      // UPDATE didn't match - either service not found or insufficient quota
      const current = this.db.prepare(
        'SELECT remaining_quota FROM capacity_tracking WHERE service_type = ?'
      ).get(serviceType) as { remaining_quota: number } | undefined
      
      if (!current) {
        return { success: false, remaining: 0, message: 'Service type not found' }
      }
      
      return { 
        success: false, 
        remaining: current.remaining_quota,
        message: `Insufficient capacity. Requested: ${amount}, Available: ${current.remaining_quota}`
      }
    }

    return { 
      success: true, 
      remaining: result.remaining_quota 
    }
  } catch (error) {
    logger.error({ error, serviceType, amount }, 'Failed to decrement capacity')
    throw error
  }
}
```

- [ ] **Step 2.1.5: Run tests to verify**

```bash
npm test server/repositories/__tests__/capacity-repository.test.ts
```

Expected: PASS

- [ ] **Step 2.1.6: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 2.1.7: Commit**

```bash
git add server/repositories/capacity-repository.ts server/repositories/__tests__/capacity-repository.test.ts
git commit -m "fix(security): atomic capacity tracking to prevent race conditions

- Replaces read-modify-write pattern with single atomic UPDATE
- Uses WHERE remaining_quota >= amount for conditional decrement
- Prevents concurrent API calls from exceeding capacity limits
- Returns clear error messages for insufficient quota"
```

---

### Task 2.2: Invitation Code Race Condition Fix

**Files:**
- Modify: `server/services/user-service.ts:52-78`
- Test: Create `server/services/__tests__/user-service-race.test.ts`

**Prerequisites:** None (independent task)

**Steps:**

- [ ] **Step 2.2.1: Read current user-service.ts registration logic**

```bash
sed -n '45,85p' /home/ogslp/Projects/Opencode/mnx-agent/server/services/user-service.ts
```

- [ ] **Step 2.2.2: Write failing test for race condition**

Create `server/services/__tests__/user-service-race.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DatabaseConnection } from '../../database/connection.js'
import { UserService } from '../user-service.js'

describe('UserService - Invitation Code Race Condition', () => {
  let db: DatabaseConnection
  let service: UserService

  beforeEach(() => {
    db = new DatabaseConnection(':memory:')
    
    // Create tables
    db.exec(`
      CREATE TABLE invitation_codes (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        max_uses INTEGER NOT NULL,
        used_count INTEGER DEFAULT 0,
        used_at DATETIME,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        invitation_code_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Insert invitation code with max_uses = 3
    db.prepare(`
      INSERT INTO invitation_codes (code, max_uses, used_count)
      VALUES ('TEST-CODE-123', 3, 0)
    `).run()
    
    service = new UserService(db)
  })

  afterEach(() => {
    db.close()
  })

  it('should not allow more registrations than max_uses', async () => {
    // Attempt 5 concurrent registrations with code limited to 3 uses
    const registrations = Array(5).fill(null).map((_, i) => 
      service.register({
        username: `user${i}`,
        password: 'password123',
        invitationCode: 'TEST-CODE-123'
      }).then(r => ({ success: true, result: r }))
        .catch(e => ({ success: false, error: e.message }))
    )
    
    const results = await Promise.all(registrations)
    
    // Exactly 3 should succeed
    const successCount = results.filter(r => r.success).length
    expect(successCount).toBe(3)
    
    // Exactly 2 should fail with invitation code error
    const failureCount = results.filter(r => !r.success).length
    expect(failureCount).toBe(2)
    
    // Verify used_count in database is exactly 3
    const code = db.prepare('SELECT used_count FROM invitation_codes WHERE code = ?')
      .get('TEST-CODE-123') as { used_count: number }
    expect(code.used_count).toBe(3)
  })

  it('should atomically increment used_count with registration', async () => {
    // Register one user
    await service.register({
      username: 'user1',
      password: 'password123',
      invitationCode: 'TEST-CODE-123'
    })
    
    // used_count should be 1
    const code = db.prepare('SELECT used_count FROM invitation_codes WHERE code = ?')
      .get('TEST-CODE-123') as { used_count: number }
    expect(code.used_count).toBe(1)
  })
})
```

- [ ] **Step 2.2.3: Run test to verify it fails**

```bash
npm test server/services/__tests__/user-service-race.test.ts
```

Expected: FAIL - race condition allows more registrations than max_uses

- [ ] **Step 2.2.4: Implement atomic invitation code validation**

Replace the invitation code validation logic in `server/services/user-service.ts`:

```typescript
/**
 * Validate and consume an invitation code atomically.
 * Uses a single UPDATE with WHERE to prevent race conditions.
 * 
 * @param code - The invitation code
 * @param db - Database connection
 * @returns The invitation code record if valid and consumed
 * @throws Error if code is invalid, expired, or exhausted
 */
private async consumeInvitationCode(
  code: string, 
  db: DatabaseConnection
): Promise<{ id: number; code: string }> {
  // Single atomic UPDATE - increments used_count only if under max_uses
  const result = db.prepare(`
    UPDATE invitation_codes
    SET used_count = used_count + 1,
        used_at = CASE 
          WHEN used_count + 1 >= max_uses THEN CURRENT_TIMESTAMP 
          ELSE used_at 
        END
    WHERE code = @code
      AND used_count < max_uses
      AND (used_at IS NULL OR used_count < max_uses)
    RETURNING id, code, max_uses, used_count
  `).get({ code }) as { id: number; code: string; max_uses: number; used_count: number } | undefined

  if (!result) {
    // Check why it failed
    const existing = db.prepare('SELECT * FROM invitation_codes WHERE code = ?').get(code)
    
    if (!existing) {
      throw new Error('Invalid invitation code')
    }
    
    const codeRecord = existing as { used_count: number; max_uses: number; used_at: string | null }
    
    if (codeRecord.used_count >= codeRecord.max_uses) {
      throw new Error('Invitation code has been fully used')
    }
    
    if (codeRecord.used_at) {
      throw new Error('Invitation code has expired')
    }
    
    throw new Error('Invitation code cannot be used')
  }

  return result
}
```

Then update the `register` method to use this new function:

```typescript
async register(data: RegisterData): Promise<User> {
  const { username, password, invitationCode } = data

  // Validate invitation code atomically
  const codeRecord = await this.consumeInvitationCode(invitationCode, this.db)

  // Check if username already exists
  const existingUser = this.db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existingUser) {
    // Rollback the invitation code increment
    this.db.prepare(`
      UPDATE invitation_codes 
      SET used_count = used_count - 1 
      WHERE id = ?
    `).run(codeRecord.id)
    
    throw new Error('Username already exists')
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Create user
  const result = this.db.prepare(`
    INSERT INTO users (username, password_hash, invitation_code_id, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `).run(username, passwordHash, codeRecord.id)

  logger.info({ userId: result.lastInsertRowid, username }, 'User registered successfully')

  return {
    id: Number(result.lastInsertRowid),
    username,
    role: 'user',
    createdAt: new Date()
  }
}
```

- [ ] **Step 2.2.5: Run tests to verify**

```bash
npm test server/services/__tests__/user-service-race.test.ts
```

Expected: PASS

- [ ] **Step 2.2.6: Run existing user service tests**

```bash
npm test server/services/__tests__/user-service.test.ts
```

Expected: PASS (existing functionality not broken)

- [ ] **Step 2.2.7: Commit**

```bash
git add server/services/user-service.ts server/services/__tests__/user-service-race.test.ts
git commit -m "fix(security): atomic invitation code validation

- Replaces separate validation + update with single atomic UPDATE
- Uses WHERE clause to enforce max_uses limit atomically
- Prevents concurrent registrations from exceeding code limits
- Rolls back code consumption if username already exists"
```

---

### Task 2.3: Job Stats owner_id Fix

**Files:**
- Modify: `server/repositories/job-repository.ts:218`
- Test: Create `server/repositories/__tests__/job-repository-security.test.ts`

**Prerequisites:** None (independent task)

**Steps:**

- [ ] **Step 2.3.1: Read current job-repository.ts updateRunStats**

```bash
sed -n '210,230p' /home/ogslp/Projects/Opencode/mnx-agent/server/repositories/job-repository.ts
```

- [ ] **Step 2.3.2: Read method signature to understand parameters**

```bash
sed -n '200,225p' /home/ogslp/Projects/Opencode/mnx-agent/server/repositories/job-repository.ts
```

- [ ] **Step 2.3.3: Write failing test for IDOR vulnerability**

Create `server/repositories/__tests__/job-repository-security.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseConnection } from '../../database/connection.js'
import { JobRepository } from '../job-repository.js'

describe('JobRepository Security', () => {
  let db: DatabaseConnection
  let repo: JobRepository

  beforeEach(() => {
    db = new DatabaseConnection(':memory:')
    
    // Create tables
    db.exec(`
      CREATE TABLE cron_jobs (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        last_run_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Insert test jobs for different owners
    db.prepare(`INSERT INTO cron_jobs (id, name, owner_id, status) VALUES (1, 'job1', 1, 'active')`).run()
    db.prepare(`INSERT INTO cron_jobs (id, name, owner_id, status) VALUES (2, 'job2', 2, 'active')`).run()
    db.prepare(`INSERT INTO cron_jobs (id, name, owner_id, status) VALUES (3, 'job3', 1, 'active')`).run()
    
    repo = new JobRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  it('should only update run stats for the specified owner', () => {
    // User 1 tries to update job 2 (which belongs to user 2)
    const result = repo.updateRunStats({
      jobId: 2,
      ownerId: 1,  // Wrong owner
      success: true
    })
    
    // Should not update any rows
    expect(result.changes).toBe(0)
    
    // Verify job 2 stats unchanged
    const job2 = db.prepare('SELECT success_count FROM cron_jobs WHERE id = 2').get() as { success_count: number }
    expect(job2.success_count).toBe(0)
  })

  it('should update stats when owner matches', () => {
    // User 1 updates their own job
    const result = repo.updateRunStats({
      jobId: 1,
      ownerId: 1,
      success: true
    })
    
    // Should update exactly one row
    expect(result.changes).toBe(1)
    
    // Verify stats updated
    const job1 = db.prepare('SELECT success_count FROM cron_jobs WHERE id = 1').get() as { success_count: number }
    expect(job1.success_count).toBe(1)
  })

  it('should update correct job when multiple jobs exist for owner', () => {
    // User 1 has jobs 1 and 3 - update job 3 specifically
    const result = repo.updateRunStats({
      jobId: 3,
      ownerId: 1,
      success: false
    })
    
    expect(result.changes).toBe(1)
    
    // Job 1 should be unchanged
    const job1 = db.prepare('SELECT failure_count FROM cron_jobs WHERE id = 1').get() as { failure_count: number }
    expect(job1.failure_count).toBe(0)
    
    // Job 3 should be updated
    const job3 = db.prepare('SELECT failure_count FROM cron_jobs WHERE id = 3').get() as { failure_count: number }
    expect(job3.failure_count).toBe(1)
  })
})
```

- [ ] **Step 2.3.4: Run test to verify it fails**

```bash
npm test server/repositories/__tests__/job-repository-security.test.ts
```

Expected: FAIL - current implementation doesn't check owner_id

- [ ] **Step 2.3.5: Fix updateRunStats to include owner_id**

Modify `server/repositories/job-repository.ts`:

```typescript
/**
 * Update run statistics for a job.
 * Requires owner_id to prevent IDOR vulnerabilities.
 * 
 * @param params - Update parameters including ownerId for authorization
 * @returns RunResult with number of changes
 */
updateRunStats(params: {
  jobId: number
  ownerId: number
  success: boolean
  errorMessage?: string
}): RunResult {
  const { jobId, ownerId, success, errorMessage } = params

  try {
    const result = this.db.transaction(() => {
      // Atomic update with owner_id check prevents IDOR
      const updateResult = this.db.prepare(`
        UPDATE cron_jobs 
        SET ${success ? 'success_count = success_count + 1' : 'failure_count = failure_count + 1'},
            last_run_at = CURRENT_TIMESTAMP,
            last_error = CASE WHEN @errorMessage IS NOT NULL THEN @errorMessage ELSE last_error END
        WHERE id = @jobId 
          AND owner_id = @ownerId
      `).run({ jobId, ownerId, errorMessage: errorMessage || null })

      // Also update execution_logs if needed
      // ... existing log update logic ...

      return updateResult
    })()

    if (result.changes === 0) {
      logger.warn({ jobId, ownerId }, 'Attempted to update job stats without permission or job not found')
    }

    return { 
      success: result.changes > 0, 
      changes: result.changes 
    }
  } catch (error) {
    logger.error({ error, jobId, ownerId }, 'Failed to update job run stats')
    return { success: false, error: String(error) }
  }
}
```

- [ ] **Step 2.3.6: Update callers to pass ownerId**

Find and update all callers of `updateRunStats`. Search for usage:

```bash
grep -rn "updateRunStats" /home/ogslp/Projects/Opencode/mnx-agent/server --include="*.ts" | grep -v ".test.ts"
```

For each caller, ensure `ownerId` is passed. Example update:

```typescript
// Before
await jobRepository.updateRunStats({
  jobId: job.id,
  success: true
})

// After
await jobRepository.updateRunStats({
  jobId: job.id,
  ownerId: job.owner_id,
  success: true
})
```

- [ ] **Step 2.3.7: Run tests to verify**

```bash
npm test server/repositories/__tests__/job-repository-security.test.ts
```

Expected: PASS

- [ ] **Step 2.3.8: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 2.3.9: Commit**

```bash
git add server/repositories/job-repository.ts server/repositories/__tests__/job-repository-security.test.ts
git commit -m "fix(security): prevent IDOR in job stats updates

- Adds owner_id check to updateRunStats WHERE clause
- Prevents users from updating other users' job statistics
- Returns 0 changes if owner doesn't match
- Logs warning for unauthorized update attempts"
```

---

## Phase 3: Security Middleware & Token Handling

### Task 3.1: Remove Query Parameter Token Support

**Files:**
- Modify: `server/middleware/auth-middleware.ts:7,11`
- Test: Create `server/middleware/__tests__/auth-middleware.test.ts`

**Prerequisites:** None (independent task)

**Steps:**

- [ ] **Step 3.1.1: Read current auth-middleware.ts**

```bash
sed -n '1,30p' /home/ogslp/Projects/Opencode/mnx-agent/server/middleware/auth-middleware.ts
```

- [ ] **Step 3.1.2: Write failing test**

Create `server/middleware/__tests__/auth-middleware.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { authenticateToken } from '../auth-middleware.js'

describe('Auth Middleware', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    req = {
      headers: {},
      query: {}
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
    next = vi.fn()
  })

  it('should reject token in query parameter', () => {
    req.query = { token: 'valid-jwt-token' }
    req.headers = {}

    authenticateToken(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Authorization header')
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should accept token in Authorization header', () => {
    req.headers = { authorization: 'Bearer valid-jwt-token' }
    req.query = {}

    authenticateToken(req as Request, res as Response, next)

    // Should not return 401 (actual validation happens after extraction)
    expect(res.status).not.toHaveBeenCalledWith(401)
  })

  it('should reject request without any token', () => {
    req.headers = {}
    req.query = {}

    authenticateToken(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3.1.3: Run test to verify it fails**

```bash
npm test server/middleware/__tests__/auth-middleware.test.ts
```

Expected: FAIL - current implementation accepts query param tokens

- [ ] **Step 3.1.4: Remove query param token support**

Modify `server/middleware/auth-middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import logger from '../lib/logger.js'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number
    username: string
    role: string
  }
}

/**
 * Middleware to authenticate JWT tokens from Authorization header.
 * Explicitly rejects tokens in query parameters to prevent leakage via logs.
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Only accept tokens from Authorization header (RFC 6750)
  // Query parameter tokens are rejected to prevent leakage in:
  // - Server access logs
  // - Browser history
  // - Referer headers
  // - CDN logs
  
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    logger.debug({ path: req.path }, 'Authentication failed: missing or invalid Authorization header')
    res.status(401).json({ 
      error: 'Access token required in Authorization header (Bearer scheme)' 
    })
    return
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: number
      username: string
      role: string
    }

    req.user = decoded
    next()
  } catch (error) {
    logger.warn({ error: String(error), path: req.path }, 'Invalid JWT token')
    res.status(403).json({ error: 'Invalid or expired token' })
  }
}
```

- [ ] **Step 3.1.5: Run tests to verify**

```bash
npm test server/middleware/__tests__/auth-middleware.test.ts
```

Expected: PASS

- [ ] **Step 3.1.6: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 3.1.7: Commit**

```bash
git add server/middleware/auth-middleware.ts server/middleware/__tests__/auth-middleware.test.ts
git commit -m "fix(security): remove query parameter token support

- Tokens must now be provided in Authorization header only
- Prevents token leakage via server logs, browser history, Referer headers
- Complies with RFC 6750 security recommendations
- Returns clear error message directing users to use Bearer scheme"
```

---

## Phase 4: Error Handling Improvements

### Task 4.1: Fix Swallowed Error Patterns

**Files:**
- Modify: `server/routes/media.ts:92,110`
- Modify: `server/services/notification-service.ts:96`
- Modify: `src/i18n/locales/en.json:296`

**Prerequisites:** None (independent tasks, can parallelize)

**Steps for media.ts:**

- [ ] **Step 4.1.1: Read current error swallowing code**

```bash
sed -n '85,115p' /home/ogslp/Projects/Opencode/mnx-agent/server/routes/media.ts
```

- [ ] **Step 4.1.2: Fix file deletion error handling**

Replace the `.catch(() => {})` patterns:

```typescript
// Line 92 - Batch delete
await Promise.all(
  records.map(r => 
    deleteMediaFile(r.filepath)
      .catch(error => {
        logger.error(
          { error, filepath: r.filepath, recordId: r.id },
          'Failed to delete media file during batch cleanup'
        )
        // Don't throw - continue with other deletions
        // But track for potential admin notification
      })
  )
)

// Line 110 - Single delete
try {
  await deleteMediaFile(record.filepath)
} catch (error) {
  logger.error(
    { filepath: record.filepath, recordId: record.id },
    'Failed to delete media file during record deletion'
  )
  // Continue with database deletion even if file deletion fails
  // The file may already be deleted or be an orphan
}
```

**Steps for notification-service.ts:**

- [ ] **Step 4.1.3: Read current parsing error handling**

```bash
sed -n '90,105p' /home/ogslp/Projects/Opencode/mnx-agent/server/services/notification-service.ts
```

- [ ] **Step 4.1.4: Fix parsing error handling**

Replace the `.catch(() => null)` pattern:

```typescript
// Before
responseBody = await response.text().catch(() => null)

// After
let responseBody: string | null = null
try {
  responseBody = await response.text()
} catch (error) {
  logger.warn(
    { error, webhookId, status: response.status },
    'Failed to read webhook response body'
  )
  responseBody = null
}
```

**Steps for en.json:**

- [ ] **Step 4.1.5: Fix misleading security claim**

```bash
sed -n '290,300p' /home/ogslp/Projects/Opencode/mnx-agent/src/i18n/locales/en.json
```

- [ ] **Step 4.1.6: Update the misleading text**

Change from:
```json
"apiKeyHint": "Your API Key will be securely stored in your local browser"
```

To:
```json
"apiKeyHint": "Your API Key is stored locally in your browser. Keep your browser secure and do not share your device."
```

- [ ] **Step 4.1.7: Run build and tests**

```bash
npm run build
npm test
```

Expected: All pass

- [ ] **Step 4.1.8: Commit**

```bash
git add server/routes/media.ts server/services/notification-service.ts src/i18n/locales/en.json
git commit -m "fix(logging): properly log errors instead of swallowing

- Media file deletion errors now logged with context
- Webhook response parsing failures logged as warnings
- Updates misleading 'securely stored' text in i18n
- Errors no longer silently ignored - all tracked in logs"
```

---

## Verification & Final Steps

### Pre-Commit Verification Checklist

- [ ] All new tests pass
- [ ] All existing tests pass
- [ ] TypeScript compilation succeeds
- [ ] No linting errors
- [ ] Secrets rotated (post-deployment)

### Commands to Run

```bash
# Run all tests
npm test

# Build both frontend and backend
npm run build

# Check for TypeScript errors
npx tsc --noEmit -p server/tsconfig.json
npx tsc --noEmit -p tsconfig.json

# Check linting
npm run lint

# Check git status
git status
```

### Post-Deployment Actions (CRITICAL)

After deploying these fixes:

1. **Rotate ALL secrets immediately:**
   ```bash
   # Generate new JWT_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   
   # Generate new MEDIA_TOKEN_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Update .env with new secrets**

3. **Rotate MiniMax API key** via MiniMax dashboard

4. **Change database password**

5. **Re-issue any test credentials**

6. **Force re-login all users** (tokens signed with old JWT_SECRET will be invalid)

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-04-10-security-fixes.md`**

Two execution options:

### Option 1: Subagent-Driven (Recommended for Speed)

Use `superpowers:subagent-driven-development` - I dispatch a fresh subagent per task:
- Each phase can run in parallel
- Two-stage review after each task
- Best for complex, independent tasks

### Option 2: Inline Execution with Checkpoints

Use `superpowers:executing-plans` - Execute tasks in this session:
- Batch execution with checkpoint reviews
- I handle all tasks sequentially
- Better for tight integration

**Which approach would you prefer?**

Also, please confirm:
1. Are you okay with the secret rotation requirement post-deployment?
2. Should I proceed with creating a git worktree for isolation?
3. Any specific tests or files you want me to double-check before starting?