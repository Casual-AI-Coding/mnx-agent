# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical and high-priority performance issues identified in the comprehensive audit across backend, database, API, frontend, and WebSocket layers.

**Architecture:** 
- Backend: Add caching, retry logic, batch operations, and query optimization
- Frontend: Add virtualization, memoization, and optimize render patterns
- Real-time: Add heartbeat, connection limits, and backpressure

**Tech Stack:** TypeScript, Express, React, Zustand, PostgreSQL/SQLite, WebSocket (ws)

---

## File Structure

### Backend (Modified)
- `server/database/service-async.ts` — Add pagination, batch queries, combined methods
- `server/database/migrations-async.ts` — Add missing indexes
- `server/routes/cron.ts` — Fix N+1 queries, batch operations
- `server/routes/workflows.ts` — Server-side filtering/pagination
- `server/lib/minimax.ts` — Add retry with exponential backoff, caching
- `server/services/task-executor.ts` — Optimized polling with backoff
- `server/services/capacity-checker.ts` — Balance caching
- `server/services/websocket-service.ts` — Heartbeat, connection limits, backpressure
- `server/services/notification-service.ts` — Rate limiting, batch inserts
- `server/services/queue-processor.ts` — SQL aggregation for stats, batch updates

### Frontend (Modified)
- `src/pages/CronManagement.tsx` — Virtualization, memoization
- `src/pages/MediaManagement.tsx` — Component memoization, virtualization
- `src/pages/ImageGallery.tsx` — Virtualization
- `src/pages/AuditLogs.tsx` — Virtualization
- `src/pages/WorkflowBuilder.tsx` — ConfigPanel split, memoization

### New Files
- `server/lib/retry.ts` — Retry utility with exponential backoff
- `server/lib/cache.ts` — Simple in-memory cache with TTL
- `src/hooks/useVirtualList.ts` — Virtualization hook (optional, can use library)

---

## Phase 1: P0 - Critical Backend Fixes

### Task 1.1: Fix N+1 Query in Cron Jobs List

**Files:**
- Modify: `server/database/service-async.ts`
- Modify: `server/routes/cron.ts`
- Test: `server/__tests__/database-service.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/__tests__/database-service.test.ts
describe('getCronJobsWithTags', () => {
  it('should fetch jobs with their tags in a single query', async () => {
    // Create test jobs with tags
    const job1 = await db.createCronJob({ name: 'Job 1', cron_expression: '* * * * *', workflow_json: '{}' })
    await db.addJobTag(job1.id, 'tag1')
    await db.addJobTag(job1.id, 'tag2')
    
    const job2 = await db.createCronJob({ name: 'Job 2', cron_expression: '* * * * *', workflow_json: '{}' })
    await db.addJobTag(job2.id, 'tag3')
    
    const jobsWithTags = await db.getCronJobsWithTags()
    
    expect(jobsWithTags).toHaveLength(2)
    expect(jobsWithTags.find(j => j.id === job1.id)?.tags).toEqual(['tag1', 'tag2'])
    expect(jobsWithTags.find(j => j.id === job2.id)?.tags).toEqual(['tag3'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/__tests__/database-service.test.ts --grep "getCronJobsWithTags"`
Expected: FAIL with "getCronJobsWithTags is not a function"

- [ ] **Step 3: Implement getCronJobsWithTags method**

```typescript
// server/database/service-async.ts
async getCronJobsWithTags(ownerId?: string): Promise<(CronJob & { tags: string[] })[]> {
  // Query jobs with tags using JOIN and GROUP BY
  const sql = `
    SELECT j.*, GROUP_CONCAT(t.tag, ',') as tags_csv
    FROM cron_jobs j
    LEFT JOIN job_tags t ON j.id = t.job_id
    ${ownerId ? 'WHERE j.owner_id = $1' : ''}
    GROUP BY j.id
    ORDER BY j.created_at DESC
  `
  
  const rows = await this.conn.query<CronJobRow & { tags_csv: string | null }>(
    sql,
    ownerId ? [ownerId] : []
  )
  
  return rows.map(row => ({
    ...rowToCronJob(row),
    tags: row.tags_csv ? row.tags_csv.split(',') : []
  }))
}
```

- [ ] **Step 4: Update cron.ts to use new method**

```typescript
// server/routes/cron.ts - replace lines 87-98
router.get('/jobs', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  
  // Single query instead of N+1
  const jobsWithTags = await db.getCronJobsWithTags(ownerId)
  
  res.json({ success: true, data: { jobs: jobsWithTags, total: jobsWithTags.length } })
}))
```

- [ ] **Step 5: Run tests to verify**

Run: `npm test -- server/__tests__/database-service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/database/service-async.ts server/routes/cron.ts server/__tests__/database-service.test.ts
git commit -m "perf(db): fix N+1 query in cron jobs list with JOIN"
```

---

### Task 1.2: Add Pagination to Unbounded Queries

**Files:**
- Modify: `server/database/service-async.ts`
- Modify: `server/routes/cron.ts`
- Modify: `server/routes/workflows.ts`

- [ ] **Step 1: Add pagination to getAllTasks**

```typescript
// server/database/service-async.ts
async getAllTasks(options?: {
  status?: TaskStatus
  ownerId?: string
  limit?: number
  offset?: number
}): Promise<{ tasks: TaskQueueItem[]; total: number }> {
  const { status, ownerId, limit = 100, offset = 0 } = options || {}
  
  // Build WHERE conditions
  const conditions: string[] = []
  const params: (string | number)[] = []
  let paramIndex = 1
  
  if (ownerId) {
    conditions.push(`owner_id = $${paramIndex}`)
    params.push(ownerId)
    paramIndex++
  }
  if (status) {
    conditions.push(`status = $${paramIndex}`)
    params.push(status)
    paramIndex++
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  
  // Count query
  const countRows = await this.conn.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM task_queue ${whereClause}`,
    params.slice()
  )
  const total = parseInt(countRows[0]?.count ?? '0', 10)
  
  // Data query with pagination
  params.push(limit, offset)
  const rows = await this.conn.query<TaskQueueRow>(
    `SELECT * FROM task_queue ${whereClause} ORDER BY priority DESC, created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  )
  
  return { tasks: rows.map(rowToTaskQueueItem), total }
}
```

- [ ] **Step 2: Update routes to use pagination**

```typescript
// server/routes/cron.ts - update queue endpoint
router.get('/queue', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const { status, limit = 50, offset = 0 } = req.query
  
  const { tasks, total } = await db.getAllTasks({
    status: status as TaskStatus,
    ownerId,
    limit: Number(limit),
    offset: Number(offset)
  })
  
  res.json({ success: true, data: { tasks, total } })
}))
```

- [ ] **Step 3: Add server-side filtering to workflows**

```typescript
// server/routes/workflows.ts - update GET /
router.get('/', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const { is_template, limit = 20, offset = 0 } = req.query
  
  // Use database filtering instead of in-memory
  const { templates, total } = await db.getWorkflowTemplatesPaginated({
    isTemplate: is_template === 'true' ? true : is_template === 'false' ? false : undefined,
    ownerId,
    limit: Number(limit),
    offset: Number(offset)
  })
  
  res.json({ success: true, data: { workflows: templates, total } })
}))
```

- [ ] **Step 4: Add getWorkflowTemplatesPaginated method**

```typescript
// server/database/service-async.ts
async getWorkflowTemplatesPaginated(options: {
  isTemplate?: boolean
  ownerId?: string
  limit: number
  offset: number
}): Promise<{ templates: WorkflowTemplate[]; total: number }> {
  const { isTemplate, ownerId, limit, offset } = options
  
  const conditions: string[] = []
  const params: (string | number)[] = []
  let paramIndex = 1
  
  if (ownerId) {
    conditions.push(`owner_id = $${paramIndex}`)
    params.push(ownerId)
    paramIndex++
  }
  if (isTemplate !== undefined) {
    conditions.push(`is_template = $${paramIndex}`)
    params.push(isTemplate ? 1 : 0)
    paramIndex++
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  
  const countRows = await this.conn.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM workflow_templates ${whereClause}`,
    params.slice()
  )
  const total = parseInt(countRows[0]?.count ?? '0', 10)
  
  params.push(limit, offset)
  const rows = await this.conn.query<WorkflowTemplateRow>(
    `SELECT * FROM workflow_templates ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  )
  
  return { templates: rows.map(rowToWorkflowTemplate), total }
}
```

- [ ] **Step 5: Run tests and commit**

```bash
npm test
git add server/database/service-async.ts server/routes/cron.ts server/routes/workflows.ts
git commit -m "perf(db): add pagination to unbounded queries"
```

---

### Task 1.3: Add API Retry with Exponential Backoff

**Files:**
- Create: `server/lib/retry.ts`
- Modify: `server/lib/minimax.ts`

- [ ] **Step 1: Create retry utility**

```typescript
// server/lib/retry.ts
export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  retryableStatusCodes?: number[]
  onRetry?: (attempt: number, error: Error) => void
}

const DEFAULT_RETRYABLE_CODES = [429, 500, 502, 503, 504]

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    retryableStatusCodes = DEFAULT_RETRYABLE_CODES,
    onRetry
  } = options

  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Check if error is retryable
      const statusCode = (error as any).code || (error as any).status
      if (!retryableStatusCodes.includes(statusCode)) {
        throw error
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelayMs
        )
        
        onRetry?.(attempt + 1, lastError)
        await sleep(delay)
      }
    }
  }
  
  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

- [ ] **Step 2: Wrap MiniMax API calls with retry**

```typescript
// server/lib/minimax.ts - add import at top
import { retryWithBackoff } from './retry.js'

// Add retry configuration
const RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 504, 408]
}

// Wrap API methods with retry
async chatCompletion(body: Record<string, unknown>): Promise<unknown> {
  return retryWithBackoff(async () => {
    try {
      const response = await this.client.post('/v1/text/chatcompletion_v2', body)
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }, RETRY_OPTIONS)
}

// Apply same pattern to all other API methods...
```

- [ ] **Step 3: Add tests for retry utility**

```typescript
// server/lib/__tests__/retry.test.ts
import { retryWithBackoff } from '../retry.js'

describe('retryWithBackoff', () => {
  it('should return result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success')
    const result = await retryWithBackoff(fn)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on retryable errors', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Rate limit'), { code: 429 }))
      .mockResolvedValue('success')
    
    const result = await retryWithBackoff(fn, { baseDelayMs: 10 })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should throw after max retries', async () => {
    const error = Object.assign(new Error('Server error'), { code: 500 })
    const fn = jest.fn().mockRejectedValue(error)
    
    await expect(retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 10 }))
      .rejects.toThrow('Server error')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })
})
```

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- server/lib/__tests__/retry.test.ts
git add server/lib/retry.ts server/lib/minimax.ts server/lib/__tests__/retry.test.ts
git commit -m "feat(api): add retry with exponential backoff for MiniMax API calls"
```

---

### Task 1.4: Add WebSocket Heartbeat and Connection Limits

**Files:**
- Modify: `server/services/websocket-service.ts`

- [ ] **Step 1: Add heartbeat constants and client tracking**

```typescript
// server/services/websocket-service.ts - add after imports
const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const HEARTBEAT_TIMEOUT = 10000 // 10 seconds
const MAX_CONNECTIONS = 1000

interface WebSocketClient {
  ws: WebSocket
  userId?: string
  userRole?: string
  subscriptions: Set<string>
  isAlive: boolean
  lastPong: number
}
```

- [ ] **Step 2: Add heartbeat mechanism**

```typescript
// In WebSocketService class
private heartbeatInterval: NodeJS.Timeout | null = null

startHeartbeat(): void {
  this.heartbeatInterval = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        console.log('[WS] Terminating stale connection')
        client.ws.terminate()
        clients.delete(client)
        continue
      }
      
      client.isAlive = false
      client.ws.ping()
    }
  }, HEARTBEAT_INTERVAL)
}

stopHeartbeat(): void {
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval)
    this.heartbeatInterval = null
  }
}
```

- [ ] **Step 3: Update connection handler**

```typescript
// Update wss.on('connection', ...) handler
wss.on('connection', (ws: WebSocket, req) => {
  // Check connection limit
  if (clients.size >= MAX_CONNECTIONS) {
    ws.close(1013, 'Server busy')
    return
  }

  const client: WebSocketClient = {
    ws,
    userId: undefined,
    userRole: undefined,
    subscriptions: new Set(['all']),
    isAlive: true,
    lastPong: Date.now()
  }
  clients.add(client)

  // Handle pong responses
  ws.on('pong', () => {
    client.isAlive = true
    client.lastPong = Date.now()
  })

  // ... rest of existing handler
})
```

- [ ] **Step 4: Start heartbeat in initialize**

```typescript
// In initialize() method, after wss setup
this.startHeartbeat()
```

- [ ] **Step 5: Add cleanup on close**

```typescript
// In close() method
stopHeartbeat()
```

- [ ] **Step 6: Run tests and commit**

```bash
npm test
git add server/services/websocket-service.ts
git commit -m "feat(ws): add heartbeat and connection limits for WebSocket"
```

---

## Phase 2: P1 - High Priority Backend Fixes

### Task 2.1: Replace Full Table Scan with SQL Aggregation

**Files:**
- Modify: `server/database/service-async.ts`
- Modify: `server/services/queue-processor.ts`

- [ ] **Step 1: Add getQueueStats method with SQL GROUP BY**

```typescript
// server/database/service-async.ts
async getQueueStats(jobId?: string): Promise<{
  pending: number
  running: number
  completed: number
  failed: number
  total: number
}> {
  let sql = `
    SELECT status, COUNT(*) as count 
    FROM task_queue 
    ${jobId ? 'WHERE job_id = $1' : ''}
    GROUP BY status
  `
  
  const rows = await this.conn.query<{ status: string; count: string }>(
    sql,
    jobId ? [jobId] : []
  )
  
  const stats = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    total: 0
  }
  
  for (const row of rows) {
    const count = parseInt(row.count, 10)
    stats.total += count
    if (row.status in stats) {
      stats[row.status as keyof typeof stats] = count
    }
  }
  
  return stats
}
```

- [ ] **Step 2: Update queue-processor to use new method**

```typescript
// server/services/queue-processor.ts - replace getQueueStats
async getQueueStats(jobId?: string): Promise<QueueStats> {
  return this.db.getQueueStats(jobId)
}
```

- [ ] **Step 3: Remove old implementation**

Delete the old getQueueStats that loads 10000 tasks into memory.

- [ ] **Step 4: Run tests and commit**

```bash
npm test
git add server/database/service-async.ts server/services/queue-processor.ts
git commit -m "perf(db): use SQL GROUP BY for queue stats instead of loading all tasks"
```

---

### Task 2.2: Add Balance Caching

**Files:**
- Create: `server/lib/cache.ts`
- Modify: `server/services/capacity-checker.ts`

- [ ] **Step 1: Create simple cache utility**

```typescript
// server/lib/cache.ts
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }
  
  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    })
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key)
  }
  
  clear(): void {
    this.cache.clear()
  }
}
```

- [ ] **Step 2: Add balance caching to capacity-checker**

```typescript
// server/services/capacity-checker.ts
import { SimpleCache } from '../lib/cache.js'

const BALANCE_CACHE_TTL = 30000 // 30 seconds

export class CapacityChecker {
  private balanceCache = new SimpleCache<{ balance: number; timestamp: number }>()
  
  async checkBalance(): Promise<{ totalBalance: number }> {
    const cached = this.balanceCache.get('balance')
    if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL) {
      return { totalBalance: cached.balance }
    }
    
    // Fetch from API
    const result = await this.minimaxClient.getBalance()
    const balance = (result as any).total_balance || 0
    
    this.balanceCache.set('balance', { balance, timestamp: Date.now() }, BALANCE_CACHE_TTL)
    
    return { totalBalance: balance }
  }
}
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test
git add server/lib/cache.ts server/services/capacity-checker.ts
git commit -m "perf(capacity): add 30-second balance cache to reduce API calls"
```

---

### Task 2.3: Fix O(n²) Duplicate Detection

**Files:**
- Modify: `server/routes/cron.ts`

- [ ] **Step 1: Replace O(n²) with O(n) using Set**

```typescript
// server/routes/cron.ts - update validateWorkflow function
function validateWorkflow(workflow: { nodes: unknown[]; edges: unknown[] }): string[] {
  const errors: string[] = []
  const parsedNodes = workflow.nodes as WorkflowNode[]
  const parsedEdges = workflow.edges as WorkflowEdge[]
  
  // O(n) duplicate check using Set
  const nodeIds = new Set<string>()
  for (const node of parsedNodes) {
    if (!node.id) {
      errors.push('All nodes must have an id')
    } else if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`)
    } else {
      nodeIds.add(node.id)
    }
  }
  
  // ... rest of validation
  return errors
}
```

- [ ] **Step 2: Run tests and commit**

```bash
npm test
git add server/routes/cron.ts
git commit -m "perf(validation): fix O(n²) duplicate node check to O(n)"
```

---

### Task 2.4: Add Batch SQL Operations

**Files:**
- Modify: `server/database/service-async.ts`
- Modify: `server/services/queue-processor.ts`

- [ ] **Step 1: Add batch status update method**

```typescript
// server/database/service-async.ts
async updateTasksStatusBatch(
  taskIds: string[],
  status: TaskStatus,
  ownerId?: string
): Promise<number> {
  if (taskIds.length === 0) return 0
  
  const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(', ')
  const sql = ownerId
    ? `UPDATE task_queue SET status = $${taskIds.length + 1} WHERE id IN (${placeholders}) AND owner_id = $${taskIds.length + 2}`
    : `UPDATE task_queue SET status = $${taskIds.length + 1} WHERE id IN (${placeholders})`
  
  const params = ownerId
    ? [...taskIds, status, ownerId]
    : [...taskIds, status]
  
  const result = await this.conn.execute(sql, params)
  return result.changes
}
```

- [ ] **Step 2: Update cancelPendingTasks to use batch**

```typescript
// server/services/queue-processor.ts
async cancelPendingTasks(jobId: string): Promise<number> {
  // Get pending task IDs
  const pendingTasks = await this.db.getPendingTasks(jobId, 1000)
  const pendingIds = pendingTasks
    .filter(t => t.status === TaskStatus.PENDING)
    .map(t => t.id)
  
  if (pendingIds.length === 0) return 0
  
  // Batch update
  return this.db.updateTasksStatusBatch(pendingIds, TaskStatus.CANCELLED)
}
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test
git add server/database/service-async.ts server/services/queue-processor.ts
git commit -m "perf(queue): add batch SQL operations for task status updates"
```

---

### Task 2.5: Add Missing Database Indexes

**Files:**
- Modify: `server/database/migrations-async.ts`
- Modify: `server/database/schema-pg.ts`

- [ ] **Step 1: Add migration for missing indexes**

```typescript
// server/database/migrations-async.ts
export const MIGRATIONS = [
  // ... existing migrations
  {
    id: 3,
    name: 'migration_003_add_performance_indexes',
    sql: `
      -- Execution logs status index
      CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON execution_logs(status);
      
      -- Task queue compound indexes
      CREATE INDEX IF NOT EXISTS idx_task_queue_status_owner ON task_queue(status, owner_id);
      CREATE INDEX IF NOT EXISTS idx_task_queue_type ON task_queue(task_type);
      
      -- Cron jobs name search
      CREATE INDEX IF NOT EXISTS idx_cron_jobs_name ON cron_jobs(name);
      
      -- Workflow templates name search
      CREATE INDEX IF NOT EXISTS idx_workflow_templates_name ON workflow_templates(name);
    `
  }
]
```

- [ ] **Step 2: Update schema-pg.ts for PostgreSQL**

Add same indexes to PG_SCHEMA_SQL for new installations.

- [ ] **Step 3: Run tests and commit**

```bash
npm test
git add server/database/migrations-async.ts server/database/schema-pg.ts
git commit -m "perf(db): add missing indexes for commonly filtered columns"
```

---

### Task 2.6: Optimize Webhook Query with Filtering

**Files:**
- Modify: `server/database/service-async.ts`
- Modify: `server/services/notification-service.ts`

- [ ] **Step 1: Add filtered webhook query**

```typescript
// server/database/service-async.ts
async getWebhookConfigsForJob(jobId: string | null, event: string, ownerId?: string): Promise<WebhookConfig[]> {
  const conditions = ['is_active = true']
  const params: (string | number)[] = []
  let paramIndex = 1
  
  // Filter by job_id (null means global webhooks)
  conditions.push(`(job_id = $${paramIndex} OR job_id IS NULL)`)
  params.push(jobId ?? null)
  paramIndex++
  
  if (ownerId) {
    conditions.push(`owner_id = $${paramIndex}`)
    params.push(ownerId)
    paramIndex++
  }
  
  const sql = `SELECT * FROM webhook_configs WHERE ${conditions.join(' AND ')}`
  const rows = await this.conn.query<WebhookConfigRow>(sql, params)
  
  // Filter by event in memory (stored as JSON array)
  return rows
    .map(rowToWebhookConfig)
    .filter(config => config.events.includes(event as any))
}
```

- [ ] **Step 2: Update notification service**

```typescript
// server/services/notification-service.ts
private async getWebhookConfigsForJob(jobId: string | null, event: string): Promise<WebhookConfig[]> {
  return this.db.getWebhookConfigsForJob(jobId, event)
}
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test
git add server/database/service-async.ts server/services/notification-service.ts
git commit -m "perf(db): filter webhooks at database level instead of in memory"
```

---

## Phase 3: P1 - High Priority Frontend Fixes

### Task 3.1: Add Virtualization to Large Lists

**Files:**
- Modify: `src/pages/CronManagement.tsx`
- Modify: `package.json`

- [ ] **Step 1: Install virtualization library**

```bash
npm install @tanstack/react-virtual
```

- [ ] **Step 2: Add virtualization to JobsListTab**

```typescript
// src/pages/CronManagement.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

// In JobsListTab component
const parentRef = useRef<HTMLDivElement>(null)

const rowVirtualizer = useVirtualizer({
  count: jobs.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60, // Estimated row height
  overscan: 10
})

// In JSX
<div ref={parentRef} className="h-[600px] overflow-auto">
  <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
    {rowVirtualizer.getVirtualItems().map(virtualRow => {
      const job = jobs[virtualRow.index]
      return (
        <div
          key={job.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`
          }}
        >
          {/* Job row content */}
        </div>
      )
    })}
  </div>
</div>
```

- [ ] **Step 3: Apply same pattern to TaskQueueTab and ExecutionLogsTab**

- [ ] **Step 4: Run tests and commit**

```bash
npm test
git add package.json package-lock.json src/pages/CronManagement.tsx
git commit -m "perf(ui): add virtualization to cron management tables"
```

---

### Task 3.2: Memoize Heavy Components

**Files:**
- Modify: `src/pages/MediaManagement.tsx`
- Modify: `src/pages/WorkflowBuilder.tsx`

- [ ] **Step 1: Memoize MediaCard component**

```typescript
// src/pages/MediaManagement.tsx
const MediaCard = React.memo(function MediaCard({ 
  record,
  onSelect,
  onPreview,
  onDownload,
  onDelete
}: MediaCardProps) {
  // Component implementation
})
```

- [ ] **Step 2: Memoize TimelineItem component**

```typescript
const TimelineItem = React.memo(function TimelineItem({ 
  record,
  onView,
  onDownload
}: TimelineItemProps) {
  // Component implementation
})
```

- [ ] **Step 3: Memoize ConfigPanel sections**

Split ConfigPanel into smaller memoized components:

```typescript
// src/pages/WorkflowBuilder.tsx
const TextNodeConfig = React.memo(function TextNodeConfig({ node, onChange }: ConfigProps) {
  // Text node specific config
})

const VoiceNodeConfig = React.memo(function VoiceNodeConfig({ node, onChange }: ConfigProps) {
  // Voice node specific config
})

// ... other node type configs

const ConfigPanel = React.memo(function ConfigPanel({ selectedNode, onUpdate }: ConfigPanelProps) {
  // Router to appropriate config component based on node type
  switch (selectedNode?.type) {
    case 'text': return <TextNodeConfig node={selectedNode} onChange={onUpdate} />
    case 'voice': return <VoiceNodeConfig node={selectedNode} onChange={onUpdate} />
    // ...
  }
})
```

- [ ] **Step 4: Run tests and commit**

```bash
npm test
git add src/pages/MediaManagement.tsx src/pages/WorkflowBuilder.tsx
git commit -m "perf(ui): memoize heavy components to prevent unnecessary re-renders"
```

---

### Task 3.3: Optimize Polling with Exponential Backoff

**Files:**
- Modify: `server/services/task-executor.ts`

- [ ] **Step 1: Update polling config**

```typescript
// server/services/task-executor.ts
const POLLING_CONFIG = {
  maxDurationMs: 600000, // 10 minutes
  initialIntervalMs: 3000, // Start at 3 seconds
  maxIntervalMs: 30000, // Cap at 30 seconds
  backoffMultiplier: 1.5
}
```

- [ ] **Step 2: Implement exponential backoff in polling**

```typescript
async executeWithPolling<T>(
  startFn: () => Promise<{ taskId: string }>,
  checkFn: (taskId: string) => Promise<T>,
  isComplete: (result: T) => boolean,
  timeout: number
): Promise<T> {
  const { taskId } = await startFn()
  const deadline = Date.now() + timeout
  
  let intervalMs = POLLING_CONFIG.initialIntervalMs
  
  while (Date.now() < deadline) {
    // Add jitter
    const jitter = Math.random() * 1000
    await this.delay(intervalMs + jitter)
    
    try {
      const result = await checkFn(taskId)
      if (isComplete(result)) {
        return result
      }
    } catch (error) {
      // Retry on transient errors
      console.warn('[TaskExecutor] Status check failed, retrying:', error)
    }
    
    // Exponential backoff
    intervalMs = Math.min(
      intervalMs * POLLING_CONFIG.backoffMultiplier,
      POLLING_CONFIG.maxIntervalMs
    )
  }
  
  throw new Error('Task polling timeout')
}
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test
git add server/services/task-executor.ts
git commit -m "perf(polling): add exponential backoff to async task polling"
```

---

## Phase 4: P2 - Medium Priority Fixes

### Task 4.1: Combine Redundant COUNT Queries

**Files:**
- Modify: `server/database/service-async.ts`

- [ ] **Step 1: Replace individual COUNT methods with combined method**

```typescript
// Replace getPendingTaskCount, getRunningTaskCount, getFailedTaskCount
async getTaskCountsByStatus(ownerId?: string): Promise<{
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}> {
  const sql = ownerId
    ? `SELECT status, COUNT(*) as count FROM task_queue WHERE owner_id = $1 GROUP BY status`
    : `SELECT status, COUNT(*) as count FROM task_queue GROUP BY status`
  
  const rows = await this.conn.query<{ status: string; count: string }>(
    sql,
    ownerId ? [ownerId] : []
  )
  
  const counts = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0
  }
  
  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status as keyof typeof counts] = parseInt(row.count, 10)
    }
  }
  
  return counts
}
```

- [ ] **Step 2: Update health endpoint to use new method**

```typescript
// server/routes/cron.ts - health endpoint
const counts = await db.getTaskCountsByStatus(ownerId)
const health = {
  // ...
  queue: {
    pending: counts.pending,
    running: counts.running,
    failed: counts.failed
  }
}
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test
git add server/database/service-async.ts server/routes/cron.ts
git commit -m "perf(db): combine redundant COUNT queries into single GROUP BY"
```

---

### Task 4.2: Add Webhook Rate Limiting

**Files:**
- Modify: `server/services/notification-service.ts`

- [ ] **Step 1: Add rate limiter for webhook deliveries**

```typescript
// server/services/notification-service.ts
import { SimpleCache } from '../lib/cache.js'

const WEBHOOK_RATE_LIMIT_PER_MINUTE = 100
const WEBHOOK_RATE_WINDOW_MS = 60000

export class NotificationService {
  private webhookRateLimiter = new Map<string, { count: number; resetAt: number }>()
  
  private checkRateLimit(webhookId: string): boolean {
    const now = Date.now()
    const limiter = this.webhookRateLimiter.get(webhookId)
    
    if (!limiter || now > limiter.resetAt) {
      this.webhookRateLimiter.set(webhookId, {
        count: 1,
        resetAt: now + WEBHOOK_RATE_WINDOW_MS
      })
      return true
    }
    
    if (limiter.count >= WEBHOOK_RATE_LIMIT_PER_MINUTE) {
      return false
    }
    
    limiter.count++
    return true
  }
  
  async sendWebhook(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
    if (!this.checkRateLimit(config.id)) {
      console.warn(`[Notification] Rate limit exceeded for webhook ${config.id}`)
      return
    }
    
    // ... existing send logic
  }
}
```

- [ ] **Step 2: Run tests and commit**

```bash
npm test
git add server/services/notification-service.ts
git commit -m "feat(webhook): add rate limiting for webhook deliveries"
```

---

## Testing Strategy

### Unit Tests
- All new methods require unit tests
- Test edge cases: empty results, large datasets, error conditions
- Test retry logic with mocked failures

### Integration Tests
- Test N+1 fix: verify single query for jobs with tags
- Test pagination: verify correct offset/limit behavior
- Test WebSocket heartbeat: verify stale connections are terminated

### Performance Tests
- Benchmark queries before/after optimization
- Test with 1000+ jobs/tasks to verify virtualization works
- Load test WebSocket with many concurrent connections

---

## Rollback Plan

Each commit is atomic and can be reverted independently:
1. `git revert <commit-hash>` for any problematic change
2. Database indexes can be dropped without data loss
3. Frontend virtualization can be removed if causing issues

---

## Estimated Impact

| Fix | Expected Improvement |
|-----|---------------------|
| N+1 Query Fix | 90% fewer DB queries |
| Pagination | 95% less memory usage |
| API Retry | 15-20% higher success rate |
| WebSocket Heartbeat | 100% reduction in stale connections |
| Frontend Virtualization | 50%+ faster rendering |
| Balance Cache | 95% fewer API calls |
| Batch SQL | 90% fewer UPDATE queries |

---

**Plan complete.** Ready for execution.