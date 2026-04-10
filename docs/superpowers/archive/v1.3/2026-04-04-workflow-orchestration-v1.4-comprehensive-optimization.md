# v1.4 Implementation Plan: Workflow Orchestration Comprehensive Optimization

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comprehensive optimization of the workflow orchestration system: fix critical gaps, improve UX, and add new features.

**Architecture:**
- **Backend:** Enhanced WorkflowEngine with pause/resume, execution persistence, node-level WebSocket events
- **Cron Scheduler:** Webhook notification fixes, consecutive failure alerting, DLQ auto-retry
- **Frontend:** New Webhook management UI, execution controls, real-time node status, deduplicated modals

**Tech Stack:** Express + TypeScript + PostgreSQL + node-cron + React 18 + ReactFlow + Zustand + WebSocket + Playwright (QA)

---

## User Journey Framework

This plan addresses the complete user journey:

```
Discovery → Configuration → Execution → Monitoring → Recovery
    ↓           ↓              ↓            ↓           ↓
  Search   Cron/Template   Run/Pause   Real-time   Retry/DLQ
  Filter   Builder UI      Controls    Updates     Webhooks
```

---

## Phase Summary

| Phase | Focus | Tasks | Category Distribution |
|-------|-------|-------|----------------------|
| **P0** | Critical Gaps | 12 tasks | 4 deep + 5 quick + 3 visual-engineering |
| **P1** | Important UX | 18 tasks | 6 deep + 6 quick + 6 visual-engineering |
| **P2** | Advanced Features | 10 tasks | 3 ultrabrain + 4 deep + 3 visual-engineering |

---

## Task Dependency Graph

### P0 Critical Gaps (Must Fix First)

```
P0-1 (Webhook Notification Fix)
  └── Depends: None
  └── Required by: P1-7 (Webhook UI), P2-1 (Webhook Template)

P0-2 (Execution State Persistence)
  └── Depends: None
  └── Required by: P0-3 (Pause/Resume), P0-4 (Execution Controls)

P0-3 (Pause/Resume Backend)
  └── Depends: P0-2
  └── Required by: P0-4, P1-3

P0-4 (Execution Controls Frontend)
  └── Depends: P0-3
  └── Required by: None

P0-5 (DLQ Auto-Retry Backend)
  └── Depends: None
  └── Required by: P0-6 (DLQ Auto-Retry UI)

P0-6 (DLQ Auto-Retry UI)
  └── Depends: P0-5
  └── Required by: None

P0-7 (Node-Level WebSocket Events)
  └── Depends: None
  └── Required by: P0-8 (Node Status Display), P1-1 (Real-time Updates)

P0-8 (Node Status Display)
  └── Depends: P0-7
  └── Required by: None

P0-9 (Modal Deduplication)
  └── Depends: None
  └── Required by: P1-8 (Template/Workflow Selector)

P0-10 (Template Versioning DB)
  └── Depends: None
  └── Required by: P0-11 (Template Versioning UI)

P0-11 (Template Versioning UI)
  └── Depends: P0-10
  └── Required by: None

P0-12 (Inline Validation)
  └── Depends: None
  └── Required by: None
```

### P1 Important Improvements (Can Parallelize After Dependencies)

```
P1-1 (Workflow Execution Real-time Updates)
  └── Depends: P0-7, P0-8
  └── Required by: None

P1-2 (Job Search & Filter)
  └── Depends: None
  └── Required by: None

P1-3 (Cron Expression Preview)
  └── Depends: None
  └── Required by: P1-4 (Timezone Selector)

P1-4 (Timezone Selector Dropdown)
  └── Depends: P1-3
  └── Required by: None

P1-5 (Job Dependency Visualization)
  └── Depends: None
  └── Required by: None

P1-6 (Job Tagging UI)
  └── Depends: None
  └── Required by: None

P1-7 (Webhook Management UI) - MISSING FEATURE
  └── Depends: P0-1
  └── Required by: None

P1-8 (Template/Workflow Selector Refactor)
  └── Depends: P0-9
  └── Required by: None

P1-9 (Per-Node-Type Config Components)
  └── Depends: None
  └── Required by: None

P1-10 (Node Search/Filter in Builder)
  └── Depends: None
  └── Required by: None

P1-11 (Consecutive Failure Alerting)
  └── Depends: None
  └── Required by: None

P1-12 (Continue-on-Error Node Option)
  └── Depends: None
  └── Required by: None

P1-13 to P1-18 (UX Polish Items)
  └── Depends: None
  └── Required by: None
```

### P2 Advanced Features (Future Enhancements)

```
P2-1 to P2-10
  └── All: Depends on relevant P0/P1 features
  └── No hard dependencies between P2 tasks
```

---

## Parallel Execution Strategy

### Wave 1: P0 Foundation (Week 1)

**Parallel Track A (Backend Core):**
- P0-1: Webhook notification fix
- P0-2: Execution state persistence
- P0-5: DLQ auto-retry backend
- P0-7: Node-level WebSocket events

**Parallel Track B (Frontend Core):**
- P0-9: Modal deduplication
- P0-10: Template versioning DB
- P0-12: Inline validation

**Parallel Track C (Integration):**
- P0-3: Pause/resume backend (needs P0-2)
- P0-6: DLQ auto-retry UI (needs P0-5)
- P0-8: Node status display (needs P0-7)

### Wave 2: P0 Completion + P1 Start (Week 2)

**Parallel Track A:**
- P0-4: Execution controls frontend (needs P0-3)
- P0-11: Template versioning UI (needs P0-10)

**Parallel Track B (New Features):**
- P1-1: Real-time updates (needs P0-7, P0-8)
- P1-2: Job search & filter
- P1-3/P1-4: Cron expression + timezone
- P1-7: Webhook management UI (needs P0-1)

**Parallel Track C (UX Improvements):**
- P1-5: Job dependency visualization
- P1-6: Job tagging UI
- P1-8: Selector refactor (needs P0-9)
- P1-9: Per-node-type components

### Wave 3: P1 Completion (Week 3-4)

- P1-10 through P1-18
- P2 tasks as capacity allows

---

## Detailed Task Breakdown

# P0: CRITICAL GAPS (Must Fix)

---

## P0-1: Fix Webhook Notification in executeJobTick

**Category:** `deep` - Backend bug fix with testing
**Skills to Load:** [`superpowers/test-driven-development`]
**Estimated Effort:** 4-6 hours

### Problem Statement
`CronScheduler.executeJobTick()` does NOT call `NotificationService.notifyJobEvent()` - webhooks may not fire for scheduled job executions.

### Files
- Modify: `server/services/cron-scheduler.ts:180-220` (executeJobTick method)
- Modify: `server/services/cron-scheduler.ts:1-50` (imports)
- Test: `server/__tests__/cron-scheduler.test.ts`

### TDD Steps

#### Step 1: Write failing test for webhook notification

```typescript
// server/__tests__/cron-scheduler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CronScheduler } from '../services/cron-scheduler'
import { NotificationService } from '../services/notification-service'

describe('CronScheduler webhook notifications', () => {
  let scheduler: CronScheduler
  let mockNotificationService: NotificationService

  beforeEach(() => {
    mockNotificationService = {
      notifyJobEvent: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationService
    scheduler = new CronScheduler(mockDb, mockTaskExecutor, mockNotificationService)
  })

  it('should call notifyJobEvent with on_start when job starts', async () => {
    const job = createMockJob({ webhookConfig: { on_start: true, url: 'http://test.com' } })
    
    await scheduler.executeJobTick(job)
    
    expect(mockNotificationService.notifyJobEvent).toHaveBeenCalledWith(
      job.id,
      'on_start',
      expect.objectContaining({ jobId: job.id })
    )
  })

  it('should call notifyJobEvent with on_success when job succeeds', async () => {
    const job = createMockJob({ webhookConfig: { on_success: true, url: 'http://test.com' } })
    
    await scheduler.executeJobTick(job)
    
    expect(mockNotificationService.notifyJobEvent).toHaveBeenCalledWith(
      job.id,
      'on_success',
      expect.objectContaining({ success: true })
    )
  })

  it('should call notifyJobEvent with on_failure when job fails', async () => {
    const job = createMockJob({ 
      webhookConfig: { on_failure: true, url: 'http://test.com' },
      shouldFail: true 
    })
    
    await scheduler.executeJobTick(job)
    
    expect(mockNotificationService.notifyJobEvent).toHaveBeenCalledWith(
      job.id,
      'on_failure',
      expect.objectContaining({ success: false })
    )
  })
})
```

**Run:** `npx vitest run server/__tests__/cron-scheduler.test.ts --reporter=verbose`
**Expected:** FAIL - "notifyJobEvent is not called"

#### Step 2: Add NotificationService dependency to CronScheduler

```typescript
// server/services/cron-scheduler.ts
import { NotificationService } from './notification-service.js'

export class CronScheduler {
  private notificationService: NotificationService

  constructor(
    private db: DatabaseService,
    private taskExecutor: TaskExecutor,
    notificationService?: NotificationService
  ) {
    this.notificationService = notificationService ?? getNotificationService()
  }
  // ... rest of class
}
```

#### Step 3: Inject notification calls in executeJobTick

```typescript
// server/services/cron-scheduler.ts - executeJobTick method
async executeJobTick(job: CronJob): Promise<void> {
  const startTime = Date.now()
  
  // Notify on_start
  if (job.webhookConfig?.on_start) {
    await this.notificationService.notifyJobEvent(job.id, 'on_start', {
      jobId: job.id,
      jobName: job.name,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    // ... existing execution logic ...
    const result = await this.executeWorkflow(job.workflowId)
    
    // Notify on_success
    if (job.webhookConfig?.on_success) {
      await this.notificationService.notifyJobEvent(job.id, 'on_success', {
        jobId: job.id,
        jobName: job.name,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    // Notify on_failure
    if (job.webhookConfig?.on_failure) {
      await this.notificationService.notifyJobEvent(job.id, 'on_failure', {
        jobId: job.id,
        jobName: job.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    throw error
  }
}
```

**Run:** `npx vitest run server/__tests__/cron-scheduler.test.ts --reporter=verbose`
**Expected:** PASS

#### Step 4: Integration test with real notification service

```typescript
// server/__tests__/cron-scheduler-integration.test.ts
it('should actually send webhook when job executes', async () => {
  const webhookServer = createMockWebhookServer()
  const job = createJobWithWebhook(webhookServer.url)
  
  await scheduler.executeJobTick(job)
  
  await waitFor(() => webhookServer.receivedCalls.length > 0)
  expect(webhookServer.receivedCalls[0].event).toBe('on_success')
})
```

**Commit:** `git add server/ && git commit -m "fix: add webhook notifications to executeJobTick

- Inject NotificationService into CronScheduler
- Call notifyJobEvent for on_start, on_success, on_failure
- Add comprehensive tests

Fixes: webhook notifications not firing for scheduled jobs"`

### Success Criteria
- [ ] All webhook events fire correctly (on_start, on_success, on_failure)
- [ ] Tests cover all three event types
- [ ] Integration test verifies actual HTTP call
- [ ] No regression in existing scheduler tests

---

## P0-2: Execution State Persistence

**Category:** `deep` - Database + state management
**Skills to Load:** [`superpowers/test-driven-development`]
**Estimated Effort:** 6-8 hours

### Problem Statement
Execution state lives in memory only. Server restarts lose all running workflow state.

### Files
- Modify: `server/database/schema-pg.ts` (add execution_state table)
- Create: `server/database/migrations/022_execution_state.ts`
- Modify: `server/database/types.ts` (add ExecutionState type)
- Modify: `server/database/service-async.ts` (add CRUD methods)
- Create: `server/services/execution-state-manager.ts`
- Test: `server/__tests__/execution-state.test.ts`

### Database Schema

```sql
-- Add to schema-pg.ts
CREATE TABLE IF NOT EXISTS execution_states (
  id TEXT PRIMARY KEY DEFAULT 'exec_' || lower(hex(randomblob(16))),
  execution_log_id TEXT NOT NULL REFERENCES execution_logs(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL REFERENCES workflow_templates(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'resumed', 'completed', 'failed', 'cancelled')),
  current_layer INTEGER DEFAULT 0,
  completed_nodes TEXT NOT NULL DEFAULT '[]', -- JSON array of node IDs
  failed_nodes TEXT NOT NULL DEFAULT '[]', -- JSON array of {nodeId, error}
  node_outputs TEXT NOT NULL DEFAULT '{}', -- JSON object of nodeId -> output
  context TEXT NOT NULL DEFAULT '{}', -- JSON execution context
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paused_at DATETIME,
  resumed_at DATETIME,
  completed_at DATETIME,
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_execution_states_status ON execution_states(status);
CREATE INDEX IF NOT EXISTS idx_execution_states_log_id ON execution_states(execution_log_id);
```

### TDD Steps

#### Step 1: Write failing test for state persistence

```typescript
// server/__tests__/execution-state.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ExecutionStateManager } from '../services/execution-state-manager'

describe('ExecutionStateManager', () => {
  let manager: ExecutionStateManager

  beforeEach(() => {
    manager = new ExecutionStateManager(mockDb)
  })

  it('should create execution state', async () => {
    const state = await manager.create({
      executionLogId: 'log-123',
      workflowId: 'wf-456',
      status: 'running',
    })
    
    expect(state.id).toBeDefined()
    expect(state.status).toBe('running')
  })

  it('should persist node completion', async () => {
    const state = await manager.create({ executionLogId: 'log-123', workflowId: 'wf-456', status: 'running' })
    
    await manager.markNodeComplete(state.id, 'node-1', { result: 'success' })
    
    const updated = await manager.getById(state.id)
    expect(updated.completed_nodes).toContain('node-1')
    expect(updated.node_outputs['node-1']).toEqual({ result: 'success' })
  })

  it('should persist pause state', async () => {
    const state = await manager.create({ executionLogId: 'log-123', workflowId: 'wf-456', status: 'running' })
    
    await manager.pause(state.id)
    
    const updated = await manager.getById(state.id)
    expect(updated.status).toBe('paused')
    expect(updated.paused_at).toBeDefined()
  })

  it('should recover running executions on startup', async () => {
    // Create a running state
    await manager.create({ executionLogId: 'log-123', workflowId: 'wf-456', status: 'running' })
    
    // Simulate restart by creating new manager instance
    const newManager = new ExecutionStateManager(mockDb)
    const running = await newManager.getRunningExecutions()
    
    expect(running).toHaveLength(1)
    expect(running[0].execution_log_id).toBe('log-123')
  })
})
```

**Run:** `npx vitest run server/__tests__/execution-state.test.ts`
**Expected:** FAIL - "ExecutionStateManager is not defined"

#### Step 2: Create ExecutionStateManager

```typescript
// server/services/execution-state-manager.ts
import { DatabaseService } from '../database/service-async.js'
import { ExecutionState, CreateExecutionStateDTO, UpdateExecutionStateDTO } from '../database/types.js'

export class ExecutionStateManager {
  constructor(private db: DatabaseService) {}

  async create(data: CreateExecutionStateDTO): Promise<ExecutionState> {
    return this.db.createExecutionState(data)
  }

  async getById(id: string): Promise<ExecutionState | undefined> {
    return this.db.getExecutionStateById(id)
  }

  async getByExecutionLogId(logId: string): Promise<ExecutionState | undefined> {
    return this.db.getExecutionStateByLogId(logId)
  }

  async markNodeComplete(stateId: string, nodeId: string, output: unknown): Promise<void> {
    const state = await this.getById(stateId)
    if (!state) throw new Error(`Execution state ${stateId} not found`)

    const completedNodes = JSON.parse(state.completed_nodes)
    const nodeOutputs = JSON.parse(state.node_outputs)

    completedNodes.push(nodeId)
    nodeOutputs[nodeId] = output

    await this.db.updateExecutionState(stateId, {
      completed_nodes: JSON.stringify(completedNodes),
      node_outputs: JSON.stringify(nodeOutputs),
      updated_at: new Date().toISOString(),
    })
  }

  async markNodeFailed(stateId: string, nodeId: string, error: string): Promise<void> {
    const state = await this.getById(stateId)
    if (!state) throw new Error(`Execution state ${stateId} not found`)

    const failedNodes = JSON.parse(state.failed_nodes)
    failedNodes.push({ nodeId, error, timestamp: new Date().toISOString() })

    await this.db.updateExecutionState(stateId, {
      failed_nodes: JSON.stringify(failedNodes),
      updated_at: new Date().toISOString(),
    })
  }

  async pause(stateId: string): Promise<void> {
    await this.db.updateExecutionState(stateId, {
      status: 'paused',
      paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  async resume(stateId: string): Promise<void> {
    await this.db.updateExecutionState(stateId, {
      status: 'resumed',
      resumed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  async complete(stateId: string): Promise<void> {
    await this.db.updateExecutionState(stateId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  async fail(stateId: string): Promise<void> {
    await this.db.updateExecutionState(stateId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  async getRunningExecutions(): Promise<ExecutionState[]> {
    return this.db.getExecutionStatesByStatus('running')
  }

  async getPausedExecutions(): Promise<ExecutionState[]> {
    return this.db.getExecutionStatesByStatus('paused')
  }
}
```

#### Step 3: Add database methods

```typescript
// Add to server/database/service-async.ts
async createExecutionState(data: CreateExecutionStateDTO): Promise<ExecutionState> {
  const id = generateId('exec')
  const sql = `
    INSERT INTO execution_states (
      id, execution_log_id, workflow_id, status, current_layer,
      completed_nodes, failed_nodes, node_outputs, context, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  this.db.prepare(sql).run(
    id, data.executionLogId, data.workflowId, data.status, data.currentLayer ?? 0,
    JSON.stringify(data.completedNodes ?? []),
    JSON.stringify(data.failedNodes ?? []),
    JSON.stringify(data.nodeOutputs ?? {}),
    JSON.stringify(data.context ?? {}),
    data.createdBy
  )
  return this.getExecutionStateById(id)!
}

async getExecutionStateById(id: string): Promise<ExecutionState | undefined> {
  return this.db.prepare('SELECT * FROM execution_states WHERE id = ?').get(id) as ExecutionState | undefined
}

async getExecutionStateByLogId(logId: string): Promise<ExecutionState | undefined> {
  return this.db.prepare('SELECT * FROM execution_states WHERE execution_log_id = ?').get(logId) as ExecutionState | undefined
}

async updateExecutionState(id: string, data: UpdateExecutionStateDTO): Promise<void> {
  const sets: string[] = []
  const values: unknown[] = []
  
  for (const [key, value] of Object.entries(data)) {
    sets.push(`${key} = ?`)
    values.push(value)
  }
  values.push(id)
  
  const sql = `UPDATE execution_states SET ${sets.join(', ')} WHERE id = ?`
  this.db.prepare(sql).run(...values)
}

async getExecutionStatesByStatus(status: string): Promise<ExecutionState[]> {
  return this.db.prepare('SELECT * FROM execution_states WHERE status = ?').all(status) as ExecutionState[]
}
```

**Run:** `npx vitest run server/__tests__/execution-state.test.ts`
**Expected:** PASS

**Commit:** `git add server/ && git commit -m "feat: add execution state persistence

- Add execution_states table for durable execution tracking
- Create ExecutionStateManager for state lifecycle
- Support pause/resume/complete/fail transitions
- Enable recovery of running executions after restart"`

---

## P0-3: Pause/Resume Backend

**Category:** `deep` - Workflow engine enhancement
**Skills to Load:** [`superpowers/test-driven-development`]
**Estimated Effort:** 8-10 hours
**Depends On:** P0-2

### Problem Statement
No pause/resume capability for running workflows.

### Files
- Modify: `server/services/workflow-engine.ts` (add pause/resume logic)
- Modify: `server/services/cron-scheduler.ts` (add pause/resume API)
- Create: `server/routes/execution-control.ts` (new routes)
- Test: `server/__tests__/workflow-engine-pause.test.ts`

### TDD Steps

#### Step 1: Write failing test for pause/resume

```typescript
// server/__tests__/workflow-engine-pause.test.ts
describe('WorkflowEngine pause/resume', () => {
  it('should pause execution between layers', async () => {
    const workflow = createWorkflowWithTwoLayers()
    const execution = await engine.startExecution(workflow)
    
    // Let first layer complete
    await engine.waitForLayerComplete(execution.id, 0)
    
    // Pause execution
    await engine.pauseExecution(execution.id)
    
    const state = await stateManager.getById(execution.id)
    expect(state.status).toBe('paused')
    expect(state.current_layer).toBe(1) // Next layer not started
  })

  it('should resume paused execution', async () => {
    const workflow = createWorkflowWithTwoLayers()
    const execution = await engine.startExecution(workflow)
    await engine.waitForLayerComplete(execution.id, 0)
    await engine.pauseExecution(execution.id)
    
    // Resume
    await engine.resumeExecution(execution.id)
    
    // Should complete
    await engine.waitForCompletion(execution.id)
    
    const state = await stateManager.getById(execution.id)
    expect(state.status).toBe('completed')
  })

  it('should persist partial results during pause', async () => {
    const workflow = createWorkflowWithTwoLayers()
    const execution = await engine.startExecution(workflow)
    await engine.waitForLayerComplete(execution.id, 0)
    await engine.pauseExecution(execution.id)
    
    const state = await stateManager.getById(execution.id)
    expect(JSON.parse(state.completed_nodes)).toHaveLength(2) // First layer nodes
    expect(JSON.parse(state.node_outputs)).toHaveProperty('node-1')
    expect(JSON.parse(state.node_outputs)).toHaveProperty('node-2')
  })
})
```

**Run:** `npx vitest run server/__tests__/workflow-engine-pause.test.ts`
**Expected:** FAIL

#### Step 2: Add pause/resume to WorkflowEngine

```typescript
// server/services/workflow-engine.ts
export class WorkflowEngine {
  private pauseSignals = new Map<string, AbortController>()

  async executeWorkflow(
    workflowJson: unknown,
    executionLogId?: string,
    taskExecutor?: TaskExecutor
  ): Promise<ExecutionResult> {
    // ... existing setup ...
    
    const stateManager = getExecutionStateManager()
    const executionState = await stateManager.create({
      executionLogId: executionLogId ?? generateId('exec'),
      workflowId: workflow.id,
      status: 'running',
      createdBy: this.currentUserId,
    })

    const abortController = new AbortController()
    this.pauseSignals.set(executionState.id, abortController)

    try {
      for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        // Check for pause signal
        if (abortController.signal.aborted) {
          await stateManager.pause(executionState.id)
          throw new ExecutionPausedError(`Execution ${executionState.id} paused at layer ${layerIndex}`)
        }

        await stateManager.updateExecutionState(executionState.id, {
          current_layer: layerIndex,
        })

        const layer = layers[layerIndex]
        await this.executeLayer(layer, context, executionState.id)
      }

      await stateManager.complete(executionState.id)
      return { success: true, output: context.outputs }
    } catch (error) {
      if (error instanceof ExecutionPausedError) {
        throw error // Re-throw pause errors
      }
      await stateManager.fail(executionState.id)
      throw error
    } finally {
      this.pauseSignals.delete(executionState.id)
    }
  }

  async pauseExecution(executionId: string): Promise<void> {
    const controller = this.pauseSignals.get(executionId)
    if (controller) {
      controller.abort()
    } else {
      throw new Error(`Execution ${executionId} not found or not running`)
    }
  }

  async resumeExecution(executionId: string): Promise<void> {
    const stateManager = getExecutionStateManager()
    const state = await stateManager.getById(executionId)
    
    if (!state || state.status !== 'paused') {
      throw new Error(`Execution ${executionId} not found or not paused`)
    }

    await stateManager.resume(executionId)
    
    // Reload workflow and continue from saved state
    const workflow = await this.loadWorkflow(state.workflow_id)
    const context = this.rebuildContext(state)
    
    // Continue execution from current layer
    await this.continueExecution(workflow, state, context)
  }

  private async continueExecution(
    workflow: Workflow,
    state: ExecutionState,
    context: ExecutionContext
  ): Promise<void> {
    const layers = this.buildExecutionLayers(workflow.nodes, workflow.edges)
    const startLayer = state.current_layer

    const abortController = new AbortController()
    this.pauseSignals.set(state.id, abortController)

    try {
      for (let layerIndex = startLayer; layerIndex < layers.length; layerIndex++) {
        if (abortController.signal.aborted) {
          await getExecutionStateManager().pause(state.id)
          throw new ExecutionPausedError(`Execution ${state.id} paused at layer ${layerIndex}`)
        }

        await getExecutionStateManager().updateExecutionState(state.id, {
          current_layer: layerIndex,
        })

        const layer = layers[layerIndex]
        await this.executeLayer(layer, context, state.id)
      }

      await getExecutionStateManager().complete(state.id)
    } catch (error) {
      if (error instanceof ExecutionPausedError) {
        throw error
      }
      await getExecutionStateManager().fail(state.id)
      throw error
    } finally {
      this.pauseSignals.delete(state.id)
    }
  }

  private rebuildContext(state: ExecutionState): ExecutionContext {
    return {
      outputs: JSON.parse(state.node_outputs),
      completedNodes: new Set(JSON.parse(state.completed_nodes)),
      // ... rebuild other context properties
    }
  }
}

class ExecutionPausedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExecutionPausedError'
  }
}
```

**Commit:** `git add server/ && git commit -m "feat: add pause/resume to WorkflowEngine

- Add pauseSignals map for tracking abort controllers
- Implement pauseExecution() with AbortController
- Implement resumeExecution() to continue from saved state
- Persist execution progress between pause/resume"`

---

## P0-4: Execution Controls Frontend

**Category:** `visual-engineering` - React components
**Skills to Load:** [`superpowers/test-driven-development`, `frontend-design`]
**Estimated Effort:** 6-8 hours
**Depends On:** P0-3

### Files
- Create: `src/components/workflow/ExecutionControls.tsx`
- Create: `src/components/workflow/ExecutionStatusPanel.tsx`
- Modify: `src/pages/WorkflowBuilder.tsx` (add controls)
- Modify: `src/lib/api/workflows.ts` (add control APIs)
- Test: `src/components/workflow/__tests__/ExecutionControls.test.tsx`

### Implementation

```typescript
// src/components/workflow/ExecutionControls.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Play, Pause, RotateCcw, Square } from 'lucide-react'
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution'

interface ExecutionControlsProps {
  executionId: string | null
  onStatusChange?: (status: ExecutionStatus) => void
}

type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'

export function ExecutionControls({ executionId, onStatusChange }: ExecutionControlsProps) {
  const { status, pause, resume, cancel, retry } = useWorkflowExecution(executionId)
  const [isLoading, setIsLoading] = useState(false)

  const handlePause = async () => {
    setIsLoading(true)
    try {
      await pause()
      onStatusChange?.('paused')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResume = async () => {
    setIsLoading(true)
    try {
      await resume()
      onStatusChange?.('running')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this execution? Progress will be saved but execution will stop.')) {
      return
    }
    setIsLoading(true)
    try {
      await cancel()
      onStatusChange?.('failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async () => {
    setIsLoading(true)
    try {
      await retry()
      onStatusChange?.('running')
    } finally {
      setIsLoading(false)
    }
  }

  if (!executionId) return null

  return (
    <div className="flex items-center gap-2 p-3 bg-card border rounded-lg shadow-sm">
      <span className="text-sm font-medium text-muted-foreground">Execution:</span>
      <span className="text-sm font-mono">{executionId.slice(0, 8)}...</span>
      
      <div className="w-px h-6 bg-border mx-2" />
      
      {status === 'running' && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePause}
            disabled={isLoading}
            className="gap-1"
          >
            <Pause className="w-4 h-4" />
            Pause
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
            className="gap-1"
          >
            <Square className="w-4 h-4" />
            Cancel
          </Button>
        </>
      )}

      {status === 'paused' && (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={handleResume}
            disabled={isLoading}
            className="gap-1"
          >
            <Play className="w-4 h-4" />
            Resume
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
            className="gap-1"
          >
            <Square className="w-4 h-4" />
            Cancel
          </Button>
        </>
      )}

      {(status === 'completed' || status === 'failed') && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={isLoading}
          className="gap-1"
        >
          <RotateCcw className="w-4 h-4" />
          Retry
        </Button>
      )}

      <div className="ml-auto">
        <ExecutionStatusBadge status={status} />
      </div>
    </div>
  )
}

function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const variants = {
    idle: { variant: 'secondary', label: 'Ready' },
    running: { variant: 'default', label: 'Running', pulse: true },
    paused: { variant: 'warning', label: 'Paused' },
    completed: { variant: 'success', label: 'Completed' },
    failed: { variant: 'destructive', label: 'Failed' },
  }

  const config = variants[status]

  return (
    <Badge variant={config.variant} className={cn(config.pulse && 'animate-pulse')}>
      {config.label}
    </Badge>
  )
}
```

**Commit:** `git add src/ && git commit -m "feat: add execution controls UI

- Create ExecutionControls component with play/pause/resume/cancel/retry
- Create ExecutionStatusPanel for detailed status display
- Add useWorkflowExecution hook for control operations
- Integrate controls into WorkflowBuilder page"`

---

# P1: IMPORTANT IMPROVEMENTS

## P1-7: Webhook Management UI (MISSING FEATURE - High Priority)

**Category:** `visual-engineering` - Full feature implementation
**Skills to Load:** [`superpowers/test-driven-development`, `frontend-design`, `superpowers/subagent-driven-development`]
**Estimated Effort:** 12-16 hours
**Depends On:** P0-1 (webhook notifications working)

### Problem Statement
Backend has full webhook API but NO frontend UI exists. Users cannot configure webhooks.

### Files
- Create: `src/pages/WebhookManagement.tsx` (main page)
- Create: `src/components/webhooks/WebhookList.tsx`
- Create: `src/components/webhooks/WebhookForm.tsx`
- Create: `src/components/webhooks/WebhookEventLog.tsx`
- Create: `src/components/webhooks/WebhookTestModal.tsx`
- Modify: `src/lib/api/cron.ts` (add webhook methods)
- Modify: `src/App.tsx` (add route)
- Modify: `src/components/layout/Sidebar.tsx` (add nav item)
- Test: `src/pages/__tests__/WebhookManagement.test.tsx`

### UI Design Specification

Based on UX research on webhook management patterns:

1. **Destination Management:**
   - List view with URL, event types, status (active/inactive)
   - Create/edit modal with form validation
   - Toggle to enable/disable without deletion
   - Test button for each webhook

2. **Event Visibility (Most Important):**
   - Event log table: timestamp, event type, status, response code
   - Filter by status (delivered, failed, retrying)
   - Delivery attempt history with expandable details
   - Payload inspection for debugging

3. **Manual Retry:**
   - Retry button for failed events
   - Bulk retry for selected events
   - Visual feedback on retry status

### Implementation Steps

#### Step 1: Create WebhookList component

```typescript
// src/components/webhooks/WebhookList.tsx
interface Webhook {
  id: string
  url: string
  events: string[]
  isActive: boolean
  secret?: string
  createdAt: string
  lastDelivery?: {
    timestamp: string
    status: 'success' | 'failed'
    statusCode?: number
  }
}

export function WebhookList({ webhooks, onEdit, onDelete, onToggle, onTest }: WebhookListProps) {
  return (
    <div className="space-y-4">
      {webhooks.map(webhook => (
        <Card key={webhook.id} className={cn(!webhook.isActive && 'opacity-60')}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-mono">{webhook.url}</CardTitle>
                <CardDescription>
                  Events: {webhook.events.join(', ')}
                </CardDescription>
              </div>
              <Switch
                checked={webhook.isActive}
                onCheckedChange={() => onToggle(webhook.id)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {webhook.lastDelivery ? (
                <>
                  <Badge variant={webhook.lastDelivery.status === 'success' ? 'success' : 'destructive'}>
                    {webhook.lastDelivery.status === 'success' ? 'Delivered' : 'Failed'}
                  </Badge>
                  <span>{webhook.lastDelivery.statusCode}</span>
                  <span>{formatRelativeTime(webhook.lastDelivery.timestamp)}</span>
                </>
              ) : (
                <span>Never delivered</span>
              )}
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => onTest(webhook.id)}>
              <Send className="w-4 h-4 mr-1" />
              Test
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(webhook)}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(webhook.id)} className="text-destructive">
              <Trash className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
```

#### Step 2: Create WebhookEventLog component

```typescript
// src/components/webhooks/WebhookEventLog.tsx
interface WebhookEvent {
  id: string
  webhookId: string
  eventType: string
  payload: unknown
  status: 'pending' | 'delivered' | 'failed'
  attempts: { timestamp: string; responseCode: number; responseBody: string }[]
  createdAt: string
}

export function WebhookEventLog({ events, onRetry }: WebhookEventLogProps) {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedEvents.length > 0 && (
          <Button onClick={() => onRetry(selectedEvents)}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry Selected ({selectedEvents.length})
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedEvents.length === events.length}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map(event => (
            <TableRow key={event.id}>
              <TableCell>
                <Checkbox
                  checked={selectedEvents.includes(event.id)}
                  onCheckedChange={() => toggleSelection(event.id)}
                />
              </TableCell>
              <TableCell>{formatTimestamp(event.createdAt)}</TableCell>
              <TableCell>{event.eventType}</TableCell>
              <TableCell>
                <Badge variant={event.status === 'delivered' ? 'success' : 'destructive'}>
                  {event.status}
                </Badge>
              </TableCell>
              <TableCell>{event.attempts.length}</TableCell>
              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">Details</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Event Details</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="payload">
                      <TabsList>
                        <TabsTrigger value="payload">Payload</TabsTrigger>
                        <TabsTrigger value="attempts">Attempts</TabsTrigger>
                      </TabsList>
                      <TabsContent value="payload">
                        <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </TabsContent>
                      <TabsContent value="attempts">
                        <div className="space-y-2">
                          {event.attempts.map((attempt, i) => (
                            <div key={i} className="border p-3 rounded">
                              <div className="flex justify-between text-sm">
                                <span>{formatTimestamp(attempt.timestamp)}</span>
                                <Badge>HTTP {attempt.responseCode}</Badge>
                              </div>
                              <pre className="text-xs mt-2 text-muted-foreground">
                                {attempt.responseBody}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Commit:** `git add src/ && git commit -m "feat: add webhook management UI

- Create WebhookManagement page with list, form, and event log
- Add webhook CRUD operations
- Implement event log with retry functionality
- Add webhook testing capability
- Full UI for managing webhook destinations"`

---

# P2: NICE-TO-HAVE FEATURES

## P2-1: Subworkflow / Callable Workflows

**Category:** `ultrabrain` - Complex feature
**Skills to Load:** [`superpowers/test-driven-development`, `superpowers/subagent-driven-development`]
**Estimated Effort:** 16-20 hours

### Problem Statement
No way to reuse workflows as subroutines in other workflows.

### Design

```typescript
// New node type: subworkflow
interface SubworkflowNode {
  type: 'subworkflow'
  config: {
    workflowId: string          // Reference to template
    version?: string            // Specific version or 'latest'
    inputMapping: {             // Map parent outputs to subworkflow inputs
      [parentKey: string]: string // template: "{{nodeId.output.field}}"
    }
    outputMapping: {            // Map subworkflow outputs back to parent
      [subworkflowKey: string]: string
    }
    timeout?: number            // Override default timeout
    continueOnError?: boolean   // Allow parent to continue if subworkflow fails
  }
}
```

### Implementation Approach

1. **Add subworkflow node type to WorkflowEngine**
2. **Create workflow registry** for looking up callable workflows
3. **Handle circular dependency detection**
4. **Add UI for selecting subworkflows in builder**
5. **Visual indication of subworkflow nodes**

---

## P2-2: Workflow Execution Analytics Dashboard

**Category:** `visual-engineering` - Data visualization
**Skills to Load:** [`superpowers/test-driven-development`, `frontend-design`]
**Estimated Effort:** 12-16 hours

### Features

1. **Execution Trends:**
   - Line chart: executions over time (success vs failure)
   - Bar chart: average execution duration by workflow
   - Pie chart: execution status distribution

2. **Performance Metrics:**
   - 95th percentile execution time
   - Queue wait time trends
   - Failure rate by node type

3. **Top Issues:**
   - Most failed workflows
   - Slowest nodes
   - Most common error messages

### Implementation

- Create: `src/pages/WorkflowAnalytics.tsx`
- Use: Recharts or Chart.js for visualizations
- Data: Aggregate from execution_logs and execution_log_details

---

# ATOMIC COMMIT STRATEGY

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

Fixes: <issue-reference>
```

## Type Definitions

| Type | Use For |
|------|---------|
| `feat` | New features |
| `fix` | Bug fixes |
| `refactor` | Code restructuring |
| `test` | Test additions/modifications |
| `docs` | Documentation |
| `chore` | Build/tooling changes |

## Commit Granularity

**ONE COMMIT PER:**
1. Failing test written
2. Test passing (implementation complete)
3. Integration complete
4. Bug fix

**NEVER commit:**
- Multiple features in one commit
- Tests and implementation separately (unless TDD cycle)
- Breaking changes without clear message

## Example Commit Sequence for P0-1

```bash
# Step 1: Write failing test
git add server/__tests__/cron-scheduler.test.ts
git commit -m "test(cron-scheduler): add webhook notification tests

- Test on_start, on_success, on_failure events
- Currently failing - notifications not implemented"

# Step 2: Implement fix
git add server/services/cron-scheduler.ts
git commit -m "fix(cron-scheduler): inject NotificationService

- Add notificationService to constructor
- Prepare for notification integration"

# Step 3: Add notification calls
git add server/services/cron-scheduler.ts
git commit -m "fix(cron-scheduler): add webhook notifications to executeJobTick

- Call notifyJobEvent for on_start, on_success, on_failure
- All tests passing

Fixes: webhook notifications not firing for scheduled jobs"
```

---

# QA AUTOMATION STRATEGY

## Test Levels

### 1. Unit Tests (Jest/Vitest)

**Every task MUST include:**
- Unit tests for new functions/classes
- Mock external dependencies
- >80% code coverage for new code

**Example:**
```typescript
// server/__tests__/execution-state.test.ts
it('should persist node completion', async () => {
  const state = await manager.create({ ... })
  await manager.markNodeComplete(state.id, 'node-1', { result: 'success' })
  const updated = await manager.getById(state.id)
  expect(updated.completed_nodes).toContain('node-1')
})
```

### 2. Integration Tests

**Critical paths:**
- Full workflow execution with pause/resume
- Webhook delivery end-to-end
- DLQ retry flow
- Real-time WebSocket updates

### 3. E2E Tests (Playwright)

**UI Workflows:**
- Create workflow → Execute → Monitor → Pause → Resume
- Configure webhook → Trigger job → Verify delivery
- Failed job → DLQ → Retry

**Playwright Test Example:**
```typescript
// e2e/workflow-execution.spec.ts
test('user can pause and resume workflow', async ({ page }) => {
  await page.goto('/workflows/builder')
  await page.click('[data-testid="add-node-button"]')
  await page.click('[data-testid="action-node"]')
  
  await page.click('[data-testid="execute-button"]')
  await expect(page.locator('[data-testid="execution-status"]')).toHaveText('Running')
  
  await page.click('[data-testid="pause-button"]')
  await expect(page.locator('[data-testid="execution-status"]')).toHaveText('Paused')
  
  await page.click('[data-testid="resume-button"]')
  await expect(page.locator('[data-testid="execution-status"]')).toHaveText('Running')
})
```

## Verification Checklist Per Task

### Backend Tasks
- [ ] Unit tests written and passing
- [ ] Integration tests for API endpoints
- [ ] Database migrations tested (up and down)
- [ ] No TypeScript errors (`npm run typecheck`)

### Frontend Tasks
- [ ] Component tests with React Testing Library
- [ ] Visual regression tests (where applicable)
- [ ] Accessibility tests (axe-core)
- [ ] E2E tests for critical user flows

### Before Merge
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No lint errors (`npm run lint`)
- [ ] E2E tests pass (`npx playwright test`)

---

# SUCCESS CRITERIA SUMMARY

## P0 Completion Criteria

| Feature | Verification Method |
|---------|-------------------|
| Webhook notifications | Webhook test server receives all three event types |
| Execution persistence | Restart server during execution, verify recovery |
| Pause/resume | Execute workflow, pause mid-way, resume, verify completion |
| Execution controls UI | Playwright: click pause/resume/cancel buttons, verify status |
| DLQ auto-retry | Failed task automatically retries after interval |
| Node-level WebSocket | Browser Network tab shows node_start/complete events |
| Node status display | Visual node highlighting during execution |
| Modal deduplication | Single unified selector component exists |
| Template versioning | Create v1, edit to v2, can switch between versions |
| Inline validation | Typing in form shows validation errors immediately |

## P1 Completion Criteria

| Feature | Verification Method |
|---------|-------------------|
| Real-time updates | WebSocket events update UI within 100ms |
| Job search/filter | Type in search, results filter immediately |
| Cron expression preview | Typing "0 9 * * 1-5" shows "Every weekday at 9:00 AM" |
| Timezone dropdown | Select timezone, next run time updates |
| Dependency visualization | Graph shows job dependencies as edges |
| Job tagging UI | Create tag, filter by tag, results update |
| Webhook management UI | Full CRUD operations tested in Playwright |
| Selector refactor | Only one selector component in codebase |
| Per-node-type config | Different node types show different config panels |
| Node search/filter | Type "text", only text-related nodes shown |
| Consecutive failure alerting | After 3 failures, alert is triggered |
| Continue-on-error | Workflow continues after node failure when enabled |

## P2 Completion Criteria

| Feature | Verification Method |
|---------|-------------------|
| Subworkflows | Can add subworkflow node, select workflow, execute |
| Analytics dashboard | Charts render with real data |
| Workflow templates marketplace | Can browse, preview, import templates |
| Execution replay | Can replay any past execution |
| Multi-environment | Can switch between dev/staging/prod configs |
| Custom node SDK | Third-party can create custom node type |
| Collaborative editing | Two users see each other's cursor in builder |
| AI-assisted workflow | AI suggests nodes based on description |
| Workflow versioning diff | Can compare two versions side-by-side |
| Advanced scheduling | Can set "last Friday of month" type schedules |

---

*Plan Version: 1.0*
*Created: 2026-04-04*
*Target Release: v1.4.0*
*Estimated Duration: 4-6 weeks with 2 developers*
