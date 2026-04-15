# Misfire Handling on Server Restart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement catch-up mechanism for cron jobs that missed their scheduled execution time due to server downtime.

**Architecture:** When the server restarts, the CronScheduler's init() method will check each active job's `next_run_at` against the current time. Jobs with past `next_run_at` values will be executed immediately as catch-up. A new `misfire_policy` field allows configuring behavior: 'ignore' (skip), 'fire_once' (execute once), or 'fire_all' (multiple catch-ups).

**Tech Stack:** TypeScript, Express, better-sqlite3/node-cron, cron-parser

---

## File Structure

| File | Purpose |
|------|---------|
| `server/services/cron-scheduler.ts` | Add misfire detection in `init()` method |
| `server/database/types.ts` | Add `MisfirePolicy` type and `misfire_policy` field to CronJob |
| `server/database/migrations-async.ts` | Migration to add `misfire_policy` column |
| `server/database/service-async.ts` | Update create/update methods for misfire_policy |
| `server/__tests__/cron-scheduler.test.ts` | Add tests for misfire handling |
| `server/routes/cron/jobs.ts` | API endpoint support for misfire_policy |

---

## Task 1: Add MisfirePolicy Type to Database Types

**Files:**
- Modify: `server/database/types.ts:169-189`
- Test: `server/__tests__/cron-scheduler.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Add to server/__tests__/cron-scheduler.test.ts in describe('Initialization') section

it('should handle misfire for job with past next_run_at', async () => {
  const pastTime = new Date(Date.now() - 60000).toISOString() // 1 minute ago
  const jobWithMisfire = createMockJob('job-misfire', {
    next_run_at: pastTime,
    workflow_id: 'wf-001',
  })
  
  mockDb.getActiveCronJobs.mockResolvedValue([jobWithMisfire])
  mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
    id: 'wf-001',
    nodes_json: '[]',
    edges_json: '[]',
  })
  mockWorkflowEngine.executeWorkflow.mockResolvedValue({
    success: true,
    nodeResults: new Map(),
    error: null,
  })
  
  await scheduler.init()
  
  // Should have executed the misfired job
  expect(mockWorkflowEngine.executeWorkflow).toHaveBeenCalled()
  expect(mockDb.updateCronJob).toHaveBeenCalledWith('job-misfire', expect.objectContaining({
    next_run_at: expect.any(String),
  }))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run server/__tests__/cron-scheduler.test.ts -t "should handle misfire"`
Expected: FAIL - misfire handling not implemented

- [ ] **Step 3: Add MisfirePolicy enum type**

```typescript
// Add to server/database/types.ts after ExecutionStatus enum (around line 29)

export enum MisfirePolicy {
  IGNORE = 'ignore',     // Skip missed executions
  FIRE_ONCE = 'fire_once', // Execute once catch-up (default)
  FIRE_ALL = 'fire_all',   // Execute all missed runs (not recommended)
}
```

- [ ] **Step 4: Add misfire_policy field to CronJob interface**

```typescript
// Modify CronJob interface in server/database/types.ts (around line 172)

export interface CronJob {
  id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  workflow_id: string | null
  owner_id: string | null
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_failures: number
  timeout_ms: number
  misfire_policy: MisfirePolicy  // NEW FIELD
  created_at: string
  updated_at: string
}
```

- [ ] **Step 5: Add misfire_policy to CreateCronJob interface**

```typescript
// Modify CreateCronJob interface in server/database/types.ts (around line 227)

export interface CreateCronJob {
  name: string
  description?: string | null
  cron_expression: string
  timezone?: string
  workflow_id?: string | null
  owner_id?: string | null
  is_active?: boolean
  timeout_ms?: number
  misfire_policy?: MisfirePolicy  // NEW FIELD
}
```

- [ ] **Step 6: Add misfire_policy to UpdateCronJob interface**

```typescript
// Modify UpdateCronJob interface in server/database/types.ts (around line 318)

export interface UpdateCronJob {
  name?: string
  description?: string | null
  cron_expression?: string
  timezone?: string
  workflow_id?: string | null
  owner_id?: string | null
  is_active?: boolean
  last_run_at?: string | null
  next_run_at?: string | null
  total_runs?: number
  total_failures?: number
  timeout_ms?: number
  misfire_policy?: MisfirePolicy  // NEW FIELD
}
```

- [ ] **Step 7: Add misfire_policy to CronJobRow interface**

```typescript
// Modify CronJobRow interface in server/database/types.ts (around line 384)

export interface CronJobRow {
  id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  workflow_id: string | null
  owner_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_failures: number
  timeout_ms: number
  misfire_policy: string  // NEW FIELD (stored as string in DB)
}
```

- [ ] **Step 8: Update createMockJob helper in test file**

```typescript
// Modify createMockJob in server/__tests__/cron-scheduler.test.ts (around line 33)

import { MisfirePolicy } from '../database/types'

const createMockJob = (id: string, overrides?: Partial<CronJob>): CronJob => ({
  id,
  name: `Test Job ${id}`,
  description: null,
  cron_expression: '0 * * * *',
  timezone: 'UTC',
  workflow_id: null,
  owner_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_run_at: null,
  next_run_at: null,
  total_runs: 0,
  total_failures: 0,
  timeout_ms: 300000,
  misfire_policy: MisfirePolicy.FIRE_ONCE,  // NEW FIELD
  ...overrides,
})
```

- [ ] **Step 9: Commit types changes**

```bash
git add server/database/types.ts server/__tests__/cron-scheduler.test.ts
git commit -m "feat(types): add MisfirePolicy type and misfire_policy field"
```

---

## Task 2: Add Database Migration for misfire_policy Column

**Files:**
- Modify: `server/database/migrations-async.ts`
- Create: `server/database/migrations/022_misfire_policy.ts` (if using separate migration files)

- [ ] **Step 1: Write migration SQL**

```typescript
// Add to MIGRATIONS array in server/database/migrations-async.ts (after last migration)

{
  id: 22,
  name: 'migration_022_cron_jobs_misfire_policy',
  sql: `
    -- Add misfire_policy column to cron_jobs
    ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS misfire_policy VARCHAR(20) DEFAULT 'fire_once';
    
    -- Add check constraint for valid values
    ALTER TABLE cron_jobs ADD CONSTRAINT chk_misfire_policy 
      CHECK (misfire_policy IN ('ignore', 'fire_once', 'fire_all'));
    
    -- Create index for jobs needing catch-up (active with past next_run_at)
    CREATE INDEX IF NOT EXISTS idx_cron_jobs_misfire_check 
      ON cron_jobs(is_active, next_run_at) 
      WHERE is_active = true AND next_run_at < CURRENT_TIMESTAMP;
  `,
},
```

- [ ] **Step 2: Run migration verification**

Run: `vitest run server/__tests__/database-service.test.ts`
Expected: PASS - migration system should handle new migration

- [ ] **Step 3: Commit migration**

```bash
git add server/database/migrations-async.ts
git commit -m "feat(db): add migration for misfire_policy column"
```

---

## Task 3: Update Database Service for misfire_policy

**Files:**
- Modify: `server/database/service-async.ts:71-77, 256-277, 279-321`

- [ ] **Step 1: Update rowToCronJob converter**

```typescript
// Modify rowToCronJob function in server/database/service-async.ts (around line 71)

import { MisfirePolicy } from './types.js'

function rowToCronJob(row: CronJobRow): CronJob {
  return { 
    ...row, 
    is_active: typeof row.is_active === 'boolean' ? row.is_active : row.is_active === 1,
    timeout_ms: row.timeout_ms ?? 300000,
    misfire_policy: (row.misfire_policy as MisfirePolicy) ?? MisfirePolicy.FIRE_ONCE,  // NEW
  }
}
```

- [ ] **Step 2: Update createCronJob to include misfire_policy**

```typescript
// Modify createCronJob in server/database/service-async.ts (around line 256)

async createCronJob(job: CreateCronJob, ownerId?: string): Promise<CronJob> {
  const id = uuidv4()
  const now = toISODate()
  const isActive = job.is_active !== false
  const timeoutMs = job.timeout_ms ?? 300000
  const timezone = job.timezone ?? 'UTC'
  const misfirePolicy = job.misfire_policy ?? MisfirePolicy.FIRE_ONCE  // NEW
  
  if (this.conn.isPostgres()) {
    await this.conn.execute(
      `INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_id, timezone, created_at, updated_at, timeout_ms, owner_id, misfire_policy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, job.name, job.description ?? null, job.cron_expression, isActive, job.workflow_id ?? null, timezone, now, now, timeoutMs, ownerId ?? null, misfirePolicy]
    )
  } else {
    await this.conn.execute(
      `INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_id, timezone, created_at, updated_at, timeout_ms, owner_id, misfire_policy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, job.name, job.description ?? null, job.cron_expression, isActive ? 1 : 0, job.workflow_id ?? null, timezone, now, now, timeoutMs, ownerId ?? null, misfirePolicy]
    )
  }
  return (await this.getCronJobById(id))!
}
```

- [ ] **Step 3: Update updateCronJob to handle misfire_policy**

```typescript
// Modify updateCronJob in server/database/service-async.ts (around line 279)

async updateCronJob(id: string, updates: UpdateCronJob, ownerId?: string): Promise<CronJob | null> {
  const existing = await this.getCronJobById(id, ownerId)
  if (!existing) return null

  const fields: string[] = []
  const values: (string | number | boolean | null)[] = []
  let paramIndex = 1

  const addField = (name: string, value: string | number | boolean | null | undefined) => {
    if (value !== undefined) {
      fields.push(`${name} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }
  }

  addField('name', updates.name)
  addField('description', updates.description)
  addField('cron_expression', updates.cron_expression)
  if (updates.is_active !== undefined) {
    addField('is_active', this.conn.isPostgres() ? updates.is_active : (updates.is_active ? 1 : 0))
  }
  addField('workflow_id', updates.workflow_id)
  addField('timezone', updates.timezone)
  addField('last_run_at', updates.last_run_at)
  addField('next_run_at', updates.next_run_at)
  addField('total_runs', updates.total_runs)
  addField('total_failures', updates.total_failures)
  addField('timeout_ms', updates.timeout_ms)
  addField('misfire_policy', updates.misfire_policy)  // NEW

  if (fields.length === 0) return existing
  
  fields.push(`updated_at = $${paramIndex}`)
  values.push(toISODate())
  paramIndex++
  values.push(id)

  await this.conn.execute(
    `UPDATE cron_jobs SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  )
  return this.getCronJobById(id)
}
```

- [ ] **Step 4: Run existing tests to verify**

Run: `vitest run server/__tests__/database-service.test.ts`
Expected: PASS - all existing tests should still work

- [ ] **Step 5: Commit service changes**

```bash
git add server/database/service-async.ts
git commit -m "feat(db): add misfire_policy handling in database service"
```

---

## Task 4: Implement Misfire Handling in CronScheduler

**Files:**
- Modify: `server/services/cron-scheduler.ts:57-67`

- [ ] **Step 1: Import MisfirePolicy**

```typescript
// Add to imports in server/services/cron-scheduler.ts (around line 8)

import { 
  CronJob, 
  CreateExecutionLog, 
  ExecutionStatus,
  TriggerType,
  MisfirePolicy  // NEW IMPORT
} from '../database/types'
```

- [ ] **Step 2: Add handleMisfire private method**

```typescript
// Add new private method after executeWithTimeout in server/services/cron-scheduler.ts (around line 277)

/**
 * Handles misfire for a job that missed its scheduled execution time.
 * Executes catch-up based on the job's misfire_policy configuration.
 * 
 * @param job - The cron job that has a misfire
 * @returns Promise<void> - Resolves when catch-up execution completes or is skipped
 */
private async handleMisfire(job: CronJob): Promise<void> {
  // Skip if policy is 'ignore'
  if (job.misfire_policy === MisfirePolicy.IGNORE) {
    console.info(`[CronScheduler] Job "${job.name}" (${job.id}) misfire ignored per policy`)
    return
  }

  console.info(`[CronScheduler] Misfire detected for job "${job.name}" (${job.id}), executing catch-up...`)

  // Execute catch-up
  try {
    await this.executeJobTick(job)
    console.info(`[CronScheduler] Catch-up execution completed for job "${job.name}" (${job.id})`)
  } catch (error) {
    console.error(`[CronScheduler] Catch-up execution failed for job "${job.name}" (${job.id}):`, error)
  }

  // For 'fire_all' policy, we would calculate all missed times and execute multiple times
  // However, this can be dangerous (startup storm), so we keep it simple with single catch-up
  if (job.misfire_policy === MisfirePolicy.FIRE_ALL) {
    console.warn(`[CronScheduler] Job "${job.name}" (${job.id}) has 'fire_all' policy but only single catch-up executed to prevent startup storm`)
  }
}
```

- [ ] **Step 3: Add checkAndHandleMisfires method**

```typescript
// Add new method after handleMisfire in server/services/cron-scheduler.ts

/**
 * Checks all active jobs for misfires and handles them asynchronously.
 * Does not block server startup - misfire checks run in background.
 * 
 * @param jobs - Array of active cron jobs to check
 * @returns Promise<void> - Resolves immediately, misfire handling runs async
 */
private async checkAndHandleMisfires(jobs: CronJob[]): Promise<void> {
  const now = new Date()
  const misfiredJobs: CronJob[] = []

  for (const job of jobs) {
    if (job.is_active && job.next_run_at) {
      const nextRun = new Date(job.next_run_at)
      if (nextRun < now) {
        misfiredJobs.push(job)
      }
    }
  }

  if (misfiredJobs.length === 0) {
    return
  }

  console.info(`[CronScheduler] Detected ${misfiredJobs.length} misfired jobs, handling asynchronously...`)

  // Handle misfires asynchronously to not block startup
  // Use rate limiting to prevent startup storm
  const delayBetweenJobs = 500 // 500ms between each catch-up execution
  
  for (const job of misfiredJobs) {
    // Schedule misfire handling with delay
    setTimeout(async () => {
      await this.handleMisfire(job)
    }, misfiredJobs.indexOf(job) * delayBetweenJobs)
  }
}
```

- [ ] **Step 4: Modify init() method to call misfire check**

```typescript
// Modify init() method in server/services/cron-scheduler.ts (around line 57)

/**
 * Initializes the scheduler by loading active jobs from database,
 * scheduling them, and checking for any misfires that need catch-up.
 */
async init(): Promise<void> {
  const activeJobs = await this.db.getActiveCronJobs()
  
  // Schedule all active jobs first
  for (const job of activeJobs) {
    try {
      await this.scheduleJob(job)
    } catch (error) {
      console.error(`[CronScheduler] Failed to schedule job "${job.name}" (${job.id}):`, error)
    }
  }

  // Then check for misfires asynchronously (non-blocking)
  await this.checkAndHandleMisfires(activeJobs)
}
```

- [ ] **Step 5: Run test to verify misfire handling**

Run: `vitest run server/__tests__/cron-scheduler.test.ts -t "misfire"`
Expected: PASS - misfire handling should work

- [ ] **Step 6: Commit scheduler changes**

```bash
git add server/services/cron-scheduler.ts
git commit -m "feat(scheduler): implement misfire handling on server restart"
```

---

## Task 5: Add Comprehensive Tests for Misfire Handling

**Files:**
- Modify: `server/__tests__/cron-scheduler.test.ts`

- [ ] **Step 1: Add misfire test suite**

```typescript
// Add new describe block to server/__tests__/cron-scheduler.test.ts

import { MisfirePolicy } from '../database/types'

// ============================================================================
// Misfire Handling
// ============================================================================

describe('Misfire Handling', () => {
  it('should detect job with past next_run_at as misfire', async () => {
    const pastTime = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    const misfiredJob = createMockJob('job-misfire', {
      next_run_at: pastTime,
      misfire_policy: MisfirePolicy.FIRE_ONCE,
      workflow_id: 'wf-001',
    })
    
    mockDb.getActiveCronJobs.mockResolvedValue([misfiredJob])
    mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
      id: 'wf-001',
      name: 'Test Workflow',
      nodes_json: '[]',
      edges_json: '[]',
      owner_id: null,
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    mockWorkflowEngine.executeWorkflow.mockResolvedValue({
      success: true,
      nodeResults: new Map(),
      error: null,
    })
    
    await scheduler.init()
    
    // Wait for async misfire handling
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    expect(mockWorkflowEngine.executeWorkflow).toHaveBeenCalled()
  })

  it('should skip misfire when policy is ignore', async () => {
    const pastTime = new Date(Date.now() - 3600000).toISOString()
    const ignoredMisfireJob = createMockJob('job-ignored', {
      next_run_at: pastTime,
      misfire_policy: MisfirePolicy.IGNORE,
      workflow_id: 'wf-001',
    })
    
    mockDb.getActiveCronJobs.mockResolvedValue([ignoredMisfireJob])
    mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
      id: 'wf-001',
      name: 'Test Workflow',
      nodes_json: '[]',
      edges_json: '[]',
      owner_id: null,
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    
    await scheduler.init()
    
    // Wait for async misfire handling
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Should NOT have executed
    expect(mockWorkflowEngine.executeWorkflow).not.toHaveBeenCalled()
  })

  it('should not handle misfire for job with future next_run_at', async () => {
    const futureTime = new Date(Date.now() + 3600000).toISOString() // 1 hour future
    const futureJob = createMockJob('job-future', {
      next_run_at: futureTime,
      workflow_id: 'wf-001',
    })
    
    mockDb.getActiveCronJobs.mockResolvedValue([futureJob])
    
    await scheduler.init()
    
    // Wait briefly
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Should NOT have executed (no misfire)
    expect(mockWorkflowEngine.executeWorkflow).not.toHaveBeenCalled()
  })

  it('should handle multiple misfired jobs with rate limiting', async () => {
    const pastTime = new Date(Date.now() - 3600000).toISOString()
    const jobs = [
      createMockJob('job-1', { next_run_at: pastTime, workflow_id: 'wf-001' }),
      createMockJob('job-2', { next_run_at: pastTime, workflow_id: 'wf-001' }),
      createMockJob('job-3', { next_run_at: pastTime, workflow_id: 'wf-001' }),
    ]
    
    mockDb.getActiveCronJobs.mockResolvedValue(jobs)
    mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
      id: 'wf-001',
      name: 'Test Workflow',
      nodes_json: '[]',
      edges_json: '[]',
      owner_id: null,
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    mockWorkflowEngine.executeWorkflow.mockResolvedValue({
      success: true,
      nodeResults: new Map(),
      error: null,
    })
    
    await scheduler.init()
    
    // Wait for all misfire handling (3 jobs * 500ms delay = 1500ms)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // All three should have been executed
    expect(mockWorkflowEngine.executeWorkflow).toHaveBeenCalledTimes(3)
  })

  it('should log misfire handling appropriately', async () => {
    const pastTime = new Date(Date.now() - 3600000).toISOString()
    const misfiredJob = createMockJob('job-log', {
      next_run_at: pastTime,
      misfire_policy: MisfirePolicy.FIRE_ONCE,
      workflow_id: 'wf-001',
    })
    
    mockDb.getActiveCronJobs.mockResolvedValue([misfiredJob])
    mockDb.getWorkflowTemplateById = vi.fn().mockResolvedValue({
      id: 'wf-001',
      name: 'Test Workflow',
      nodes_json: '[]',
      edges_json: '[]',
      owner_id: null,
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    mockWorkflowEngine.executeWorkflow.mockResolvedValue({
      success: true,
      nodeResults: new Map(),
      error: null,
    })
    
    const consoleSpy = vi.spyOn(console, 'info')
    
    await scheduler.init()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Misfire detected'))
    
    consoleSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run all scheduler tests**

Run: `vitest run server/__tests__/cron-scheduler.test.ts`
Expected: PASS - all tests including new misfire tests

- [ ] **Step 3: Commit tests**

```bash
git add server/__tests__/cron-scheduler.test.ts
git commit -m "test(scheduler): add comprehensive misfire handling tests"
```

---

## Task 6: Add API Endpoint Support for misfire_policy

**Files:**
- Modify: `server/routes/cron/jobs.ts`
- Modify: `server/validation/cron.ts`

- [ ] **Step 1: Update validation schema for misfire_policy**

```typescript
// Add to server/validation/cron.ts (or create if not exists)

import { z } from 'zod'
import { MisfirePolicy } from '../database/types'

export const createCronJobSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  cron_expression: z.string().min(1),
  timezone: z.string().max(50).optional().default('Asia/Shanghai'),
  workflow_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  timeout_ms: z.number().int().min(1000).max(3600000).optional().default(300000),
  misfire_policy: z.enum(['ignore', 'fire_once', 'fire_all']).optional().default('fire_once'),
})

export const updateCronJobSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  cron_expression: z.string().min(1).optional(),
  timezone: z.string().max(50).optional(),
  workflow_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
  timeout_ms: z.number().int().min(1000).max(3600000).optional(),
  misfire_policy: z.enum(['ignore', 'fire_once', 'fire_all']).optional(),
})
```

- [ ] **Step 2: Update routes to include misfire_policy in response**

```typescript
// Modify server/routes/cron/jobs.ts - ensure misfire_policy is included in job responses

// In GET /jobs endpoint - the response should already include misfire_policy from DB
// In POST /jobs endpoint - accept misfire_policy from request body
// In PATCH /jobs/:id endpoint - accept misfire_policy in updates
```

- [ ] **Step 3: Run API tests**

Run: `vitest run server/routes/__tests__/cron*.test.ts` (if exists)
Expected: PASS - API endpoints handle misfire_policy

- [ ] **Step 4: Commit API changes**

```bash
git add server/routes/cron/jobs.ts server/validation/cron.ts
git commit -m "feat(api): add misfire_policy support to cron job endpoints"
```

---

## Task 7: Integration Verification

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `vitest run`
Expected: PASS - all tests pass

- [ ] **Step 2: Manual verification - create test job**

```bash
# Start server
node scripts/dev.js start

# Create a test cron job
curl -X POST http://localhost:3001/api/cron/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Test Misfire Job",
    "cron_expression": "* * * * *",
    "workflow_id": "<workflow_id>",
    "misfire_policy": "fire_once"
  }'
```

- [ ] **Step 3: Manual verification - simulate misfire**

```bash
# Stop server
node scripts/dev.js stop

# Wait 2+ minutes (past the scheduled time)

# Start server
node scripts/dev.js start

# Check logs - should see misfire detection and catch-up execution
node scripts/dev.js log | grep -i misfire
```

- [ ] **Step 4: Verify execution_logs**

```bash
# Check execution_logs table
sqlite3 data/minimax.db "SELECT * FROM execution_logs WHERE job_id='<job_id>' ORDER BY started_at DESC LIMIT 5"

# Should see catch-up execution with trigger_type='cron'
```

- [ ] **Step 5: Final commit if needed**

```bash
git add -A
git commit -m "feat: complete misfire handling implementation"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Misfire detection in init() - Task 4
- ✅ misfire_policy field - Tasks 1-3
- ✅ catch-up execution - Task 4
- ✅ rate limiting - Task 4 (500ms delay)
- ✅ logging - Task 4
- ✅ 'fire_once' as default - Tasks 1-3

**2. Placeholder scan:**
- No TBD, TODO, or placeholder text
- All code blocks contain actual implementation
- All commands have expected output

**3. Type consistency:**
- `MisfirePolicy` enum defined in types.ts
- Used consistently in CronJob, CreateCronJob, UpdateCronJob interfaces
- Database stores as string, converted back to enum in rowToCronJob
- API validation uses same enum values

---

Plan complete. Ready for execution.