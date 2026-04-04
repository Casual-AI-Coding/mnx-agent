# v1.3.5 Implementation Plan: Workflow Orchestration Enhancement

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete P1 improvements in the workflow execution engine, cron scheduler, and workflow builder UI to enhance the orchestration system.

**Architecture:** 
- **Backend:** WorkflowEngine with node-level timeout/retry, parallel execution for independent nodes, and enhanced API consistency
- **Frontend:** WebSocket real-time updates, improved undo/redo, and enhanced UX

**Tech Stack:** Express + TypeScript + PostgreSQL + node-cron + React 18 + ReactFlow + Zustand + WebSocket

---

## Current Status

**v1.3.4 Completed:**
- ✅ P0-Database: Schema migrations (owner_id columns, DLQ table)
- ✅ P0-Workflow-Engine: Condition branching, Loop execution, Queue node
- ✅ P0-Cron-Scheduler: TaskExecutor integration
- ✅ P0-Frontend: TemplateSelectorModal, Undo/Redo, single state management
- ✅ P2-Service-Permissions: CRUD operations for service_node_permissions

**v1.3.5 Target:** Complete P1 tasks listed below.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| **P1-Performance** | None | Database indexes can be added independently |
| **P1-API-Consistency** | None | API improvements are independent |
| **P1-Workflow-Engine** | None | Engine enhancements build on existing code |
| **P1-Frontend-WebSocket** | None | Real-time updates feature |
| **P2-DLQ-UI** | None | Dead Letter Queue management UI |

---

## Parallel Execution Graph

**All tasks can run in parallel (no dependencies):**
- **P1-Performance:** Add composite indexes for query optimization
- **P1-API-Consistency:** PATCH endpoints, consistent naming, standardized error codes
- **P1-Workflow-Engine:** Node-level timeout/retry, parallel execution for independent nodes
- **P1-Frontend-WebSocket:** Real-time workflow execution updates
- **P2-DLQ-UI:** Frontend for dead letter queue management

---

## Tasks

### Task P1-Performance: Database Performance Optimization

**Category:** `quick` - Database index additions
**Skills:** [`superpowers/test-driven-development`]

**Files:**
- Create: `server/database/migrations/021_performance_indexes.ts`
- Modify: `server/database/migrations-async.ts` (add migration entry)

**Depends On:** None

**Description:** Add composite indexes for common query patterns to improve performance by 30-50%.

---

#### Step 1: Write migration for performance indexes

**Migration SQL (add to migrations-async.ts as migration_021):**

```sql
-- Composite indexes for owner + status queries
CREATE INDEX IF NOT EXISTS idx_task_queue_owner_status ON task_queue(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_owner_status ON execution_logs(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_owner_active ON cron_jobs(owner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_owner_public ON workflow_templates(owner_id, is_public);
CREATE INDEX IF NOT EXISTS idx_media_records_owner_type ON media_records(owner_id, type);

-- Additional indexes for common filter patterns
CREATE INDEX IF NOT EXISTS idx_task_queue_job_id ON task_queue(job_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_job_id ON execution_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_execution_log_details_log_id ON execution_log_details(log_id);
```

---

### Task P1-API-Consistency: API Standardization

**Category:** `unspecified-high` - Multiple API improvements
**Skills:** [`superpowers/test-driven-development`]

**Files:**
- Modify: `server/routes/workflows.ts`
- Modify: `server/routes/cron.ts`
- Modify: `server/routes/media.ts`
- Create: `server/middleware/api-response.ts`

**Depends On:** None

**Description:** Standardize API responses and add PATCH endpoints for partial updates.

---

#### Step 1: Create standardized API response helpers

```typescript
// server/middleware/api-response.ts
import { Response } from 'express'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function successResponse<T>(res: Response, data: T, message?: string, status = 200): void {
  const response: ApiResponse<T> = { success: true, data }
  if (message) response.message = message
  res.status(status).json(response)
}

export function errorResponse(res: Response, error: string, status = 400): void {
  res.status(status).json({ success: false, error })
}
```

#### Step 2: Add PATCH endpoints for partial updates

- `PATCH /api/workflows/:id` - Partial workflow update
- `PATCH /api/cron/jobs/:id` - Partial cron job update
- `PATCH /api/media/:id` - Partial media update

---

### Task P1-Workflow-Engine: Engine Enhancements

**Category:** `deep` - Complex workflow logic changes
**Skills:** [`superpowers/test-driven-development`]

**Files:**
- Modify: `server/services/workflow-engine.ts`
- Modify: `server/database/types.ts`

**Depends On:** None

**Description:** Add node-level timeout/retry and parallel execution for independent nodes.

---

#### Step 1: Add node-level timeout configuration

```typescript
// Add to WorkflowNode type
interface WorkflowNode {
  // ... existing fields
  timeout?: number  // Node-level timeout in seconds (default: 300)
  retryPolicy?: {
    maxRetries: number
    backoffMultiplier: number
  }
}
```

#### Step 2: Implement parallel execution for independent nodes

- Detect nodes with no dependencies in the same layer
- Execute them concurrently using Promise.all()
- Aggregate results before proceeding to next layer

---

### Task P1-Frontend-WebSocket: Real-time Updates

**Category:** `visual-engineering` - Frontend WebSocket integration
**Skills:** [`superpowers/test-driven-development`, `frontend-ui-ux`]

**Files:**
- Modify: `src/lib/websocket.ts`
- Modify: `src/pages/WorkflowBuilder.tsx`
- Modify: `src/stores/workflow.ts`

**Depends On:** None

**Description:** Add real-time workflow execution updates via WebSocket.

---

#### Step 1: Create WebSocket hook for workflow updates

```typescript
// src/hooks/useWorkflowUpdates.ts
import { useEffect } from 'react'
import { useWorkflowStore } from '@/stores/workflow'

export function useWorkflowUpdates(workflowId: string | null) {
  useEffect(() => {
    if (!workflowId) return
    
    // Subscribe to workflow execution updates
    // Update store when node status changes
  }, [workflowId])
}
```

---

### Task P2-DLQ-UI: Dead Letter Queue Management UI

**Category:** `visual-engineering` - Frontend page creation
**Skills:** [`superpowers/test-driven-development`, `frontend-ui-ux`]

**Files:**
- Create: `src/pages/DeadLetterQueue.tsx`
- Modify: `src/lib/api/cron.ts` (add DLQ API methods)
- Modify: `src/App.tsx` (add route)

**Depends On:** None

**Description:** Create frontend page for viewing and managing dead letter queue items.

---

#### Step 1: Create DLQ page with:

- List view of failed tasks
- Error message display
- Retry button for each item
- Filter by task type / date
- Bulk retry functionality

---

## Verification Checklist

- [ ] All migrations run successfully
- [ ] All API endpoints return consistent format
- [ ] Workflow engine handles timeout/retry correctly
- [ ] WebSocket updates work in real-time
- [ ] DLQ UI loads and functions correctly
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Query Performance | 30-50% improvement with new indexes |
| API Consistency | All endpoints return `{ success, data, error }` format |
| Node Execution | Support configurable timeout per node |
| Parallel Execution | Independent nodes run concurrently |
| Real-time Updates | WebSocket latency < 100ms |
| DLQ Management | Full CRUD UI for dead letter queue |

---

*Created: 2026-04-04*
*Target Version: v1.3.5*
*Status: Planning*
