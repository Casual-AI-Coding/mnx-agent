# DatabaseService God Class Refactoring Proposal

**File:** `server/database/service-async.ts` (862 lines, 80+ methods)

**Goal:** Decompose into focused domain services following existing patterns.

---

## 1. Current State Analysis

### 1.1 Method Distribution by Domain

| Domain | Methods | Lines | Percentage |
|--------|---------|-------|------------|
| Cron Jobs | 10 | ~35 | 12% |
| Task Queue | 20 | ~70 | 24% |
| Execution Logs | 14 | ~50 | 17% |
| Capacity | 7 | ~25 | 9% |
| Workflow (Templates + Versions + Permissions) | 22 | ~80 | 27% |
| Media | 9 | ~35 | 11% |
| Webhooks (Configs + Deliveries) | 10 | ~45 | 12% |
| User/Audit/Permissions | 12 | ~45 | 15% |
| Dead Letter Queue | 5 | ~40 | 5% |
| Job Tags | 5 | ~15 | 6% |
| Job Dependencies | 6 | ~20 | 7% |
| System Config | 5 | ~20 | 6% |
| **Totals** | **115+** | **~460** | **100%** |

### 1.2 Problem Statement

- **Single Responsibility Principle violation**: One class handles 10+ distinct domain concerns
- **Low cohesion**: Related methods scattered throughout, unrelated methods intertwined
- **High coupling**: Every consumer depends on monolithic `DatabaseService`
- **Testing difficulty**: Cannot test domain logic in isolation
- **Maintenance burden**: Changes to one domain risk breaking others

### 1.3 Existing Domain Services Pattern

The codebase already has successful examples in `server/services/domain/`:

```
server/services/domain/
├── interfaces.ts    # IJobService, ITaskService, ILogService contracts
├── job.service.ts    # 101 lines - CronJob operations
├── task.service.ts   # 125 lines - TaskQueue operations
├── log.service.ts   # 52 lines - ExecutionLog operations
└── index.ts         # Exports
```

**Pattern:**
1. Domain service implements an interface from `interfaces.ts`
2. Domain service accepts `DatabaseService` in constructor
3. Domain service delegates data access to `DatabaseService`
4. Domain service adds business logic on top of data operations

**Current Issue:** `JobService`, `TaskService`, `LogService` are thin wrappers - most logic still lives in `DatabaseService`.

---

## 2. Proposed Service Breakdown

### 2.1 New Domain Services (7 services)

| Service | Responsibility | Methods | Target Lines |
|---------|---------------|---------|--------------|
| `JobService` | CronJob CRUD, tags, dependencies | 15 | ~120 |
| `TaskService` | TaskQueue CRUD, status transitions | 18 | ~150 |
| `LogService` | ExecutionLog CRUD, stats | 10 | ~80 |
| `MediaService` | MediaRecord CRUD, soft/hard delete | 10 | ~100 |
| `WebhookService` | WebhookConfig + WebhookDelivery | 12 | ~120 |
| `WorkflowService` | Templates, versions, permissions | 20 | ~180 |
| `CapacityService` | API quota tracking | 6 | ~60 |
| `UserService` | Audit logs, permissions, system config | 15 | ~140 |
| `DeadLetterService` | Dead letter queue operations | 6 | ~80 |

**Total: 9 domain services targeting ~100-180 lines each**

### 2.2 Remaining DatabaseService Responsibilities

After extraction, `DatabaseService` should only handle:

1. **Connection lifecycle**: `init()`, `close()`, `getConnection()`, `isConnected()`, `isPostgres()`
2. **Lazy repository initialization**: The 10 `get repo()` methods
3. **Generic SQL helpers**: `run()`, `get()`, `all()` for ad-hoc queries
4. **Delegation methods**: All methods delegating to repositories

**Target size for DatabaseService: ~100 lines**

---

## 3. File Structure

```
server/
├── database/
│   └── service-async.ts          # Refactored: ~100 lines, delegation only
│
├── services/
│   └── domain/
│       ├── interfaces.ts         # Extended: all domain interfaces
│       ├── index.ts              # Extended: export all services
│       ├── job.service.ts        # Existing: ~101 → ~120 lines
│       ├── task.service.ts       # Existing: ~125 → ~150 lines
│       ├── log.service.ts        # Existing: ~52 → ~80 lines
│       ├── media.service.ts      # NEW: ~100 lines
│       ├── webhook.service.ts    # NEW: ~120 lines
│       ├── workflow.service.ts   # NEW: ~180 lines
│       ├── capacity.service.ts   # NEW: ~60 lines
│       ├── user.service.ts       # NEW: ~140 lines
│       └── deadletter.service.ts # NEW: ~80 lines
```

---

## 4. Interface Definitions

### 4.1 IMediaService

```typescript
interface IMediaService {
  list(options: MediaListOptions): Promise<{ records: MediaRecord[]; total: number }>
  getById(id: string, ownerId?: string): Promise<MediaRecord | null>
  create(data: CreateMediaRecord, ownerId?: string): Promise<MediaRecord>
  update(id: string, data: { original_name?: string | null; metadata?: Record<string, unknown> | null }, ownerId?: string): Promise<MediaRecord | null>
  softDelete(id: string, ownerId?: string): Promise<boolean>
  hardDelete(id: string, ownerId?: string): Promise<boolean>
  softDeleteBatch(ids: string[]): Promise<{ deleted: number; failed: number }>
  getByIds(ids: string[]): Promise<MediaRecord[]>
}
```

### 4.2 IWebhookService

```typescript
interface IWebhookService {
  // Config CRUD
  createConfig(data: CreateWebhookConfig, ownerId?: string): Promise<WebhookConfig>
  getConfigById(id: string, ownerId?: string): Promise<WebhookConfig | null>
  getConfigsByJobId(jobId: string): Promise<WebhookConfig[]>
  getConfigsByOwner(ownerId: string): Promise<WebhookConfig[]>
  getAllConfigs(ownerId?: string): Promise<WebhookConfig[]>
  updateConfig(id: string, updates: UpdateWebhookConfig, ownerId?: string): Promise<WebhookConfig | null>
  deleteConfig(id: string, ownerId?: string): Promise<boolean>
  
  // Delivery tracking
  createDelivery(data: CreateWebhookDelivery, ownerId?: string): Promise<WebhookDelivery>
  getDeliveryById(id: string): Promise<WebhookDelivery | null>
  getDeliveriesByWebhook(webhookId: string, limit?: number, ownerId?: string): Promise<WebhookDelivery[]>
  getDeliveriesByExecutionLog(executionLogId: string, ownerId?: string): Promise<WebhookDelivery[]>
}
```

### 4.3 IWorkflowService

```typescript
interface IWorkflowService {
  // Templates
  getAllTemplates(ownerId?: string): Promise<WorkflowTemplate[]>
  getTemplatesPaginated(options: WorkflowListOptions): Promise<{ templates: WorkflowTemplate[]; total: number }>
  getTemplateById(id: string, ownerId?: string): Promise<WorkflowTemplate | null>
  createTemplate(template: CreateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate>
  updateTemplate(id: string, updates: UpdateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate | null>
  deleteTemplate(id: string, ownerId?: string): Promise<boolean>
  getPublicTemplates(ownerId?: string): Promise<WorkflowTemplate[]>
  
  // Versions
  createVersion(data: CreateWorkflowVersion): Promise<WorkflowVersion>
  getVersionById(id: string): Promise<WorkflowVersion | undefined>
  getVersionsByTemplate(templateId: string): Promise<WorkflowVersion[]>
  getActiveVersion(templateId: string): Promise<WorkflowVersion | undefined>
  getLatestVersionNumber(templateId: string): Promise<number>
  activateVersion(versionId: string, templateId: string): Promise<void>
  deleteVersion(id: string): Promise<void>
  saveTemplateVersion(templateId: string, nodesJson: string, edgesJson: string, changeSummary: string | null, userId: string | null): Promise<WorkflowVersion>
  
  // Permissions
  createPermission(data: { workflow_id: string; user_id: string; granted_by?: string | null }): Promise<void>
  deletePermission(workflowId: string, userId: string): Promise<void>
  hasPermission(workflowId: string, userId: string): Promise<boolean>
  getPermissions(workflowId: string): Promise<WorkflowPermission[]>
  getAvailableWorkflows(userId: string): Promise<WorkflowTemplate[]>
}
```

### 4.4 ICapacityService

```typescript
interface ICapacityService {
  getAll(): Promise<CapacityRecord[]>
  getByService(serviceType: string): Promise<CapacityRecord | null>
  upsert(serviceType: string, data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }): Promise<CapacityRecord>
  getCapacity(serviceType: string): Promise<{ remaining: number; total: number } | null>
  updateCapacity(serviceType: string, remaining: number): Promise<void>
  decrementCapacity(serviceType: string, amount?: number): Promise<CapacityRecord | null>
}
```

### 4.5 IUserService

```typescript
interface IUserService {
  // Audit logs
  createAuditLog(data: CreateAuditLog): Promise<AuditLog>
  getAuditLogById(id: string): Promise<AuditLog | null>
  getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }>
  getAuditStats(userId?: string): Promise<AuditStats>
  
  // Service node permissions
  getAllServiceNodePermissions(): Promise<ServiceNodePermission[]>
  getServiceNodePermission(serviceName: string, methodName: string): Promise<ServiceNodePermission | null>
  updateServiceNodePermission(id: string, data: { min_role?: string; is_enabled?: boolean }): Promise<void>
  upsertServiceNodePermission(data: ServiceNodePermissionInput): Promise<void>
  deleteServiceNodePermission(id: string): Promise<void>
  batchUpsertServiceNodePermissions(nodes: ServiceNodePermissionInput[]): Promise<void>
  
  // System config
  getAllSystemConfigs(): Promise<SystemConfig[]>
  getSystemConfigByKey(key: string): Promise<SystemConfig | null>
  createSystemConfig(data: CreateSystemConfig, updatedBy?: string): Promise<SystemConfig>
  updateSystemConfig(key: string, updates: UpdateSystemConfig, updatedBy?: string): Promise<SystemConfig | null>
  deleteSystemConfig(key: string): Promise<boolean>
}
```

### 4.6 IDeadLetterService

```typescript
interface IDeadLetterService {
  create(data: CreateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem>
  list(ownerId?: string, limit?: number): Promise<DeadLetterQueueItem[]>
  getById(id: string, ownerId?: string): Promise<DeadLetterQueueItem | null>
  update(id: string, data: UpdateDeadLetterQueueItem, ownerId?: string): Promise<DeadLetterQueueItem | null>
  retry(id: string, ownerId?: string): Promise<string>
  resolve(id: string, resolution: string, ownerId?: string): Promise<void>
}
```

---

## 5. Migration Strategy

### Phase 1: Create new services (No breaking changes)

1. **Create interfaces** in `interfaces.ts`
2. **Create each new service** as thin wrapper delegating to `DatabaseService`
3. **Export from `domain/index.ts`**
4. **Register in dependency container** (if exists)

**Backward compatibility:** Full - `DatabaseService` still has all methods

### Phase 2: Update consumers to use new services (No breaking changes)

1. Update services that already have domain wrappers (`JobService`, `TaskService`, `LogService`)
2. Update route handlers to use new domain services directly
3. Update business logic services (`QueueProcessor`, `TaskExecutor`, etc.)

**Backward compatibility:** Full - `DatabaseService` methods still work

### Phase 3: Remove delegation methods from DatabaseService

After all consumers migrated:

1. Remove methods that only delegate to repositories
2. Keep only: connection lifecycle, repository accessors, generic SQL helpers
3. Rename to `DatabaseConnection` or similar if appropriate

**Breaking change:** Requires all consumers to use domain services

### Phase 4: Add business logic to domain services

1. Move validation logic from route handlers into services
2. Add domain-specific error handling
3. Add computed properties/methods

---

## 6. Implementation Order (Recommended)

| Priority | Service | Reason |
|----------|---------|--------|
| 1 | `MediaService` | Media routes already use DatabaseService directly |
| 2 | `WebhookService` | Isolated domain, few dependencies |
| 3 | `CapacityService` | Simple CRUD, used by CapacityChecker |
| 4 | `WorkflowService` | Complex domain with templates/versions/permissions |
| 5 | `UserService` | Audit logs + permissions + system config |
| 6 | `DeadLetterService` | Depends on TaskService for retry |
| 7 | `JobService` | Enhance existing, add missing methods |
| 8 | `TaskService` | Enhance existing, add missing methods |
| 9 | `LogService` | Enhance existing, add missing methods |

---

## 7. Backward Compatibility Plan

### 7.1 Deprecation Strategy

1. Add `@deprecated` JSDoc comments to `DatabaseService` methods
2. Keep method signatures identical
3. Log deprecation warnings in development
4. Provide migration guide in code comments

### 7.2 Consumer Migration Map

| Consumer Type | Count | Migration Effort |
|---------------|-------|------------------|
| Route handlers | ~15 | Low - swap DatabaseService for domain service |
| Business services | ~10 | Low - constructor injection change |
| Test files | ~8 | Low - mock interface instead of concrete class |
| CLI scripts | ~2 | Low - update instantiation |

### 7.3 Data Isolation

All services must preserve owner-based data isolation:
- Every method that queries data must accept optional `ownerId?: string`
- Non-owner-filtered queries only for admin roles
- Existing pattern in `DatabaseService` must be maintained

---

## 8. Verification Checklist

- [ ] All 80+ DatabaseService methods have corresponding domain service method
- [ ] All consumers migrated to domain services
- [ ] Unit tests pass for each new domain service
- [ ] Integration tests pass for DatabaseService (remaining methods)
- [ ] No breaking changes to API contracts
- [ ] TypeScript strict mode passes
- [ ] Build succeeds

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular dependencies between services | High | Design services to depend only on DatabaseService, not each other |
| Performance regression from indirection | Medium | Keep domain services thin wrappers initially, optimize later |
| Missing error handling in new services | Medium | Add tests before removing DatabaseService fallback |
| Incomplete migration of consumers | High | Phase approach with backward-compatible intermediates |

---

## 10. Files to Modify

### Create (7 new files)
- `server/services/domain/media.service.ts`
- `server/services/domain/webhook.service.ts`
- `server/services/domain/workflow.service.ts`
- `server/services/domain/capacity.service.ts`
- `server/services/domain/user.service.ts`
- `server/services/domain/deadletter.service.ts`

### Modify (4 files)
- `server/services/domain/interfaces.ts` - Add 6 new interfaces
- `server/services/domain/index.ts` - Export 6 new services
- `server/database/service-async.ts` - Remove delegation methods (Phase 3)
- `server/database/index.ts` - Update exports

### Update Consumers (~32 files)
- Route handlers in `server/routes/`
- Business services in `server/services/`
- Tests in `server/__tests__/` and `server/services/__tests__/`
