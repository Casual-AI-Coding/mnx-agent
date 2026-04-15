# API Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize API responses with typed helpers and add PATCH endpoints for partial updates.

**Architecture:** Create thin typed wrappers (`successResponse`, `errorResponse`) that reduce boilerplate and add TypeScript safety. Add PATCH routes reusing existing validation schemas with all fields optional.

**Tech Stack:** Express, TypeScript, Zod validation

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Create | `server/middleware/api-response.ts` | Response helper functions |
| Modify | `server/routes/workflows.ts` | Add PATCH, integrate helpers |
| Modify | `server/routes/cron.ts` | Add PATCH, integrate helpers |
| Modify | `server/routes/media.ts` | Integrate helpers |
| Modify | `server/validation/workflow-schemas.ts` | Add `partialWorkflowSchema` alias |

---

### Task 1: Create API Response Helper Middleware

**Files:**
- Create: `server/middleware/api-response.ts`

- [ ] **Step 1: Create the helper file**

```typescript
import { Response } from 'express'

/**
 * Standard API response interface
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Send a success response with data
 */
export function successResponse<T>(
  res: Response,
  data: T,
  status = 200
): void {
  res.status(status).json({ success: true, data })
}

/**
 * Send an error response
 */
export function errorResponse(
  res: Response,
  error: string,
  status = 400
): void {
  res.status(status).json({ success: false, error })
}

/**
 * Send a created response (201 status)
 */
export function createdResponse<T>(
  res: Response,
  data: T
): void {
  successResponse(res, data, 201)
}

/**
 * Send a deleted response with optional details
 */
export function deletedResponse(
  res: Response,
  details?: Record<string, unknown>
): void {
  successResponse(res, { deleted: true, ...details })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit server/middleware/api-response.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/middleware/api-response.ts
git commit -m "feat(middleware): add API response helpers"
```

---

### Task 2: Add Partial Workflow Schema

**Files:**
- Modify: `server/validation/workflow-schemas.ts`

- [ ] **Step 1: Add partialWorkflowSchema alias**

The existing `updateWorkflowSchema` already has all fields optional. Add an alias for PATCH semantics:

```typescript
// At line 25, add:

// Alias for PATCH operations (partial updates)
export const partialWorkflowSchema = updateWorkflowSchema
```

- [ ] **Step 2: Verify schema exports correctly**

Run: `npx tsc --noEmit server/validation/workflow-schemas.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/validation/workflow-schemas.ts
git commit -m "feat(validation): add partialWorkflowSchema alias for PATCH"
```

---

### Task 3: Add PATCH Endpoint to Workflows Route

**Files:**
- Modify: `server/routes/workflows.ts`

- [ ] **Step 1: Import new helpers and schema**

Add imports at line 1-12:

```typescript
import { successResponse, errorResponse, deletedResponse } from '../middleware/api-response'
import { partialWorkflowSchema } from '../validation/workflow-schemas'
```

- [ ] **Step 2: Add PATCH route after PUT route (line 232)**

```typescript
// PATCH endpoint for partial updates
router.patch('/:id', validateParams(workflowIdParamsSchema), validate(partialWorkflowSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const userId = req.user!.userId
  const userRole = req.user!.role

  const existing = await db.getWorkflowTemplateById(req.params.id)
  if (!existing) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const hasAccess =
    existing.owner_id === userId ||
    userRole === 'super'

  if (!hasAccess) {
    errorResponse(res, 'You do not have permission to update this workflow', 403)
    return
  }

  // Only validate service permissions if nodes_json is being updated
  if (req.body.nodes_json) {
    let actionNodes: Array<{ type: string; data: { config?: { service?: string; method?: string } } }> = []
    try {
      const parsed = JSON.parse(req.body.nodes_json)
      actionNodes = (parsed.nodes || []).filter((n: { type: string }) => n.type === 'action')
    } catch {
      errorResponse(res, 'nodes_json must be valid JSON', 400)
      return
    }

    const userLevel = ROLE_HIERARCHY[userRole] ?? 0

    for (const node of actionNodes) {
      const config = node.data?.config || {}
      const { service, method } = config

      if (!service || !method) continue

      const permission = await db.getServiceNodePermission(service, method)

      if (!permission) {
        errorResponse(res, `Unknown service method: ${service}.${method}`, 400)
        return
      }

      if (!permission.is_enabled) {
        errorResponse(res, `Service method ${service}.${method} is disabled`, 403)
        return
      }

      const nodeLevel = ROLE_HIERARCHY[permission.min_role] ?? 0
      if (nodeLevel > userLevel) {
        errorResponse(res, `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`, 403)
        return
      }
    }
  }

  const workflow = await db.updateWorkflowTemplate(req.params.id, req.body)
  successResponse(res, workflow)
}))
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit server/routes/workflows.ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add server/routes/workflows.ts
git commit -m "feat(workflows): add PATCH endpoint for partial updates"
```

---

### Task 4: Integrate Helpers into Workflows Route

**Files:**
- Modify: `server/routes/workflows.ts`

- [ ] **Step 1: Replace inline responses with helpers**

Replace all `res.json({ success: true, data })` and `res.status(xxx).json({ success: false, error })` patterns:

**GET /available-actions (line 36):**
```typescript
successResponse(res, grouped)
```

**GET / (line 63-74):**
```typescript
successResponse(res, {
  workflows: result.templates,
  pagination: {
    page: pageNum,
    limit: limitNum,
    total: result.total,
    totalPages: Math.ceil(result.total / limitNum),
  },
})
```

**GET /:id (line 84-99):**
```typescript
// Line 84:
errorResponse(res, 'Workflow not found', 404)
// Line 95:
errorResponse(res, 'You do not have access to this workflow', 403)
// Line 99:
successResponse(res, workflow)
```

**POST / (line 113-160):**
```typescript
// Line 113:
errorResponse(res, 'nodes_json must be valid JSON', 400)
// Lines 128-132:
errorResponse(res, `Unknown service method: ${service}.${method}`, 400)
// Lines 136-140:
errorResponse(res, `Service method ${service}.${method} is disabled`, 403)
// Lines 145-150:
errorResponse(res, `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`, 403)
// Line 160:
createdResponse(res, workflow)
```

**PUT /:id (line 170-231):**
```typescript
// Line 170:
errorResponse(res, 'Workflow not found', 404)
// Line 179:
errorResponse(res, 'You do not have permission to update this workflow', 403)
// Line 189:
errorResponse(res, 'nodes_json must be valid JSON', 400)
// Lines 203-208:
errorResponse(res, `Unknown service method: ${service}.${method}`, 400)
// Lines 212-217:
errorResponse(res, `Service method ${service}.${method} is disabled`, 403)
// Lines 221-226:
errorResponse(res, `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`, 403)
// Line 231:
successResponse(res, workflow)
```

**DELETE /:id (line 238-242):**
```typescript
// Line 239:
errorResponse(res, 'Workflow not found', 404)
// Line 242:
deletedResponse(res)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit server/routes/workflows.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/routes/workflows.ts
git commit -m "refactor(workflows): use api-response helpers for all endpoints"
```

---

### Task 5: Add PATCH Endpoint to Cron Route

**Files:**
- Modify: `server/routes/cron.ts`

- [ ] **Step 1: Import helpers**

Add import at line 1-35:

```typescript
import { successResponse, errorResponse, deletedResponse, createdResponse } from '../middleware/api-response'
```

- [ ] **Step 2: Add PATCH route after PUT route (line 155)**

```typescript
// PATCH endpoint for partial job updates
router.patch('/jobs/:id', validateParams(cronJobIdParamsSchema), validate(updateCronJobSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const existingJob = await db.getCronJobById(req.params.id, ownerId)
  if (!existingJob) {
    errorResponse(res, 'Job not found', 404)
    return
  }
  const job = await db.updateCronJob(req.params.id, req.body, ownerId)
  
  successResponse(res, job)
}))
```

Note: `updateCronJobSchema` already supports partial updates (all fields optional).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit server/routes/cron.ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add server/routes/cron.ts
git commit -m "feat(cron): add PATCH endpoint for partial job updates"
```

---

### Task 6: Integrate Helpers into Cron Route (Selected Endpoints)

**Files:**
- Modify: `server/routes/cron.ts`

Only update health, jobs, and queue endpoints as specified.

- [ ] **Step 1: Replace responses in health endpoint (line 73-84)**

```typescript
// Line 73:
successResponse(res, health)
// Lines 75-83:
errorResponse(res, 'Health check failed', 500)
```

- [ ] **Step 2: Replace responses in jobs endpoints (lines 91-217)**

**GET /jobs (line 95):**
```typescript
successResponse(res, { jobs, total: jobs.length })
```

**POST /jobs (lines 105-130):**
```typescript
// Line 105:
errorResponse(res, 'workflow_id is required', 400)
// Line 111:
errorResponse(res, 'Workflow not found', 404)
// Line 130:
createdResponse(res, job)
```

**GET /jobs/:id (lines 138-141):**
```typescript
// Line 138:
errorResponse(res, 'Job not found', 404)
// Line 141:
successResponse(res, job)
```

**PUT /jobs/:id (lines 149-154):**
```typescript
// Line 149:
errorResponse(res, 'Job not found', 404)
// Line 154:
successResponse(res, job)
```

**DELETE /jobs/:id (lines 161-170):**
```typescript
// Line 162:
errorResponse(res, 'Job not found', 404)
// Line 170:
deletedResponse(res, { tasksDeleted: tasks.length })
```

**POST /jobs/:id/run (lines 179-192):**
```typescript
// Line 180:
errorResponse(res, 'Job not found', 404)
// Line 186:
successResponse(res, { message: 'Job triggered successfully' })
// Lines 189-192:
errorResponse(res, `Failed to execute job: ${(error as Error).message}`, 500)
```

**POST /jobs/:id/toggle (lines 203-216):**
```typescript
// Line 203:
errorResponse(res, 'Job not found', 404)
// Line 216:
successResponse(res, { job: updatedJob, scheduled: updatedJob?.is_active })
```

- [ ] **Step 3: Replace responses in queue endpoints (lines 357-428)**

**GET /queue (line 364):**
```typescript
successResponse(res, { tasks: result.tasks, total: result.total, page, limit })
```

**POST /queue (line 379):**
```typescript
successResponse(res, task)
```

**PUT /queue/:id (lines 387-395):**
```typescript
// Line 387:
errorResponse(res, 'Task not found', 404)
// Line 395:
successResponse(res, updatedTask)
```

**DELETE /queue/:id (lines 403-407):**
```typescript
// Line 403:
errorResponse(res, 'Task not found', 404)
// Line 407:
deletedResponse(res)
```

**POST /queue/:id/retry (lines 414-427):**
```typescript
// Line 414:
errorResponse(res, 'Task not found', 404)
// Line 419:
errorResponse(res, 'Only failed tasks can be retried', 400)
// Line 427:
successResponse(res, updatedTask)
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit server/routes/cron.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add server/routes/cron.ts
git commit -m "refactor(cron): use api-response helpers for health, jobs, queue endpoints"
```

---

### Task 7: Integrate Helpers into Media Route

**Files:**
- Modify: `server/routes/media.ts`

- [ ] **Step 1: Import helpers**

Add import at line 1-18:

```typescript
import { successResponse, errorResponse, deletedResponse, createdResponse } from '../middleware/api-response'
```

- [ ] **Step 2: Replace responses in core endpoints**

**GET / (lines 42-53):**
```typescript
successResponse(res, {
  records: result.records,
  pagination: {
    page: Number(page),
    limit: Number(limit),
    total: result.total,
    totalPages: Math.ceil(result.total / Number(limit)),
  }
})
```

**GET /:id (lines 62-65):**
```typescript
// Line 62:
errorResponse(res, 'Media record not found', 404)
// Line 65:
successResponse(res, record)
```

**POST / (line 72):**
```typescript
createdResponse(res, record)
```

**PUT /:id (lines 79-83):**
```typescript
// Line 80:
errorResponse(res, 'Media record not found', 404)
// Line 83:
successResponse(res, record)
```

**DELETE /batch (line 91):**
```typescript
successResponse(res, result)
```

**DELETE /:id (lines 98-102):**
```typescript
// Line 99:
errorResponse(res, 'Media record not found', 404)
// Line 102:
deletedResponse(res)
```

**POST /upload (lines 107-132):**
```typescript
// Line 107:
errorResponse(res, 'No file uploaded', 400)
// Line 132:
createdResponse(res, record)
```

**POST /upload-from-url (lines 140-165):**
```typescript
// Line 140:
errorResponse(res, 'url and type are required', 400)
// Line 165:
createdResponse(res, record)
```

**GET /:id/token (lines 170-184):**
```typescript
// Line 170:
errorResponse(res, 'Unauthorized', 401)
// Line 178:
errorResponse(res, 'Media not found', 404)
// Line 184:
successResponse(res, { downloadUrl, token })
```

**GET /:id/download (lines 191-210):**
```typescript
// Line 192:
errorResponse(res, 'Missing download token', 401)
// Line 197:
errorResponse(res, verified.error || 'Invalid token', 401)
// Line 203:
errorResponse(res, 'Token does not match media ID', 403)
// Line 209:
errorResponse(res, 'Media not found', 404)
```

**POST /batch/download (lines 225-227):**
```typescript
// Line 225:
errorResponse(res, 'No valid media found', 404)
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit server/routes/media.ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add server/routes/media.ts
git commit -m "refactor(media): use api-response helpers for all endpoints"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run TypeScript build**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 2: Run tests**

Run: `vitest run`
Expected: All tests pass

- [ ] **Step 3: Run LSP diagnostics**

Run LSP diagnostics on all modified files:
- `server/middleware/api-response.ts`
- `server/routes/workflows.ts`
- `server/routes/cron.ts`
- `server/routes/media.ts`
- `server/validation/workflow-schemas.ts`

Expected: No errors

- [ ] **Step 4: Final commit (if any remaining changes)**

```bash
git status
# If clean, no action needed
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ ApiResponse interface - Task 1
   - ✅ successResponse helper - Task 1
   - ✅ errorResponse helper - Task 1
   - ✅ PATCH /api/workflows/:id - Task 3
   - ✅ PATCH /api/cron/jobs/:id - Task 5
   - ✅ Integration into workflows.ts - Task 4
   - ✅ Integration into cron.ts - Task 6
   - ✅ Integration into media.ts - Task 7

2. **Placeholder scan:** No TBD/TODO found

3. **Type consistency:** All helper functions use same signature across tasks