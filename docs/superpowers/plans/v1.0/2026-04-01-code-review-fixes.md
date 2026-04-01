# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 12 issues identified in the code review for the v1.0.1 to HEAD changes.

**Architecture:** Fixes are organized by priority (P1→P2→P3). Each fix is self-contained and can be implemented independently. Changes span backend services, middleware, routes, and frontend components.

**Tech Stack:** Express, TypeScript, Zod, React, better-sqlite3, pino

---

## File Structure

### New Files
- `server/lib/csv-utils.ts` - Shared CSV conversion utility

### Modified Files
- `server/services/export-service.ts` - Fix pagination, use CSV utility
- `server/database/service.ts` - Add paginated execution logs query
- `server/middleware/audit-middleware.ts` - Error safety, fallback logging
- `server/middleware/logger-middleware.ts` - UUID request ID, lazy init
- `server/routes/stats.ts` - Move db init to handler
- `server/routes/audit.ts` - Add query validation schema
- `server/routes/templates.ts` - Cache Number() conversions
- `src/pages/TemplateLibrary.tsx` - Use Dialog for confirm
- `src/components/ui/Dialog.tsx` - Already exists, reference only

### Removed Files
- `nohup.out` - Remove from git tracking

---

## Task 1: Fix ExportService Pagination (P1)

**Files:**
- Modify: `server/database/service.ts` (add paginated query method)
- Modify: `server/services/export-service.ts` (use proper pagination)

**Problem:** `getAllExecutionLogs(undefined, limit * page)` fetches all records up to `limit * page`, then filters in memory. This wastes memory and is incorrect for large datasets.

- [ ] **Step 1: Add paginated execution logs query to DatabaseService**

In `server/database/service.ts`, find the `getAllExecutionLogs` method (around line 340) and add a new paginated version after it:

```typescript
getExecutionLogsPaginated(options: {
  limit: number
  offset: number
  startDate?: string
  endDate?: string
}): { logs: ExecutionLog[]; total: number } {
  const { limit, offset, startDate, endDate } = options
  
  const conditions: string[] = []
  const params: (string | number)[] = []
  
  if (startDate) {
    conditions.push('started_at >= ?')
    params.push(startDate)
  }
  if (endDate) {
    conditions.push('started_at <= ?')
    params.push(endDate)
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  
  const countResult = this.db.prepare(`SELECT COUNT(*) as count FROM execution_logs ${whereClause}`).get(...params) as { count: number }
  const total = countResult.count
  
  const query = `SELECT * FROM execution_logs ${whereClause} ORDER BY started_at DESC LIMIT ? OFFSET ?`
  const rows = this.db.prepare(query).all(...params, limit, offset) as ExecutionLogRow[]
  
  return {
    logs: rows.map(rowToExecutionLog),
    total,
  }
}
```

- [ ] **Step 2: Update ExportService to use paginated query**

In `server/services/export-service.ts`, replace the `exportExecutionLogs` method (lines 29-58):

```typescript
async exportExecutionLogs(options: ExportOptions): Promise<ExportResult> {
  const { format, startDate, endDate, page = 1, limit = 1000 } = options
  const offset = (page - 1) * limit

  const result = this.db.getExecutionLogsPaginated({
    limit,
    offset,
    startDate,
    endDate,
  })

  const exportData = result.logs.map(log => this.formatExecutionLog(log))

  if (format === 'csv') {
    return {
      data: this.executionLogsToCSV(exportData),
      contentType: 'text/csv',
      filename: `execution-logs-${Date.now()}.csv`,
      count: exportData.length
    }
  }

  return {
    data: JSON.stringify(exportData, null, 2),
    contentType: 'application/json',
    filename: `execution-logs-${Date.now()}.json`,
    count: exportData.length
  }
}
```

- [ ] **Step 3: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add server/database/service.ts server/services/export-service.ts
git commit -m "fix(export): use proper database pagination instead of in-memory filtering"
```

---

## Task 2: Add Audit Middleware Fallback Logging (P1)

**Files:**
- Modify: `server/middleware/audit-middleware.ts`

**Problem:** Audit log write failures are silently swallowed. Critical audit events could be lost without detection.

- [ ] **Step 1: Import pino logger**

At the top of `server/middleware/audit-middleware.ts`, add after line 3:

```typescript
import { getLogger } from '../lib/logger'
```

- [ ] **Step 2: Improve error handling in audit middleware**

Replace the try-catch block in the `res.end` monkey-patch (lines 77-102) with:

```typescript
try {
  const db = getDatabase()

  const resourceType = extractResourceType(req.path)
  const resourceId = req.params.id || req.params.jobId || null

  const requestBody = req.body && Object.keys(req.body).length > 0
    ? JSON.stringify(redactSensitiveData(req.body))
    : null

  db.createAuditLog({
    action: methodToAction(req.method),
    resource_type: resourceType,
    resource_id: resourceId,
    user_id: null,
    ip_address: req.ip || null,
    user_agent: req.get('user-agent') || null,
    request_method: req.method,
    request_path: req.originalUrl,
    request_body: requestBody,
    response_status: res.statusCode,
    duration_ms: duration,
  })
} catch (error) {
  // Fallback: write to log file if database write fails
  const logger = getLogger()
  logger.error({
    type: 'audit_log_failure',
    error: (error as Error).message,
    stack: (error as Error).stack,
    request: {
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    },
    response: {
      statusCode: res.statusCode,
      duration,
    },
  })
}
```

- [ ] **Step 3: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add server/middleware/audit-middleware.ts
git commit -m "fix(audit): add fallback logging when database write fails"
```

---

## Task 3: Fix Stats Route DB Initialization (P1)

**Files:**
- Modify: `server/routes/stats.ts`

**Problem:** `const db = getDatabase()` at module level causes race condition with service initialization.

- [ ] **Step 1: Remove module-level db initialization**

In `server/routes/stats.ts`, remove line 6:
```typescript
const db = getDatabase()
```

- [ ] **Step 2: Call getDatabase() inside each handler**

Replace the entire file content:

```typescript
import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service'

const router = Router()

router.get('/overview', asyncHandler(async (_req, res) => {
  const db = getDatabase()
  const overview = db.getExecutionStatsOverview()
  res.json({ success: true, data: overview })
}))

router.get('/success-rate', asyncHandler(async (req, res) => {
  const db = getDatabase()
  const period = (req.query.period as 'day' | 'week' | 'month') || 'day'
  const validPeriods = ['day', 'week', 'month']
  if (!validPeriods.includes(period)) {
    res.status(400).json({ success: false, error: 'Invalid period. Use day, week, or month' })
    return
  }
  const trend = db.getExecutionStatsTrend(period)
  res.json({ success: true, data: trend })
}))

router.get('/distribution', asyncHandler(async (_req, res) => {
  const db = getDatabase()
  const distribution = db.getExecutionStatsDistribution()
  res.json({ success: true, data: distribution })
}))

router.get('/errors', asyncHandler(async (req, res) => {
  const db = getDatabase()
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100)
  const errors = db.getExecutionStatsErrors(limit)
  res.json({ success: true, data: errors })
}))

export default router
```

- [ ] **Step 3: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add server/routes/stats.ts
git commit -m "fix(stats): move db initialization inside handlers to avoid race condition"
```

---

## Task 4: Extract CSV Conversion Utility (P2)

**Files:**
- Create: `server/lib/csv-utils.ts`
- Modify: `server/services/export-service.ts`

**Problem:** `executionLogsToCSV` and `mediaRecordsToCSV` are 90% duplicate code.

- [ ] **Step 1: Create shared CSV utility**

Create file `server/lib/csv-utils.ts`:

```typescript
/**
 * Convert an array of objects to CSV string
 * @param data Array of objects to convert
 * @param headers Optional explicit header order (defaults to Object.keys of first item)
 * @param formatters Optional field-specific formatters
 */
export function toCSV(
  data: Record<string, unknown>[],
  options?: {
    headers?: string[]
    formatters?: Record<string, (value: unknown) => string>
  }
): string {
  if (data.length === 0) {
    return options?.headers ? options.headers.join(',') + '\n' : ''
  }

  const headers = options?.headers ?? Object.keys(data[0])
  const formatters = options?.formatters ?? {}
  
  const csvRows = [headers.join(',')]

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      
      // Use custom formatter if provided
      if (formatters[header]) {
        return formatters[header](value)
      }
      
      // Default formatting
      const stringValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value)
      
      // Escape CSV special characters
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

/**
 * Standard CSV headers for execution logs export
 */
export const EXECUTION_LOG_HEADERS = [
  'id',
  'job_id',
  'trigger_type',
  'status',
  'started_at',
  'completed_at',
  'duration_ms',
  'tasks_executed',
  'tasks_succeeded',
  'tasks_failed',
  'error_summary',
]

/**
 * Standard CSV headers for media records export
 */
export const MEDIA_RECORD_HEADERS = [
  'id',
  'filename',
  'original_name',
  'filepath',
  'type',
  'mime_type',
  'size_bytes',
  'source',
  'task_id',
  'metadata',
  'created_at',
  'updated_at',
]
```

- [ ] **Step 2: Update ExportService to use CSV utility**

In `server/services/export-service.ts`:

1. Add import at top (line 4):
```typescript
import { toCSV, EXECUTION_LOG_HEADERS, MEDIA_RECORD_HEADERS } from '../lib/csv-utils'
```

2. Replace `executionLogsToCSV` method (lines 124-145) with:
```typescript
private executionLogsToCSV(logs: Record<string, unknown>[]): string {
  return toCSV(logs, { headers: EXECUTION_LOG_HEADERS })
}
```

3. Replace `mediaRecordsToCSV` method (lines 148-173) with:
```typescript
private mediaRecordsToCSV(records: Record<string, unknown>[]): string {
  return toCSV(records, {
    headers: MEDIA_RECORD_HEADERS,
    formatters: {
      metadata: (value) => {
        const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
        return `"${str.replace(/"/g, '""')}"`
      },
    },
  })
}
```

- [ ] **Step 3: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add server/lib/csv-utils.ts server/services/export-service.ts
git commit -m "refactor(export): extract shared CSV utility to eliminate code duplication"
```

---

## Task 5: Fix Logger Request ID Generation (P2)

**Files:**
- Modify: `server/middleware/logger-middleware.ts`

**Problem:** `Math.random()` is not cryptographically secure for correlation IDs.

- [ ] **Step 1: Replace Math.random with uuid**

In `server/middleware/logger-middleware.ts`:

1. Add import at top:
```typescript
import { v4 as uuidv4 } from 'uuid'
```

2. Replace line 8:
```typescript
const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

With:
```typescript
const requestId = uuidv4()
```

- [ ] **Step 2: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add server/middleware/logger-middleware.ts
git commit -m "fix(logger): use uuid for request ID instead of Math.random"
```

---

## Task 6: Fix Logger Middleware Lazy Initialization (P2)

**Files:**
- Modify: `server/middleware/logger-middleware.ts`

**Problem:** `const logger = getLogger()` at module level uses default config if logger not yet initialized.

- [ ] **Step 1: Remove module-level logger**

In `server/middleware/logger-middleware.ts`:

Remove line 4:
```typescript
const logger = getLogger()
```

- [ ] **Step 2: Get logger inside each function**

Replace the entire file content:

```typescript
import type { Request, Response, NextFunction } from 'express'
import { getLogger } from '../lib/logger'
import { v4 as uuidv4 } from 'uuid'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const logger = getLogger()
  const startTime = Date.now()
  const requestId = uuidv4()

  logger.info({
    type: 'request',
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  const originalEnd = res.end
  res.end = function (this: Response, ...args: Parameters<typeof res.end>) {
    const duration = Date.now() - startTime
    
    logger.info({
      type: 'response',
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
    })

    return originalEnd.apply(this, args)
  } as typeof res.end

  next()
}

export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction): void {
  const logger = getLogger()
  logger.error({
    type: 'error',
    method: req.method,
    url: req.originalUrl,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  })

  next(err)
}
```

- [ ] **Step 3: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add server/middleware/logger-middleware.ts
git commit -m "fix(logger): move logger initialization inside middleware for lazy loading"
```

---

## Task 7: Add Audit Query Validation (P2)

**Files:**
- Create: `server/validation/audit-schemas.ts`
- Modify: `server/routes/audit.ts`

**Problem:** Query parameters cast without validation, invalid values silently passed to database.

- [ ] **Step 1: Create audit validation schemas**

Create file `server/validation/audit-schemas.ts`:

```typescript
import { z } from 'zod'

export const auditActionEnum = z.enum(['create', 'update', 'delete', 'execute'])

export const listAuditLogsQuerySchema = z.object({
  action: auditActionEnum.optional(),
  resource_type: z.string().min(1).optional(),
  resource_id: z.string().min(1).optional(),
  user_id: z.string().min(1).optional(),
  response_status: z.coerce.number().int().min(100).max(599).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>
```

- [ ] **Step 2: Update audit routes to use validation**

Replace `server/routes/audit.ts` content:

```typescript
import { Router } from 'express'
import { validateQuery } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { getDatabase } from '../database/service'
import { listAuditLogsQuerySchema } from '../validation/audit-schemas'
import type { AuditAction } from '../database/types'

const router = Router()

router.get('/', validateQuery(listAuditLogsQuerySchema), asyncHandler(async (req, res) => {
  const {
    action,
    resource_type,
    resource_id,
    user_id,
    response_status,
    start_date,
    end_date,
    page,
    limit,
  } = req.query

  const result = getDatabase().getAuditLogs({
    action: action as AuditAction | undefined,
    resource_type: resource_type as string | undefined,
    resource_id: resource_id as string | undefined,
    user_id: user_id as string | undefined,
    response_status: response_status ? Number(response_status) : undefined,
    start_date: start_date as string | undefined,
    end_date: end_date as string | undefined,
    page: Number(page),
    limit: Number(limit),
  })

  const currentLimit = Number(limit)
  res.json({
    success: true,
    data: {
      logs: result.logs,
      pagination: {
        page: Number(page),
        limit: currentLimit,
        total: result.total,
        totalPages: Math.ceil(result.total / currentLimit),
      },
    },
  })
}))

router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = getDatabase().getAuditStats()
  res.json({
    success: true,
    data: stats,
  })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const log = getDatabase().getAuditLogById(req.params.id)
  if (!log) {
    res.status(404).json({ success: false, error: 'Audit log not found' })
    return
  }
  res.json({ success: true, data: log })
}))

export default router
```

- [ ] **Step 3: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add server/validation/audit-schemas.ts server/routes/audit.ts
git commit -m "fix(audit): add query validation schema for audit log endpoints"
```

---

## Task 8: Improve Audit Middleware Error Safety (P2)

**Files:**
- Modify: `server/middleware/audit-middleware.ts`

**Problem:** If `originalEnd.apply()` throws, response hangs. No guaranteed cleanup.

- [ ] **Step 1: Rewrite res.end wrapper with proper error handling**

In `server/middleware/audit-middleware.ts`, replace the `res.end` wrapper (lines 73-105) with:

```typescript
const originalEnd = res.end
res.end = function (this: Response, ...args: Parameters<typeof res.end>) {
  const duration = Date.now() - startTime

  // Attempt to write audit log, but don't let it break the response
  try {
    const db = getDatabase()

    const resourceType = extractResourceType(req.path)
    const resourceId = req.params.id || req.params.jobId || null

    const requestBody = req.body && Object.keys(req.body).length > 0
      ? JSON.stringify(redactSensitiveData(req.body))
      : null

    db.createAuditLog({
      action: methodToAction(req.method),
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: null,
      ip_address: req.ip || null,
      user_agent: req.get('user-agent') || null,
      request_method: req.method,
      request_path: req.originalUrl,
      request_body: requestBody,
      response_status: res.statusCode,
      duration_ms: duration,
    })
  } catch (error) {
    // Fallback: write to log file if database write fails
    const logger = getLogger()
    logger.error({
      type: 'audit_log_failure',
      error: (error as Error).message,
      stack: (error as Error).stack,
      request: {
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
      },
      response: {
        statusCode: res.statusCode,
        duration,
      },
    })
  }

  // Always call originalEnd, even if audit logging failed
  try {
    return originalEnd.apply(this, args)
  } catch (endError) {
    // If res.end itself fails, log and re-throw so Express can handle it
    const logger = getLogger()
    logger.error({
      type: 'response_end_error',
      error: (endError as Error).message,
      stack: (endError as Error).stack,
    })
    throw endError
  }
} as typeof res.end
```

- [ ] **Step 2: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add server/middleware/audit-middleware.ts
git commit -m "fix(audit): ensure response always completes even if audit logging fails"
```

---

## Task 9: Fix Templates Route Number() Caching (P3)

**Files:**
- Modify: `server/routes/templates.ts`

**Problem:** Repeated `Number(page)` and `Number(limit)` conversions in same handler.

- [ ] **Step 1: Cache converted values at start of GET handler**

In `server/routes/templates.ts`, replace the GET '/' handler (lines 14-36):

```typescript
router.get('/', validateQuery(listTemplatesQuerySchema), asyncHandler(async (req, res) => {
  const { category, page, limit } = req.query
  
  // Cache converted values
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  const result = getDatabase().getPromptTemplates({
    category: category as string | undefined,
    limit: limitNum,
    offset,
  })

  res.json({
    success: true,
    data: {
      templates: result.templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      }
    }
  })
}))
```

- [ ] **Step 2: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add server/routes/templates.ts
git commit -m "refactor(templates): cache Number() conversions to avoid repeated calls"
```

---

## Task 10: Fix TemplateLibrary Confirm Dialog (P3)

**Files:**
- Modify: `src/pages/TemplateLibrary.tsx`

**Problem:** Native `window.confirm` blocks modern UI flow. Should use custom Dialog component.

- [ ] **Step 1: Add confirm dialog state**

In `src/pages/TemplateLibrary.tsx`, add state after line 34 (after `selectedCategory` state):

```typescript
const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
```

- [ ] **Step 2: Replace handleDelete function**

Replace the `handleDelete` function (lines 45-54) with:

```typescript
const handleDelete = async () => {
  if (!deleteConfirm) return
  
  const success = await removeTemplate(deleteConfirm.id)
  if (success) {
    toastSuccess('删除成功', `模板 "${deleteConfirm.name}" 已删除`)
  } else {
    toastError('删除失败', '请稍后重试')
  }
  setDeleteConfirm(null)
}

const openDeleteConfirm = (id: string, name: string) => {
  setDeleteConfirm({ id, name })
}
```

- [ ] **Step 3: Add confirm dialog to JSX**

Before the closing `</div>` at the end of the component (around line 190), add:

```typescript
{/* Delete Confirmation Dialog */}
<Dialog
  open={deleteConfirm !== null}
  onClose={() => setDeleteConfirm(null)}
  title="确认删除"
  description={`确定要删除模板 "${deleteConfirm?.name}" 吗？此操作无法撤销。`}
>
  <div className="flex justify-end gap-2 mt-4">
    <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
      取消
    </Button>
    <Button variant="destructive" onClick={handleDelete}>
      删除
    </Button>
  </div>
</Dialog>
```

- [ ] **Step 4: Update delete button to use new handler**

Find the delete button onClick (around line 140) and change from:
```typescript
onClick={() => handleDelete(template.id, template.name)}
```

To:
```typescript
onClick={() => openDeleteConfirm(template.id, template.name)}
```

- [ ] **Step 5: Run TypeScript check**

Run: `cd /home/ogslp/Projects/Opencode/mnx-agent && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/TemplateLibrary.tsx
git commit -m "feat(templates): replace window.confirm with custom Dialog component"
```

---

## Task 11: Remove nohup.out from Git (P3)

**Files:**
- Remove: `nohup.out`
- Modify: `.gitignore`

**Problem:** `nohup.out` is a log file accidentally committed, should be gitignored.

- [ ] **Step 1: Add nohup.out to .gitignore**

Add to `.gitignore`:
```
# Runtime logs
nohup.out
```

- [ ] **Step 2: Remove nohup.out from git tracking**

Run: `git rm --cached nohup.out`

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: remove nohup.out from git tracking and add to gitignore"
```

---

## Summary

| Task | Priority | Files Changed | Est. Time |
|------|----------|---------------|-----------|
| 1. ExportService pagination | P1 | 2 files | 15 min |
| 2. Audit fallback logging | P1 | 1 file | 10 min |
| 3. Stats route db init | P1 | 1 file | 5 min |
| 4. CSV utility extraction | P2 | 2 files | 20 min |
| 5. Logger request ID | P2 | 1 file | 5 min |
| 6. Logger lazy init | P2 | 1 file | 10 min |
| 7. Audit query validation | P2 | 2 files | 15 min |
| 8. Audit error safety | P2 | 1 file | 15 min |
| 9. Templates Number() cache | P3 | 1 file | 5 min |
| 10. TemplateLibrary dialog | P3 | 1 file | 15 min |
| 11. Remove nohup.out | P3 | 2 files | 3 min |

**Total estimated time:** ~2 hours

---

## Self-Review Checklist

- [x] All 12 issues from code review have corresponding tasks
- [x] No placeholders - all steps contain actual code
- [x] Type consistency - function names match across tasks
- [x] File paths are exact
- [x] Commands have expected output documented