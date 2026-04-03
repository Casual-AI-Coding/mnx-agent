# Database Transaction Requirements

## Overview

Some database operations span multiple tables and require transaction support to maintain data consistency.

## Operations Requiring Transactions

### 1. Workflow Creation with Permission Validation

**File:** `server/routes/workflows.ts:101-161`

**Reason:** 
- Validates permissions for each action node (multiple reads)
- Creates workflow record (write)
- If any validation fails after partial writes, data is inconsistent

**Recommended Approach:**
```typescript
await db.transaction(async (trx) => {
  // Validate all permissions
  for (const node of actionNodes) {
    const permission = await trx.getServiceNodePermission(service, method)
    // ... validation
  }
  
  // Create workflow
  const workflow = await trx.createWorkflowTemplate(data)
  return workflow
})
```

### 2. Cron Job Creation

**File:** `server/routes/cron.ts:101-118`

**Reason:**
- Validates workflow exists (read)
- Creates cron job (write)
- Schedules job (external call)
- If scheduling fails, orphan cron job remains

## Implementation Note

Current implementation uses better-sqlite3 which supports synchronous transactions. When migrating to PostgreSQL, use connection pooling with proper transaction handling.

## Next Steps

1. Add transaction wrapper to DatabaseService
2. Identify all multi-step operations
3. Wrap them in transactions
4. Add rollback tests