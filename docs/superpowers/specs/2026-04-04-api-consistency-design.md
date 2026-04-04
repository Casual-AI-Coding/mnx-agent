# API Consistency Design Spec

**Date**: 2026-04-04  
**Status**: Draft  
**Scope**: P1-API-Consistency

## Summary

Standardize API responses across all routes with typed helpers and add PATCH endpoints for partial updates.

## Current State

- Routes already use `{ success: true, data }` / `{ success: false, error }` pattern
- `errorHandler.ts` has `handleApiError()` helper but routes don't use it
- No PATCH for `/api/workflows/:id` (only PUT requires all fields)
- No PATCH for `/api/cron/jobs/:id` (only PUT exists)

## Design

### 1. API Response Helper Middleware

**File**: `server/middleware/api-response.ts`

```typescript
import { Response } from 'express'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export function successResponse<T>(
  res: Response,
  data: T,
  status = 200
): void {
  res.status(status).json({ success: true, data })
}

export function errorResponse(
  res: Response,
  error: string,
  status = 400
): void {
  res.status(status).json({ success: false, error })
}

// Convenience for created resources
export function createdResponse<T>(
  res: Response,
  data: T
): void {
  successResponse(res, data, 201)
}

// Convenience for deleted resources
export function deletedResponse(
  res: Response,
  details?: Record<string, unknown>
): void {
  successResponse(res, { deleted: true, ...details })
}
```

### 2. PATCH Endpoints

#### PATCH /api/workflows/:id

**File**: `server/routes/workflows.ts`

Add PATCH route that accepts partial updates:

```typescript
router.patch('/:id', validateParams(workflowIdParamsSchema), validate(partialWorkflowSchema), asyncHandler(async (req, res) => {
  // Same logic as PUT but only validates provided fields
}))
```

**Validation**: Create `partialWorkflowSchema` where all fields optional:
- `name` - optional string
- `description` - optional string  
- `nodes_json` - optional valid JSON (if provided)
- `edges_json` - optional valid JSON (if provided)
- `is_public` - optional boolean

#### PATCH /api/cron/jobs/:id

**File**: `server/routes/cron.ts`

Add PATCH route mirroring PUT behavior:
- Reuse `updateCronJobSchema` (already has optional fields)
- Route to same update logic

### 3. Integration Targets

Replace inline `res.json({ success: true, data })` with helpers in:

| Route File | Endpoints to Update |
|------------|---------------------|
| `workflows.ts` | GET /, GET /:id, POST /, PUT /:id, DELETE /:id |
| `cron.ts` | GET /health, GET /jobs, POST /jobs, GET /jobs/:id, PUT /jobs/:id, DELETE /jobs/:id |
| `media.ts` | GET /, GET /:id, POST /, PUT /:id, DELETE /:id, POST /upload |

**Not modifying**: GET/POST/DELETE behavior (as specified in MUST NOT DO).

### 4. Files Changed

| Action | File |
|--------|------|
| Create | `server/middleware/api-response.ts` |
| Modify | `server/routes/workflows.ts` |
| Modify | `server/routes/cron.ts` |
| Modify | `server/routes/media.ts` |
| Modify | `server/validation/workflow-schemas.ts` (add partial schema) |

## Verification

1. TypeScript build passes: `npm run build`
2. All existing tests pass: `vitest run`
3. LSP diagnostics clean on modified files

## Non-Goals

- Not changing HTTP status codes (already correct)
- Not adding response metadata/pagination helpers (overengineering)
- Not modifying GET/POST/DELETE behavior
- Not breaking existing API contracts