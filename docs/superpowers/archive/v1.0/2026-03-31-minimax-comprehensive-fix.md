# MiniMax AI Toolset - Comprehensive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix P0 broken stores, establish comprehensive test coverage, remove production console logs, improve error handling, fix memory leaks, and plan missing features.

**Architecture:** This is a React/Express monorepo with Zustand stores, better-sqlite3 database, node-cron scheduler, and workflow engine. The plan follows TDD approach - write tests first, then implementation.

**Tech Stack:** React 18, Express, better-sqlite3, Zustand, Vitest, @testing-library/react, node-cron, Zod

---

## Phase 0: Quick Wins (P0 Stub Fixes)

### Task 0.1: Fix taskQueue.ts - Replace placeholder API with real backend connection

**Files:**
- Modify: `src/stores/taskQueue.ts:25-69`
- Read: `src/lib/api/cron.ts` (already has getTasks, createTask, updateTask, deleteTask)

- [ ] **Step 1: Write the failing test**

```typescript
// src/stores/__tests__/taskQueue.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useTaskQueueStore } from '../taskQueue'

// Mock the cron API
jest.mock('@/lib/api/cron', () => ({
  getTasks: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}))

import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api/cron'

describe('useTaskQueueStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch tasks from API', async () => {
    const mockTasks = [{ id: '1', jobId: 'job-1', taskType: 'text', status: 'pending' }]
    ;(getTasks as jest.Mock).mockResolvedValue({ success: true, data: { tasks: mockTasks, total: 1 } })
    
    const { result } = renderHook(() => useTaskQueueStore())
    await result.current.fetchTasks()
    
    expect(getTasks).toHaveBeenCalled()
    expect(result.current.tasks).toEqual(mockTasks)
  })

  it('should create task via API', async () => {
    const newTask = { jobId: 'job-1', taskType: 'text', payload: {} }
    const createdTask = { id: '123', ...newTask, status: 'pending' }
    ;(createTask as jest.Mock).mockResolvedValue({ success: true, data: createdTask })
    
    const { result } = renderHook(() => useTaskQueueStore())
    const task = await result.current.createTask(newTask)
    
    expect(createTask).toHaveBeenCalled()
    expect(task.id).toBe('123')
  })

  it('should handle API errors gracefully', async () => {
    ;(getTasks as jest.Mock).mockResolvedValue({ success: false, error: 'Network error' })
    
    const { result } = renderHook(() => useTaskQueueStore())
    await result.current.fetchTasks()
    
    expect(result.current.error).toBe('Network error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/__tests__/taskQueue.test.ts --run`
Expected: FAIL - placeholderApi still being used

- [ ] **Step 3: Replace placeholder API with real API calls**

```typescript
// src/stores/taskQueue.ts - Replace lines 25-69

import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api/cron'

const realApi = {
  fetchTasks: async (filter?: TaskQueueFilter) => {
    const response = await getTasks(filter)
    if (response.success && response.data) {
      return response.data.tasks
    }
    throw new Error(response.error || 'Failed to fetch tasks')
  },
  createTask: async (task: CreateTaskDTO) => {
    const response = await createTask(task)
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to create task')
  },
  updateTask: async (id: string, updates: UpdateTaskDTO) => {
    const response = await updateTask(id, updates)
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to update task')
  },
  deleteTask: async (id: string) => {
    const response = await deleteTask(id)
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete task')
    }
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/__tests__/taskQueue.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/taskQueue.ts src/stores/__tests__/taskQueue.test.ts
git commit -m "fix: replace placeholderApi with real cron API in taskQueue store"
```

---

### Task 0.2: Fix executionLogs.ts - Replace placeholder API with real backend connection

**Files:**
- Modify: `src/stores/executionLogs.ts:13-20`
- Read: `src/lib/api/cron.ts` (has getLogs, getLogById)

- [ ] **Step 1: Write the failing test**

```typescript
// src/stores/__tests__/executionLogs.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useExecutionLogsStore } from '../executionLogs'

jest.mock('@/lib/api/cron', () => ({
  getLogs: jest.fn(),
  getLogById: jest.fn(),
}))

import { getLogs, getLogById } from '@/lib/api/cron'

describe('useExecutionLogsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch logs from API', async () => {
    const mockLogs = [{ id: '1', jobId: 'job-1', status: 'success' }]
    ;(getLogs as jest.Mock).mockResolvedValue({ success: true, data: { logs: mockLogs, total: 1 } })
    
    const { result } = renderHook(() => useExecutionLogsStore())
    await result.current.fetchLogs()
    
    expect(getLogs).toHaveBeenCalled()
    expect(result.current.logs).toEqual(mockLogs)
  })

  it('should fetch single log by id', async () => {
    const mockLog = { id: '123', jobId: 'job-1', status: 'failed' }
    ;(getLogById as jest.Mock).mockResolvedValue({ success: true, data: mockLog })
    
    const { result } = renderHook(() => useExecutionLogsStore())
    const log = await result.current.fetchLogById('123')
    
    expect(log).toEqual(mockLog)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/__tests__/executionLogs.test.ts --run`
Expected: FAIL - placeholderApi still being used

- [ ] **Step 3: Replace placeholder API with real API calls**

```typescript
// src/stores/executionLogs.ts - Replace lines 13-20

import { getLogs, getLogById } from '@/lib/api/cron'

const realApi = {
  fetchLogs: async (jobId?: string, limit?: number) => {
    const response = await getLogs({ jobId, limit })
    if (response.success && response.data) {
      return response.data.logs
    }
    throw new Error(response.error || 'Failed to fetch logs')
  },
  fetchLogById: async (id: string) => {
    const response = await getLogById(id)
    if (response.success && response.data) {
      return response.data
    }
    return null
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/__tests__/executionLogs.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/executionLogs.ts src/stores/__tests__/executionLogs.test.ts
git commit -m "fix: replace placeholderApi with real cron API in executionLogs store"
```

---

## Phase 1: Test Coverage (P1 - Critical Gap)

### Task 1.1: Backend - Test WorkflowEngine topological sort and node execution

**Files:**
- Test: `server/__tests__/workflow-engine.test.ts`
- Read: `server/services/workflow-engine.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/__tests__/workflow-engine.test.ts
import { WorkflowEngine } from '../workflow-engine'

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine

  beforeEach(() => {
    // Mock database and MiniMax client
    const mockDb = {
      createExecutionLog: jest.fn().mockResolvedValue({ id: 'log-1' }),
      updateExecutionLog: jest.fn(),
      updateExecutionLogDetail: jest.fn(),
      addTaskToQueue: jest.fn(),
    }
    const mockMiniMax = {
      text: jest.fn(),
      voice: jest.fn(),
      image: jest.fn(),
    }
    engine = new WorkflowEngine(mockDb as any, mockMiniMax as any)
  })

  describe('Topological Sort', () => {
    it('should sort nodes in dependency order', () => {
      const workflow = {
        nodes: [
          { id: 'c', type: 'action' },
          { id: 'a', type: 'action' },
          { id: 'b', type: 'action' },
        ],
        edges: [
          { source: 'a', target: 'c' },
          { source: 'b', target: 'c' },
        ],
      }
      
      const sorted = engine.topologicalSort(workflow.nodes, workflow.edges)
      
      // a and b should come before c
      const cIndex = sorted.findIndex(n => n.id === 'c')
      const aIndex = sorted.findIndex(n => n.id === 'a')
      const bIndex = sorted.findIndex(n => n.id === 'b')
      expect(aIndex).toBeLessThan(cIndex)
      expect(bIndex).toBeLessThan(cIndex)
    })

    it('should detect cycles', () => {
      const workflow = {
        nodes: [
          { id: 'a', type: 'action' },
          { id: 'b', type: 'action' },
        ],
        edges: [
          { source: 'a', target: 'b' },
          { source: 'b', target: 'a' }, // cycle
        ],
      }
      
      expect(() => engine.topologicalSort(workflow.nodes, workflow.edges)).toThrow('Cycle detected')
    })
  })

  describe('Condition Node', () => {
    it('should evaluate true condition and follow success path', async () => {
      const workflow = {
        nodes: [
          { id: 'action1', type: 'action', config: { output: { success: true } } },
          { id: 'condition1', type: 'condition', config: { condition: '{{action1.output.success}} == true' } },
          { id: 'action2', type: 'action' },
        ],
        edges: [
          { source: 'action1', target: 'condition1' },
          { source: 'condition1', target: 'action2', data: { branch: 'true' } },
        ],
      }
      
      const result = await engine.executeWorkflow(JSON.stringify(workflow))
      
      expect(result.success).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/__tests__/workflow-engine.test.ts --run`
Expected: FAIL - test file doesn't exist

- [ ] **Step 3: Create minimal implementation**

Create `server/__tests__/workflow-engine.test.ts` and `server/services/workflow-engine.ts` with exportable testable functions

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/__tests__/workflow-engine.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/__tests__/workflow-engine.test.ts
git commit -m "test: add WorkflowEngine topological sort and node execution tests"
```

---

### Task 1.2: Backend - Test QueueProcessor retry logic and dead letter queue

**Files:**
- Test: `server/__tests__/queue-processor.test.ts`
- Read: `server/services/queue-processor.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/__tests__/queue-processor.test.ts
import { QueueProcessor } from '../queue-processor'

describe('QueueProcessor', () => {
  let processor: QueueProcessor

  beforeEach(() => {
    const mockDb = {
      getPendingTasks: jest.fn().mockResolvedValue([]),
      updateTask: jest.fn(),
      moveToDeadLetter: jest.fn(),
    }
    const mockWorkflowEngine = { executeWorkflow: jest.fn() }
    processor = new QueueProcessor(mockDb as any, mockWorkflowEngine as any, { maxConcurrent: 2 })
  })

  describe('Exponential Backoff', () => {
    it('should calculate correct delay for retry attempt 1', () => {
      const delay = processor.calculateBackoffDelay(1, 3)
      expect(delay).toBe(1000) // 1s
    })

    it('should calculate correct delay for retry attempt 2', () => {
      const delay = processor.calculateBackoffDelay(2, 3)
      expect(delay).toBe(2000) // 2s
    })

    it('should cap at max delay of 5 minutes', () => {
      const delay = processor.calculateBackoffDelay(10, 3)
      expect(delay).toBe(300000) // 5 minutes
    })
  })

  describe('Dead Letter Queue', () => {
    it('should move task to dead letter after max retries', async () => {
      const task = { id: 'task-1', retry_count: 3, max_retries: 3 }
      const mockDb = {
        getPendingTasks: jest.fn().mockResolvedValue([task]),
        updateTask: jest.fn(),
        moveToDeadLetter: jest.fn().mockResolvedValue(true),
      }
      
      const p = new QueueProcessor(mockDb as any, { executeWorkflow: jest.fn() } as any)
      await p.processTask(task)
      
      expect(mockDb.moveToDeadLetter).toHaveBeenCalledWith(task.id, 'Max retries exceeded')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/__tests__/queue-processor.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Write implementation**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/__tests__/queue-processor.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/__tests__/queue-processor.test.ts
git commit -m "test: add QueueProcessor retry logic and dead letter queue tests"
```

---

### Task 1.3: Backend - Test CronScheduler scheduling and concurrent limits

**Files:**
- Test: `server/__tests__/cron-scheduler.test.ts`
- Read: `server/services/cron-scheduler.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/__tests__/cron-scheduler.test.ts
import { CronScheduler } from '../cron-scheduler'

describe('CronScheduler', () => {
  let scheduler: CronScheduler

  beforeEach(() => {
    const mockDb = {
      getActiveCronJobs: jest.fn().mockResolvedValue([]),
      updateCronJob: jest.fn(),
    }
    const mockWorkflowEngine = { executeWorkflow: jest.fn() }
    scheduler = new CronScheduler(mockDb as any, mockWorkflowEngine as any, { maxConcurrent: 2 })
  })

  describe('Concurrent Limit', () => {
    it('should not exceed max concurrent jobs', async () => {
      // Schedule 5 jobs
      for (let i = 0; i < 5; i++) {
        scheduler.scheduleJob({
          id: `job-${i}`,
          name: `Test Job ${i}`,
          cron_expression: '* * * * *',
          workflow_json: '{}',
          is_active: true,
        } as any)
      }
      
      // Trigger 5 job ticks simultaneously
      const jobs = Array.from({ length: 5 }, (_, i) => ({
        id: `job-${i}`,
        name: `Test Job ${i}`,
        cron_expression: '* * * * *',
        workflow_json: '{}',
      }))
      
      // Only 2 should run at once
      expect(scheduler.getRunningCount()).toBeLessThanOrEqual(2)
    })
  })

  describe('Graceful Shutdown', () => {
    it('should wait for running jobs to complete', async () => {
      scheduler.scheduleJob({
        id: 'long-job',
        name: 'Long Running Job',
        cron_expression: '* * * * *',
        workflow_json: '{}',
        is_active: true,
      } as any)
      
      const shutdownPromise = scheduler.gracefulShutdown(5000)
      
      // Should not resolve immediately
      await expect(shutdownPromise).resolves.toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write implementation**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

```bash
git add server/__tests__/cron-scheduler.test.ts
git commit -m "test: add CronScheduler scheduling and concurrent limit tests"
```

---

### Task 1.4: Backend - Test DatabaseService CRUD operations

**Files:**
- Test: `server/__tests__/database-service.test.ts`
- Read: `server/database/service.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/__tests__/database-service.test.ts
import { DatabaseService } from '../database/service'
import Database from 'better-sqlite3'

describe('DatabaseService', () => {
  let db: DatabaseService

  beforeEach(() => {
    // Use in-memory database for testing
    db = new DatabaseService(':memory:')
    db.initialize()
  })

  afterEach(() => {
    db.close()
  })

  describe('Cron Jobs', () => {
    it('should create a cron job', () => {
      const job = db.createCronJob({
        name: 'Test Job',
        cron_expression: '* * * * *',
        workflow_json: '{}',
      })
      
      expect(job.id).toBeDefined()
      expect(job.name).toBe('Test Job')
    })

    it('should get active cron jobs', () => {
      db.createCronJob({ name: 'Active', cron_expression: '* * * * *', workflow_json: '{}', is_active: true })
      db.createCronJob({ name: 'Inactive', cron_expression: '* * * * *', workflow_json: '{}', is_active: false })
      
      const activeJobs = db.getActiveCronJobs()
      
      expect(activeJobs).toHaveLength(1)
      expect(activeJobs[0].name).toBe('Active')
    })

    it('should update cron job', () => {
      const job = db.createCronJob({ name: 'Original', cron_expression: '* * * * *', workflow_json: '{}' })
      
      db.updateCronJob(job.id, { name: 'Updated' })
      
      const updated = db.getCronJob(job.id)
      expect(updated?.name).toBe('Updated')
    })
  })

  describe('Task Queue', () => {
    it('should add task to queue', () => {
      const task = db.addTaskToQueue({
        job_id: 'job-1',
        task_type: 'text',
        payload: '{}',
      })
      
      expect(task.id).toBeDefined()
      expect(task.status).toBe('pending')
    })

    it('should get pending tasks', () => {
      db.addTaskToQueue({ job_id: 'job-1', task_type: 'text', payload: '{}', status: 'pending' })
      db.addTaskToQueue({ job_id: 'job-1', task_type: 'text', payload: '{}', status: 'completed' })
      
      const pending = db.getPendingTasks(10)
      
      expect(pending).toHaveLength(1)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write implementation**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

```bash
git add server/__tests__/database-service.test.ts
git commit -m "test: add DatabaseService CRUD operation tests"
```

---

### Task 1.5: Frontend - Test Zustand stores

**Files:**
- Test: `src/stores/__tests__/*.test.ts`
- Read: `src/stores/cronJobs.ts`, `src/stores/capacity.ts`

- [ ] **Step 1: Write tests for cronJobs store**

```typescript
// src/stores/__tests__/cronJobs.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useCronJobsStore } from '../cronJobs'

jest.mock('@/lib/api/cron', () => ({
  getCronJobs: jest.fn(),
  createCronJob: jest.fn(),
  updateCronJob: jest.fn(),
  deleteCronJob: jest.fn(),
  runCronJob: jest.fn(),
  toggleCronJob: jest.fn(),
}))

describe('useCronJobsStore', () => {
  // ... tests for CRUD operations, loading states, error handling
})
```

- [ ] **Step 2: Write tests for capacity store**
- [ ] **Step 3: Run tests to verify they pass**
- [ ] **Step 4: Commit**

```bash
git add src/stores/__tests__/
git commit -m "test: add Zustand store tests for cronJobs and capacity"
```

---

### Task 1.6: Frontend - Test API modules

**Files:**
- Test: `src/lib/api/__tests__/*.test.ts`
- Read: `src/lib/api/cron.ts`, `src/lib/api/text.ts`

- [ ] **Step 1: Write tests for cron API**

```typescript
// src/lib/api/__tests__/cron.test.ts
import { getTasks, createTask } from '../cron'

describe('Cron API', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('should call correct endpoint for getTasks', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { tasks: [], total: 0 } }),
    })
    
    await getTasks()
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cron/queue'),
      expect.any(Object)
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**
- [ ] **Step 3: Commit**

```bash
git add src/lib/api/__tests__/
git commit -m "test: add API module tests"
```

---

## Phase 2: Production Console Output (P2)

### Task 2.1: Remove console.log from cron-scheduler.ts

**Files:**
- Modify: `server/services/cron-scheduler.ts` (16 console.log statements at lines 43, 46, 51, 57, 98, 117, 142, 183, 238, 257, 279, 284, 291, 295, 310, 317)

- [ ] **Step 1: Identify all console.log statements**

Run: `grep -n "console.log" server/services/cron-scheduler.ts`

- [ ] **Step 2: Replace with structured logging**

```typescript
// Replace console.log with a proper logger
import { logger } from '../lib/logger'

// Replace:
// console.log('[CronScheduler] Initializing...')
// With:
// logger.info('CronScheduler initializing')
```

- [ ] **Step 3: Verify no console.log remains**

Run: `grep -n "console.log" server/services/cron-scheduler.ts`
Expected: No matches

- [ ] **Step 4: Commit**

```bash
git add server/services/cron-scheduler.ts
git commit -m "perf: replace console.log with structured logger in cron-scheduler"
```

---

### Task 2.2: Remove console.log from queue-processor.ts

**Files:**
- Modify: `server/services/queue-processor.ts` (2 console.log statements at lines 101, 220)

- [ ] **Step 1-4: Same pattern as Task 2.1**

- [ ] **Commit**

```bash
git add server/services/queue-processor.ts
git commit -m "perf: replace console.log with structured logger in queue-processor"
```

---

### Task 2.3: Remove console.log from server/index.ts

**Files:**
- Modify: `server/index.ts` (5 console.log statements at lines 61, 63, 82, 87, 93)

- [ ] **Step 1-4: Same pattern as Task 2.1**

- [ ] **Commit**

```bash
git add server/index.ts
git commit -m "perf: replace console.log with structured logger in server index"
```

---

### Task 2.4: Remove console.log from frontend stores

**Files:**
- Modify: `src/stores/taskQueue.ts` (line 67), `src/stores/capacity.ts` (line 103), `src/lib/analytics.ts` (line 83)

- [ ] **Step 1-4: Same pattern**

- [ ] **Commit**

```bash
git add src/stores/taskQueue.ts src/stores/capacity.ts src/lib/analytics.ts
git commit -m "perf: remove production console.log statements from frontend"
```

---

## Phase 3: Error Handling (P3)

### Task 3.1: Fix text.ts reader error handling

**Files:**
- Modify: `src/lib/api/text.ts:22-23`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/api/__tests__/text.test.ts
describe('streamChatCompletion', () => {
  it('should throw user-friendly error when response body is null', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: null,
    })
    
    const generator = streamChatCompletion({ messages: [] })
    await expect(generator.next()).rejects.toThrow('Response body is not available')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Fix the error handling**

```typescript
// src/lib/api/text.ts lines 22-23 - Replace:
const reader = response.body?.getReader()
if (!reader) throw new Error('No reader available')

// With:
if (!response.body) {
  throw new Error('Response body is not available. Please check your network connection.')
}
const reader = response.body.getReader()
```

- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

```bash
git add src/lib/api/text.ts src/lib/api/__tests__/text.test.ts
git commit -m "fix: improve error handling when response body is unavailable"
```

---

### Task 3.2: Add error recovery UI for VoiceAsync upload errors

**Files:**
- Read: `src/pages/VoiceAsync.tsx` (find upload error handling)
- Modify: `src/pages/VoiceAsync.tsx` (add retry UI)

- [ ] **Step 1: Find upload error handling**

Run: `grep -n "upload\|error\|catch" src/pages/VoiceAsync.tsx | head -30`

- [ ] **Step 2: Add error boundary and retry logic**

- [ ] **Step 3: Commit**

---

### Task 3.3: Add ErrorBoundary for React context errors

**Files:**
- Read: `src/components/shared/ErrorBoundary.tsx`
- Modify: `src/components/ui/Tabs.tsx`, `src/components/ui/Select.tsx`

- [ ] **Step 1: Check if ErrorBoundary exists**

- [ ] **Step 2: Wrap components with ErrorBoundary**

- [ ] **Step 3: Add context provider fallbacks**

- [ ] **Step 4: Commit**

---

## Phase 4: Memory Leak Risk (P4)

### Task 4.1: Verify setInterval cleanup in VideoAgent

**Files:**
- Read: `src/pages/VideoAgent.tsx`

- [ ] **Step 1: Find all setInterval calls**

Run: `grep -n "setInterval\|clearInterval" src/pages/VideoAgent.tsx`

- [ ] **Step 2: Verify useEffect cleanup**

- [ ] **Step 3: Add cleanup if missing**

```typescript
useEffect(() => {
  const interval = setInterval(() => checkStatus(), 5000)
  return () => clearInterval(interval)
}, [taskId])
```

- [ ] **Step 4: Commit**

---

### Task 4.2: Verify setInterval cleanup in VoiceAsync

**Files:**
- Read: `src/pages/VoiceAsync.tsx`

- [ ] **Step 1-4: Same pattern as Task 4.1**

---

### Task 4.3: Verify setInterval cleanup in VideoGeneration

**Files:**
- Read: `src/pages/VideoGeneration.tsx`

- [ ] **Step 1-4: Same pattern as Task 4.1**

---

## Phase 5: Missing Features (Planning Phase Only)

> **Note:** These are large features that require separate specs and plans. This section outlines the high-level approach for each.

### Task 5.1: CLI Tool Architecture

**Approach:** Create a CLI using Commander.js or oclif

**Files to create:**
- `cli/src/index.ts` - CLI entry point
- `cli/src/commands/cron.ts` - Cron job management
- `cli/src/commands/queue.ts` - Queue operations
- `cli/src/commands/workflow.ts` - Workflow management

**Verification:** CLI commands work end-to-end

---

### Task 5.2: MCP Integration Architecture

**Approach:** Build MCP server using @modelcontextprotocol/sdk

**Files to create:**
- `mcp/src/index.ts` - MCP server entry
- `mcp/src/tools/cron.ts` - Cron tools
- `mcp/src/tools/workflow.ts` - Workflow tools

**Verification:** MCP server passes MCP inspector tests

---

### Task 5.3: Authentication/Authorization Architecture

**Approach:** JWT-based auth with role-based access

**Files to create:**
- `server/middleware/auth.ts` - JWT validation
- `server/services/auth-service.ts` - Token management
- Database migrations for users/roles tables

**Verification:** Unauthenticated requests are rejected with 401

---

### Task 5.4: Event-Driven Triggers Architecture

**Approach:** Webhook inbound endpoints + event queue

**Files to create:**
- `server/routes/events.ts` - Inbound webhook receiver
- `server/services/event-queue.ts` - Event processing
- `server/services/trigger-engine.ts` - Rule matching

**Verification:** Events trigger correct workflows

---

### Task 5.5: RAG/Knowledge Base Architecture

**Approach:** Vector embeddings with pgvector or in-memory

**Files to create:**
- `server/services/vector-store.ts` - Embedding storage
- `server/services/rag-engine.ts` - Retrieval and generation
- `server/routes/rag.ts` - RAG API endpoints

**Verification:** RAG queries return relevant context

---

## Parallel Execution Strategy

### Wave 1 (Parallel - 5 agents)
- **Agent 1:** Task 0.1 (taskQueue stub fix)
- **Agent 2:** Task 0.2 (executionLogs stub fix)
- **Agent 3:** Task 1.1 (WorkflowEngine tests)
- **Agent 4:** Task 1.2 (QueueProcessor tests)
- **Agent 5:** Task 1.3 (CronScheduler tests)

### Wave 2 (Parallel - 4 agents)
- **Agent 6:** Task 1.4 (DatabaseService tests)
- **Agent 7:** Task 1.5 (Zustand store tests)
- **Agent 8:** Task 1.6 (API module tests)
- **Agent 9:** Task 2.1-2.4 (console.log removal)

### Wave 3 (Parallel - 3 agents)
- **Agent 10:** Task 3.1 (text.ts error handling)
- **Agent 11:** Task 3.2-3.3 (error recovery UI)
- **Agent 12:** Task 4.1-4.3 (memory leak cleanup)

---

## Atomic Commit Strategy

Each task produces exactly 1 commit with:
- Subject: `fix:|feat:|test:|perf:|chore:` prefix
- Body: What changed and why
- References: Issue number if applicable

**Example:**
```
fix: replace placeholderApi with real cron API in taskQueue store

- Removed hardcoded placeholderApi object
- Integrated getTasks, createTask, updateTask, deleteTask from @/lib/api/cron
- Added proper error propagation to store state
- Added test coverage for API integration

Closes #P0-001
```

---

## Effort Estimates

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 0 | 2 | 30 minutes | P0 |
| Phase 1 | 6 | 4 hours | P1 |
| Phase 2 | 4 | 1 hour | P2 |
| Phase 3 | 3 | 2 hours | P3 |
| Phase 4 | 3 | 1 hour | P4 |
| Phase 5 | 5 | Planning only | Future |

**Total implementation:** ~8-9 hours across 5 waves

---

## Verification Checklist Per Task

- [ ] Tests written BEFORE implementation
- [ ] Tests fail with current code
- [ ] Implementation makes tests pass
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] Single atomic commit with descriptive message

---

## Next Steps

**Plan complete and saved to `docs/superpowers/plans/2026-03-31-minimax-comprehensive-fix.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
