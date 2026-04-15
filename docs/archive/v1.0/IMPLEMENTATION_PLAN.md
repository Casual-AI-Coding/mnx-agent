# Cron Task Management System - Implementation Plan

## Executive Summary

This document outlines a production-ready implementation plan for a comprehensive cron task management system with visual drag-and-drop workflow orchestration for the MiniMax AI toolset application.

## Context

**Existing Architecture:**
- Backend: Express.js (port 4511) with 9 route modules
- Frontend: React 18 + Vite with Zustand stores and Tailwind CSS
- MiniMaxClient: Singleton pattern with 16 API methods (text, voice, image, music, video, file operations)
- **NO database currently exists**

**User Requirements (P8 Tech Lead):**
1. Cron Task Management with cron expressions
2. Visual Drag-and-Drop Workflow Builder
3. Task Composition (multi-feature pipelines)
4. Capacity-Aware Execution (check MiniMax balance before executing)
5. Database-Backed Task Queue with status tracking
6. Comprehensive design documentation

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| T1 | None | Database foundation, no prerequisites |
| T2 | T1 | Cron scheduler requires DB to persist jobs |
| T3 | T1 | Task executor requires DB for task storage |
| T4 | T1 | Capacity checker needs DB for quota tracking |
| T5 | T3, T4 | Queue processor depends on both executor and capacity checker |
| T6 | T1 | Workflow engine depends on DB for job definitions |
| T7 | T1 | API routes need DB layer for data access |
| T8 | T2, T6, T7 | Backend integration requires all backend services |
| T9 | None | Frontend store can be built independently |
| T10 | None | Workflow components can be developed in parallel |
| T11 | T9, T10 | Cron Management page requires both store and components |
| T12 | T8, T11 | Full integration testing requires complete system |
| T13 | T12 | Documentation requires working implementation |

---

## Parallel Execution Graph

### Wave 1 (Start Immediately - No Dependencies)
```
├── T1: Database Service & Schema (backend foundation)
├── T9: Zustand Store & Types (frontend foundation)
├── T10: Workflow Node Components (UI components)
└── T14: Package Dependencies Installation (infra)
```

### Wave 2 (After Wave 1 Database Complete)
```
├── T2: Cron Scheduler Service
├── T3: Task Executor Service
├── T4: Capacity Checker Service
├── T6: Workflow Engine
└── T7: API Routes & Validation
```

### Wave 3 (After Wave 2 Complete)
```
├── T5: Queue Processor Service
├── T8: Backend Service Integration
└── T15: Frontend API Client
```

### Wave 4 (After Wave 3 Complete)
```
├── T11: Cron Management Page
├── T16: Workflow Builder Page
├── T17: Task Queue Monitor Page
└── T18: Execution Logs Page
```

### Wave 5 (After Wave 4 Complete)
```
├── T12: Integration Testing
├── T13: Documentation
└── T19: Router & Navigation Updates
```

**Critical Path:** T1 → T2 → T8 → T11 → T12 → T13
**Estimated Parallel Speedup:** ~45% faster than sequential execution

---

## Tasks

### Task 1: Database Service & Schema (Foundation)

**Description:** 
Initialize SQLite database with complete schema, migrations system, and CRUD service layer.

**Files to Create:**
- `server/db/index.ts` - Database connection and initialization
- `server/db/migrations/001_initial_schema.sql` - Initial schema
- `server/db/migrations/002_add_indexes.sql` - Performance indexes
- `server/services/databaseService.ts` - CRUD operations for all tables
- `server/db/types.ts` - TypeScript interfaces for database entities

**Exact Database Schema:**
```sql
-- Cron job definitions
cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'Asia/Shanghai',
  is_active BOOLEAN DEFAULT 1,
  workflow_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_run_at DATETIME,
  next_run_at DATETIME,
  total_runs INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  max_concurrent_tasks INTEGER DEFAULT 5,
  priority INTEGER DEFAULT 0
)

-- Task queue entries
task_queue (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES cron_jobs(id),
  task_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  execution_order INTEGER,
  parent_task_id TEXT REFERENCES task_queue(id)
)

-- Execution logs
execution_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES cron_jobs(id),
  trigger_type TEXT,
  status TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  duration_ms INTEGER,
  tasks_executed INTEGER,
  tasks_succeeded INTEGER,
  tasks_failed INTEGER,
  error_summary TEXT,
  log_detail TEXT
)

-- Capacity tracking
capacity_tracking (
  id TEXT PRIMARY KEY,
  service_type TEXT NOT NULL,
  remaining_quota INTEGER,
  total_quota INTEGER,
  unit_cost INTEGER,
  reset_at DATETIME,
  last_checked_at DATETIME,
  quota_type TEXT
)

-- Workflow execution state
workflow_executions (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES cron_jobs(id),
  execution_log_id TEXT REFERENCES execution_logs(id),
  node_states TEXT,
  current_node_id TEXT,
  context_data TEXT,
  status TEXT,
  started_at DATETIME,
  completed_at DATETIME
)
```

**Delegation Recommendation:**
- Category: `deep` - Requires careful database design and migration strategy
- Skills: [`git-master`] - For proper database migration versioning

**Skills Evaluation:**
- INCLUDED `git-master`: Database migrations need versioning
- OMITTED `playwright`: No browser automation needed for DB work
- OMITTED `frontend-ui-ux`: Backend database work

**Depends On:** None

**Acceptance Criteria:**
- [ ] Database initializes on server startup
- [ ] All tables created with proper constraints
- [ ] Migrations run automatically
- [ ] CRUD operations tested for each entity
- [ ] Connection pooling handles concurrent access
- [ ] Foreign key constraints enforced

---

### Task 2: Cron Scheduler Service

**Description:**
Implement node-cron based scheduler with database persistence, timezone support, and manual trigger capability.

**Files to Create:**
- `server/services/cronScheduler.ts` - Main scheduler service
- `server/services/cronScheduler.test.ts` - Unit tests
- `server/lib/cronParser.ts` - Cron expression utilities
- `server/types/cron.ts` - TypeScript types

**Key Implementation Details:**
```typescript
// CronScheduler class structure
class CronScheduler {
  private jobs: Map<string, CronJob>
  private db: DatabaseService
  
  // Methods:
  - initialize(): Promise<void> // Load active jobs from DB
  - createJob(jobDef: CronJobDefinition): Promise<void>
  - updateJob(id: string, updates: Partial<CronJobDefinition>): Promise<void>
  - deleteJob(id: string): Promise<void>
  - toggleJob(id: string, active: boolean): Promise<void>
  - runJobNow(id: string): Promise<void> // Manual trigger
  - getNextRunTime(cronExpr: string, timezone: string): Date
  - stopAll(): Promise<void>
}
```

**Packages to Install:**
```bash
npm install node-cron cronstrue cron-parser
npm install -D @types/node-cron
```

**Delegation Recommendation:**
- Category: `deep` - Scheduler requires careful state management
- Skills: [`git-master`] - For atomic commits of scheduler changes

**Depends On:** T1

**Acceptance Criteria:**
- [ ] Loads all active jobs on startup
- [ ] Creates cron jobs from database records
- [ ] Handles timezone correctly (Asia/Shanghai default)
- [ ] Manual trigger executes immediately
- [ ] Updates next_run_at on each execution
- [ ] Graceful shutdown stops all jobs
- [ ] Persists job state across restarts

---

### Task 3: Task Executor Service

**Description:**
Service to execute individual MiniMax API tasks with retry logic, result storage, and error handling.

**Files to Create:**
- `server/services/taskExecutor.ts` - Main executor service
- `server/services/taskExecutor.test.ts` - Unit tests
- `server/types/tasks.ts` - Task type definitions
- `server/lib/taskResultHandler.ts` - Result processing utilities

**Task Type Mapping:**
```typescript
const TASK_TYPE_HANDLERS = {
  'text': MiniMaxClient.chatCompletion,
  'voice_sync': MiniMaxClient.textToAudioSync,
  'voice_async': MiniMaxClient.textToAudioAsync,
  'image': MiniMaxClient.imageGeneration,
  'music': MiniMaxClient.musicGeneration,
  'video': MiniMaxClient.videoGeneration,
}
```

**Execution Flow:**
1. Receive task from queue
2. Parse payload parameters
3. Validate parameters against schema
4. Call appropriate MiniMaxClient method
5. Store result or error
6. Update task status

**Delegation Recommendation:**
- Category: `deep` - Task execution needs robust error handling
- Skills: [`git-master`]

**Depends On:** T1

**Acceptance Criteria:**
- [ ] Executes all 6 task types correctly
- [ ] Validates payload before execution
- [ ] Implements exponential backoff retry
- [ ] Stores results in database
- [ ] Handles partial failures (async tasks)
- [ ] Logs execution metrics
- [ ] Supports cancellation

---

### Task 4: Capacity Checker Service

**Description:**
Service to check MiniMax API capacity (getBalance) and track quota usage across services.

**Files to Create:**
- `server/services/capacityChecker.ts` - Capacity monitoring
- `server/services/capacityChecker.test.ts` - Unit tests
- `server/lib/costCalculator.ts` - API cost estimation
- `server/config/capacity.ts` - Service capacity configs

**Capacity Check Strategy:**
```typescript
interface CapacityStatus {
  serviceType: 'text' | 'voice' | 'image' | 'music' | 'video'
  remainingQuota: number
  totalQuota: number
  canExecute: (estimatedCost: number) => boolean
  estimatedTasks: number // How many tasks can still run
}
```

**Cost Estimation per Service:**
- Text: tokens used (from response)
- Voice: characters in text
- Image: number of images × resolution factor
- Music: duration in seconds
- Video: duration in seconds

**Delegation Recommendation:**
- Category: `deep` - Capacity calculation requires understanding MiniMax pricing
- Skills: [`git-master`]

**Depends On:** T1

**Acceptance Criteria:**
- [ ] Calls getBalance API on schedule
- [ ] Caches capacity for 60 seconds
- [ ] Estimates cost for each task type
- [ ] Returns capacity status per service
- [ ] Updates capacity after each execution
- [ ] Alerts on low capacity

---

### Task 5: Queue Processor Service

**Description:**
Service to pull tasks from queue, check capacity, and execute sequentially until capacity exhausted.

**Files to Create:**
- `server/services/queueProcessor.ts` - Main processor
- `server/services/queueProcessor.test.ts` - Unit tests
- `server/lib/queueBatch.ts` - Batch processing logic

**Processing Algorithm:**
```typescript
async processQueue(jobId: string): Promise<ProcessResult> {
  const tasks = await this.db.getPendingTasks(jobId, limit)
  const results: TaskResult[] = []
  
  for (const task of tasks) {
    const capacity = await this.capacityChecker.check(task.taskType)
    const estimatedCost = this.costCalculator.estimate(task)
    
    if (!capacity.canExecute(estimatedCost)) {
      results.push({ task, status: 'skipped_capacity' })
      break // Stop processing until capacity available
    }
    
    const result = await this.taskExecutor.execute(task)
    results.push(result)
    
    // Update capacity after execution
    await this.capacityChecker.updateAfterExecution(task, result)
  }
  
  return { processed: results.length, results }
}
```

**Delegation Recommendation:**
- Category: `deep` - Queue orchestration requires careful sequencing
- Skills: [`git-master`]

**Depends On:** T3, T4

**Acceptance Criteria:**
- [ ] Processes tasks in priority order
- [ ] Respects capacity limits
- [ ] Stops when capacity exhausted
- [ ] Handles task dependencies
- [ ] Updates execution logs
- [ ] Supports batch processing
- [ ] Graceful error recovery

---

### Task 6: Workflow Engine

**Description:**
Core engine to parse workflow JSON, execute nodes in order, handle data flow between nodes, and manage execution state.

**Files to Create:**
- `server/services/workflowEngine.ts` - Main engine
- `server/services/workflowEngine.test.ts` - Unit tests
- `server/lib/workflowParser.ts` - JSON to execution graph
- `server/lib/workflowNodes.ts` - Node implementations
- `server/types/workflow.ts` - Workflow type definitions

**Workflow Node Types:**
```typescript
type WorkflowNode = 
  | TriggerNode
  | ActionNode
  | ConditionNode
  | QueueNode
  | TransformNode
  | LoopNode

interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  metadata: {
    name: string
    description?: string
    version: string
  }
}
```

**Node Execution:**
1. Trigger: Cron-based or manual
2. Action: Call MiniMax API (mapped to task types)
3. Condition: Check capacity/balance
4. Queue: Pull N tasks from task_queue
5. Transform: Map output to input format
6. Loop: Repeat until condition met

**Delegation Recommendation:**
- Category: `ultrabrain` - Most complex component, requires deep graph traversal logic
- Skills: [`git-master`]

**Depends On:** T1

**Acceptance Criteria:**
- [ ] Parses valid workflow JSON
- [ ] Executes nodes in dependency order
- [ ] Passes data between connected nodes
- [ ] Handles conditional branches
- [ ] Supports loops with break conditions
- [ ] Persists execution state
- [ ] Validates workflow before execution
- [ ] Provides detailed error context

---

### Task 7: API Routes & Validation

**Description:**
Express routes for cron management with Zod validation schemas.

**Files to Create:**
- `server/routes/cron.ts` - Main cron routes
- `server/routes/cron.test.ts` - Route tests
- `server/validation/cronSchemas.ts` - Zod schemas
- `server/middleware/cronAuth.ts` - Route protection

**API Endpoints:**
```typescript
// Jobs
GET    /api/cron/jobs                    // List all jobs
POST   /api/cron/jobs                    // Create new job
GET    /api/cron/jobs/:id                // Get job details
PUT    /api/cron/jobs/:id                // Update job
DELETE /api/cron/jobs/:id                // Delete job
POST   /api/cron/jobs/:id/run            // Manual trigger
POST   /api/cron/jobs/:id/toggle         // Activate/deactivate
POST   /api/cron/jobs/:id/duplicate      // Clone job

// Queue
GET    /api/cron/queue                   // List tasks
POST   /api/cron/queue                   // Add manual task
GET    /api/cron/queue/:id               // Get task details
PUT    /api/cron/queue/:id/retry         // Retry failed task
DELETE /api/cron/queue/:id               // Cancel pending task

// Logs
GET    /api/cron/logs                    // List execution logs
GET    /api/cron/logs/:id                // Get log details
GET    /api/cron/logs/:id/export         // Export as JSON/CSV

// Capacity
GET    /api/cron/capacity                // Current capacity status
GET    /api/cron/capacity/:serviceType   // Service-specific capacity

// Workflow
POST   /api/cron/workflow/validate       // Validate workflow JSON
POST   /api/cron/workflow/simulate       // Simulate execution
```

**Delegation Recommendation:**
- Category: `deep` - REST API design requires careful validation
- Skills: [`git-master`]

**Depends On:** T1

**Acceptance Criteria:**
- [ ] All endpoints return proper HTTP status
- [ ] Zod validation on all inputs
- [ ] Consistent error response format
- [ ] Pagination on list endpoints
- [ ] Filtering and sorting support
- [ ] Rate limiting applied
- [ ] Request logging

---

### Task 8: Backend Service Integration

**Description:**
Wire all backend services together in the Express app with proper initialization order.

**Files to Modify:**
- `server/index.ts` - Add cron service initialization
- `server/services/index.ts` - Service exports
- `server/lib/shutdown.ts` - Graceful shutdown handler

**Initialization Order:**
1. Database connection
2. Capacity checker (initial fetch)
3. Cron scheduler (load jobs)
4. Workflow engine
5. Queue processor
6. Express routes

**Shutdown Order:**
1. Stop accepting new requests
2. Stop cron scheduler
3. Wait for running tasks to complete (timeout: 30s)
4. Close database connection

**Delegation Recommendation:**
- Category: `deep` - Service orchestration requires careful sequencing
- Skills: [`git-master`]

**Depends On:** T2, T6, T7

**Acceptance Criteria:**
- [ ] Services initialize in correct order
- [ ] Dependencies injected properly
- [ ] Graceful shutdown works
- [ ] Error in one service doesn't crash others
- [ ] Health check endpoint available

---

### Task 9: Frontend Store & Types

**Description:**
Zustand stores for cron management with proper TypeScript types.

**Files to Create:**
- `src/stores/cron.ts` - Main cron store
- `src/stores/cronQueue.ts` - Queue management store
- `src/stores/cronLogs.ts` - Execution logs store
- `src/types/cron.ts` - TypeScript interfaces

**Store Structure:**
```typescript
interface CronStore {
  jobs: CronJob[]
  selectedJob: CronJob | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchJobs: () => Promise<void>
  createJob: (job: CreateJobInput) => Promise<void>
  updateJob: (id: string, updates: UpdateJobInput) => Promise<void>
  deleteJob: (id: string) => Promise<void>
  toggleJob: (id: string) => Promise<void>
  runJobNow: (id: string) => Promise<void>
  selectJob: (job: CronJob | null) => void
}
```

**Delegation Recommendation:**
- Category: `unspecified-low` - Frontend state management is straightforward
- Skills: [] - No specialized skills needed

**Depends On:** None

**Acceptance Criteria:**
- [ ] Stores are type-safe
- [ ] Actions handle loading/error states
- [ ] Optimistic updates for UI responsiveness
- [ ] Persistence where needed
- [ ] DevTools integration

---

### Task 10: Workflow Node Components

**Description:**
React components for each workflow node type using @xyflow/react.

**Files to Create:**
- `src/components/workflow/nodes/TriggerNode.tsx`
- `src/components/workflow/nodes/TextActionNode.tsx`
- `src/components/workflow/nodes/VoiceSyncActionNode.tsx`
- `src/components/workflow/nodes/VoiceAsyncActionNode.tsx`
- `src/components/workflow/nodes/ImageActionNode.tsx`
- `src/components/workflow/nodes/MusicActionNode.tsx`
- `src/components/workflow/nodes/VideoActionNode.tsx`
- `src/components/workflow/nodes/ConditionNode.tsx`
- `src/components/workflow/nodes/QueueNode.tsx`
- `src/components/workflow/nodes/TransformNode.tsx`
- `src/components/workflow/nodes/LoopNode.tsx`
- `src/components/workflow/nodes/index.ts` - Exports
- `src/components/workflow/NodePalette.tsx` - Left sidebar
- `src/components/workflow/NodeConfigPanel.tsx` - Right panel

**Node Component Structure:**
```typescript
interface NodeProps {
  id: string
  data: NodeData
  selected: boolean
}

interface NodeData {
  label: string
  type: NodeType
  config: Record<string, unknown>
  onConfigChange: (config: Record<string, unknown>) => void
}
```

**Delegation Recommendation:**
- Category: `visual-engineering` - Complex UI components
- Skills: [`frontend-ui-ux`] - For professional UI design

**Depends On:** None

**Acceptance Criteria:**
- [ ] Each node has unique visual appearance
- [ ] Input/output handles properly positioned
- [ ] Configuration forms validate inputs
- [ ] Nodes can be dragged from palette
- [ ] Node deletion works correctly
- [ ] Node selection highlights properly

---

### Task 11: Cron Management Page

**Description:**
Main cron management page with jobs list, status indicators, and quick actions.

**Files to Create:**
- `src/pages/CronManagement.tsx` - Main page
- `src/components/cron/JobsTable.tsx` - Jobs list table
- `src/components/cron/JobStatusBadge.tsx` - Status indicators
- `src/components/cron/JobActions.tsx` - Action buttons
- `src/components/cron/CronExpressionInput.tsx` - Cron input with validation

**Page Features:**
- Table with: Name, Status, Cron Expression, Last Run, Next Run, Success Rate
- Quick actions: Run Now, Toggle, Edit, Delete
- Filters: Active/Inactive, Search by name
- Pagination
- Bulk operations

**Delegation Recommendation:**
- Category: `visual-engineering` - Data-heavy UI
- Skills: [`frontend-ui-ux`]

**Depends On:** T9, T10

**Acceptance Criteria:**
- [ ] Displays all jobs with status
- [ ] Real-time status updates
- [ ] Sort by any column
- [ ] Filter by status/name
- [ ] Actions have confirmation dialogs
- [ ] Empty state for no jobs

---

### Task 12: Integration Testing

**Description:**
Comprehensive integration tests covering end-to-end workflows.

**Files to Create:**
- `server/__tests__/integration/cron.test.ts` - API integration
- `server/__tests__/integration/workflow.test.ts` - Workflow execution
- `server/__tests__/integration/capacity.test.ts` - Capacity management
- `src/__tests__/integration/cron.e2e.test.tsx` - Frontend E2E

**Test Scenarios:**
1. Create job → Schedule runs → Execute tasks → Log results
2. Capacity exhausted → Queue stops → Capacity restored → Resume
3. Workflow with multiple nodes → Data flows correctly
4. Retry failed tasks → Success on retry
5. Manual trigger → Immediate execution

**Delegation Recommendation:**
- Category: `deep` - Testing requires understanding full system
- Skills: [`playwright`] - For E2E testing

**Depends On:** T8, T11

**Acceptance Criteria:**
- [ ] All API endpoints tested
- [ ] Workflow execution paths covered
- [ ] Error scenarios tested
- [ ] Capacity management tested
- [ ] Frontend interactions tested
- [ ] >80% code coverage

---

### Task 13: Documentation

**Description:**
Comprehensive documentation including architecture, API reference, and user guide.

**Files to Create:**
- `docs/ARCHITECTURE.md` - System architecture
- `docs/API_REFERENCE.md` - API documentation
- `docs/WORKFLOW_BUILDER.md` - User guide for workflow builder
- `docs/DATABASE_SCHEMA.md` - Database documentation
- `docs/DEPLOYMENT.md` - Deployment guide

**Documentation Structure:**
```
docs/
├── ARCHITECTURE.md
│   ├── Overview
│   ├── Component Diagram
│   ├── Data Flow
│   └── Technology Choices
├── API_REFERENCE.md
│   ├── Authentication
│   ├── Endpoints
│   ├── Request/Response Examples
│   └── Error Codes
├── WORKFLOW_BUILDER.md
│   ├── Getting Started
│   ├── Node Types
│   ├── Creating Workflows
│   └── Best Practices
└── DATABASE_SCHEMA.md
    ├── Entity Relationship Diagram
    ├── Table Definitions
    └── Migration Guide
```

**Delegation Recommendation:**
- Category: `writing` - Documentation is writing task
- Skills: [] - No specialized skills needed

**Depends On:** T12

**Acceptance Criteria:**
- [ ] Architecture diagrams created
- [ ] All API endpoints documented
- [ ] Code examples provided
- [ ] Deployment steps documented
- [ ] Troubleshooting guide included

---

### Task 14: Package Dependencies Installation

**Description:**
Install all required npm packages for cron system.

**Packages to Install:**

**Backend:**
```bash
npm install better-sqlite3 node-cron cronstrue cron-parser uuid
npm install -D @types/better-sqlite3 @types/node-cron @types/uuid
```

**Frontend:**
```bash
npm install @xyflow/react zod
```

**Delegation Recommendation:**
- Category: `quick` - Simple package installation
- Skills: []

**Depends On:** None

**Acceptance Criteria:**
- [ ] All packages install without errors
- [ ] TypeScript types resolved
- [ ] No peer dependency warnings

---

### Task 15: Frontend API Client

**Description:**
TypeScript API client for cron endpoints with proper error handling.

**Files to Create:**
- `src/lib/api/cron.ts` - Cron API client
- `src/lib/api/cronQueue.ts` - Queue API client
- `src/lib/api/cronLogs.ts` - Logs API client
- `src/lib/api/cronCapacity.ts` - Capacity API client

**API Client Structure:**
```typescript
export const cronApi = {
  getJobs: (params?: ListParams) => Promise<PaginatedResponse<CronJob>>
  createJob: (job: CreateJobInput) => Promise<CronJob>
  updateJob: (id: string, updates: UpdateJobInput) => Promise<CronJob>
  deleteJob: (id: string) => Promise<void>
  runJob: (id: string) => Promise<void>
  toggleJob: (id: string) => Promise<void>
  validateWorkflow: (workflow: WorkflowGraph) => Promise<ValidationResult>
}
```

**Delegation Recommendation:**
- Category: `unspecified-low` - API client is straightforward
- Skills: []

**Depends On:** T8

**Acceptance Criteria:**
- [ ] All endpoints covered
- [ ] Error handling with toast notifications
- [ ] Request/response types defined
- [ ] Loading states handled

---

### Task 16: Workflow Builder Page

**Description:**
Visual workflow builder page with drag-and-drop canvas.

**Files to Create:**
- `src/pages/WorkflowBuilder.tsx` - Main builder page
- `src/components/workflow/WorkflowCanvas.tsx` - React Flow canvas
- `src/components/workflow/WorkflowToolbar.tsx` - Toolbar actions
- `src/components/workflow/WorkflowValidator.tsx` - Validation display

**Features:**
- Drag nodes from palette to canvas
- Connect nodes with edges
- Delete nodes/edges
- Configure node properties
- Validate workflow
- Save workflow
- Load existing workflow

**Delegation Recommendation:**
- Category: `visual-engineering` - Complex interactive UI
- Skills: [`frontend-ui-ux`]

**Depends On:** T9, T10

**Acceptance Criteria:**
- [ ] Nodes can be dragged to canvas
- [ ] Edges connect nodes
- [ ] Auto-save draft
- [ ] Validation shows errors
- [ ] Undo/redo support
- [ ] Zoom and pan
- [ ] Mini-map navigation

---

### Task 17: Task Queue Monitor Page

**Description:**
Page to monitor task queue with real-time updates.

**Files to Create:**
- `src/pages/TaskQueue.tsx` - Main queue page
- `src/components/queue/QueueTable.tsx` - Tasks table
- `src/components/queue/TaskStatusBadge.tsx` - Status indicators
- `src/components/queue/TaskActions.tsx` - Action buttons

**Features:**
- List all tasks with status
- Filter by: Pending, Running, Completed, Failed
- Retry failed tasks
- Cancel pending tasks
- View task details
- Pagination

**Delegation Recommendation:**
- Category: `visual-engineering`
- Skills: [`frontend-ui-ux`]

**Depends On:** T9

**Acceptance Criteria:**
- [ ] Displays all tasks
- [ ] Auto-refresh every 5 seconds
- [ ] Color-coded status badges
- [ ] Retry and cancel actions
- [ ] Task details modal

---

### Task 18: Execution Logs Page

**Description:**
Page to view historical execution logs with detailed breakdown.

**Files to Create:**
- `src/pages/ExecutionLogs.tsx` - Main logs page
- `src/components/logs/LogsTable.tsx` - Logs table
- `src/components/logs/LogDetailModal.tsx` - Log details
- `src/components/logs/LogExport.tsx` - Export functionality

**Features:**
- List execution logs
- Filter by date range, status, job
- View per-task results
- Export as JSON/CSV
- Pagination

**Delegation Recommendation:**
- Category: `visual-engineering`
- Skills: [`frontend-ui-ux`]

**Depends On:** T9

**Acceptance Criteria:**
- [ ] Displays execution history
- [ ] Filter by date/status
- [ ] Detailed task breakdown
- [ ] Export functionality
- [ ] Performance metrics

---

### Task 19: Router & Navigation Updates

**Description:**
Add cron routes to React Router and sidebar navigation.

**Files to Modify:**
- `src/App.tsx` - Add cron routes
- `src/components/layout/Sidebar.tsx` - Add navigation items

**Routes to Add:**
```typescript
<Route path="cron" element={<CronManagement />} />
<Route path="cron/workflow/:id?" element={<WorkflowBuilder />} />
<Route path="cron/queue" element={<TaskQueue />} />
<Route path="cron/logs" element={<ExecutionLogs />} />
```

**Sidebar Items:**
- Cron Jobs (/cron)
- Workflow Builder (/cron/workflow)
- Task Queue (/cron/queue)
- Execution Logs (/cron/logs)

**Delegation Recommendation:**
- Category: `quick` - Simple route additions
- Skills: []

**Depends On:** T11, T16, T17, T18

**Acceptance Criteria:**
- [ ] All routes accessible
- [ ] Sidebar shows active state
- [ ] Breadcrumb navigation
- [ ] Deep linking works

---

## Database Migration Strategy

### Migration Files

**001_initial_schema.sql:**
```sql
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Cron jobs table
create table if not exists cron_jobs (
  id text primary key,
  name text not null,
  description text,
  cron_expression text not null,
  timezone text default 'Asia/Shanghai',
  is_active integer default 1,
  workflow_json text not null,
  created_at datetime default current_timestamp,
  updated_at datetime default current_timestamp,
  last_run_at datetime,
  next_run_at datetime,
  total_runs integer default 0,
  total_failures integer default 0,
  max_concurrent_tasks integer default 5,
  priority integer default 0
);

-- Task queue table
create table if not exists task_queue (
  id text primary key,
  job_id text references cron_jobs(id) on delete cascade,
  task_type text not null,
  payload text not null,
  priority integer default 0,
  status text default 'pending',
  retry_count integer default 0,
  max_retries integer default 3,
  error_message text,
  result text,
  created_at datetime default current_timestamp,
  started_at datetime,
  completed_at datetime,
  execution_order integer,
  parent_task_id text references task_queue(id)
);

-- Execution logs table
create table if not exists execution_logs (
  id text primary key,
  job_id text references cron_jobs(id) on delete set null,
  trigger_type text,
  status text,
  started_at datetime,
  completed_at datetime,
  duration_ms integer,
  tasks_executed integer,
  tasks_succeeded integer,
  tasks_failed integer,
  error_summary text,
  log_detail text
);

-- Capacity tracking table
create table if not exists capacity_tracking (
  id text primary key,
  service_type text not null unique,
  remaining_quota integer,
  total_quota integer,
  unit_cost integer,
  reset_at datetime,
  last_checked_at datetime,
  quota_type text
);

-- Workflow executions table
create table if not exists workflow_executions (
  id text primary key,
  job_id text references cron_jobs(id) on delete cascade,
  execution_log_id text references execution_logs(id) on delete set null,
  node_states text,
  current_node_id text,
  context_data text,
  status text,
  started_at datetime,
  completed_at datetime
);
```

**002_add_indexes.sql:**
```sql
-- Performance indexes
create index idx_jobs_active on cron_jobs(is_active);
create index idx_jobs_next_run on cron_jobs(next_run_at);
create index idx_queue_status on task_queue(status);
create index idx_queue_job on task_queue(job_id);
create index idx_queue_priority on task_queue(priority desc, created_at);
create index idx_logs_job on execution_logs(job_id);
create index idx_logs_started on execution_logs(started_at desc);
create index idx_workflow_exec_job on workflow_executions(job_id);
```

### Migration System

```typescript
// server/db/migrations.ts
export class MigrationRunner {
  private db: Database
  
  async runMigrations(): Promise<void> {
    // Create migrations table if not exists
    this.db.exec(`
      create table if not exists _migrations (
        id integer primary key,
        filename text not null unique,
        executed_at datetime default current_timestamp
      )
    `)
    
    // Get pending migrations
    const executed = this.db.prepare('select filename from _migrations').all() as { filename: string }[]
    const executedSet = new Set(executed.map(e => e.filename))
    
    // Run pending migrations in order
    const migrationFiles = await this.getMigrationFiles()
    for (const file of migrationFiles) {
      if (!executedSet.has(file)) {
        const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8')
        this.db.exec(sql)
        this.db.prepare('insert into _migrations (filename) values (?)').run(file)
        console.log(`Migration executed: ${file}`)
      }
    }
  }
}
```

---

## Testing Strategy

### Unit Tests (Every Component)

**Coverage Requirements:**
- Database Service: 100% CRUD operations
- Cron Scheduler: Job lifecycle, timezone handling
- Task Executor: All task types, retry logic
- Capacity Checker: Cost calculation, quota tracking
- Queue Processor: Capacity limits, sequential execution
- Workflow Engine: Node execution, data flow

**Testing Libraries:**
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
```

### Integration Tests (Cross-Component)

**Test Scenarios:**
1. **End-to-End Workflow:**
   - Create job with workflow
   - Trigger execution
   - Verify task queue population
   - Verify execution
   - Check logs

2. **Capacity Management:**
   - Set low capacity
   - Queue multiple tasks
   - Verify sequential execution
   - Verify stop when capacity exhausted

3. **Error Handling:**
   - Create job with invalid workflow
   - Verify validation error
   - Create job that fails execution
   - Verify retry logic

### E2E Tests (User Scenarios)

**Using Playwright:**
1. User creates cron job
2. User builds workflow visually
3. User triggers manual execution
4. User monitors task queue
5. User views execution logs

---

## Risk Mitigation

### Risk 1: Workflow Engine Complexity

**Mitigation:**
- Start with simple linear workflows
- Add conditionals and loops in later iteration
- Extensive unit testing with mock nodes
- Validate workflow JSON before execution

**Fallback:**
- Support only linear workflows in v1
- Add advanced features incrementally

### Risk 2: Capacity Calculation Accuracy

**Mitigation:**
- Conservative cost estimates (over-estimate)
- Real-time capacity updates after each execution
- Alert when approaching limits
- Manual override capability

**Fallback:**
- Disable capacity checking if unreliable
- Execute all tasks regardless of capacity

### Risk 3: Database Performance

**Mitigation:**
- Add indexes on all query columns
- Implement pagination on list endpoints
- Use connection pooling
- Monitor query performance

**Fallback:**
- Implement caching layer
- Archive old execution logs

### Risk 4: Cron Job Overlap

**Mitigation:**
- Track running executions per job
- Prevent new execution if previous still running
- Configurable max concurrent executions
- Timeout long-running executions

**Fallback:**
- Skip execution if previous still running

---

## Commit Strategy

### Atomic Commits by Phase

**Phase 1: Database Foundation**
```
feat(cron): add SQLite database schema and migrations
- Create cron_jobs, task_queue, execution_logs tables
- Add capacity_tracking and workflow_executions tables
- Implement migration runner
- Add database service with CRUD operations
```

**Phase 2: Backend Services**
```
feat(cron): implement cron scheduler service
- Add node-cron integration
- Implement job lifecycle management
- Add manual trigger capability
- Support timezone handling

feat(cron): implement task executor service
- Add task type handlers for all MiniMax APIs
- Implement retry logic with exponential backoff
- Add result storage and error handling
```

**Phase 3: Frontend Components**
```
feat(cron): add workflow node components
- Create React Flow node components
- Implement node palette and config panel
- Add drag-and-drop functionality
```

**Phase 4: Integration**
```
feat(cron): integrate backend services
- Wire up cron routes to services
- Add graceful shutdown handling
- Implement health checks
```

**Phase 5: Testing & Documentation**
```
test(cron): add comprehensive test suite
- Unit tests for all services
- Integration tests for workflows
- E2E tests for user scenarios

docs(cron): add architecture documentation
- System design documentation
- API reference
- User guide for workflow builder
```

---

## Success Criteria

### Functional Requirements
- [ ] Users can create cron jobs with cron expressions
- [ ] Users can build workflows visually using drag-and-drop
- [ ] Cron jobs execute automatically on schedule
- [ ] Tasks execute sequentially respecting capacity limits
- [ ] Failed tasks can be retried
- [ ] Execution history is persisted and viewable

### Performance Requirements
- [ ] Page load < 2 seconds
- [ ] Workflow canvas renders < 1 second (50 nodes)
- [ ] Task queue updates in real-time (< 5 second delay)
- [ ] Database queries complete < 100ms

### Reliability Requirements
- [ ] System survives server restarts (jobs resume)
- [ ] Graceful degradation when MiniMax API unavailable
- [ ] No data loss during concurrent operations
- [ ] All errors are logged and actionable

### Code Quality Requirements
- [ ] >80% test coverage
- [ ] All TypeScript types strict
- [ ] ESLint passes with zero warnings
- [ ] Documentation complete and accurate

---

## TODO List (ADD THESE)

> CALLER: Add these TODOs using TodoWrite/TaskCreate and execute by wave.

### Wave 1 (Start Immediately - No Dependencies)

- [ ] **1. Install Dependencies (T14)**
  - What: Install better-sqlite3, node-cron, cronstrue, cron-parser, @xyflow/react, uuid
  - Depends: None
  - Blocks: T1, T10
  - Category: `quick`
  - Skills: []
  - QA: `npm install` completes without errors

- [ ] **2. Database Service & Schema (T1)**
  - What: Create SQLite schema, migration system, and DatabaseService with CRUD operations
  - Depends: T14
  - Blocks: T2, T3, T4, T6, T7
  - Category: `deep`
  - Skills: [`git-master`]
  - QA: Database initializes on server start, all tables created

- [ ] **3. Frontend Store & Types (T9)**
  - What: Create Zustand stores for cron, queue, logs with TypeScript types
  - Depends: None
  - Blocks: T11, T16, T17, T18
  - Category: `unspecified-low`
  - Skills: []
  - QA: Stores compile without TypeScript errors

- [ ] **4. Workflow Node Components (T10)**
  - What: Create 11 React Flow node components and NodePalette
  - Depends: T14
  - Blocks: T11, T16
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - QA: All node types render correctly in Storybook

### Wave 2 (After Wave 1 Database Complete)

- [ ] **5. Cron Scheduler Service (T2)**
  - What: Implement node-cron scheduler with DB persistence and timezone support
  - Depends: T1
  - Blocks: T8
  - Category: `deep`
  - Skills: [`git-master`]
  - QA: Jobs persist across restarts, manual trigger works

- [ ] **6. Task Executor Service (T3)**
  - What: Implement task execution with retry logic for all MiniMax APIs
  - Depends: T1
  - Blocks: T5, T8
  - Category: `deep`
  - Skills: [`git-master`]
  - QA: All 6 task types execute correctly, retries work

- [ ] **7. Capacity Checker Service (T4)**
  - What: Implement getBalance integration with cost estimation
  - Depends: T1
  - Blocks: T5, T8
  - Category: `deep`
  - Skills: [`git-master`]
  - QA: Capacity checks return accurate quota info

- [ ] **8. Workflow Engine (T6)**
  - What: Implement graph execution engine with data flow between nodes
  - Depends: T1
  - Blocks: T8
  - Category: `ultrabrain`
  - Skills: [`git-master`]
  - QA: Linear workflows execute correctly

- [ ] **9. API Routes & Validation (T7)**
  - What: Create Express routes with Zod validation for all cron endpoints
  - Depends: T1
  - Blocks: T8
  - Category: `deep`
  - Skills: [`git-master`]
  - QA: All endpoints respond correctly, validation works

### Wave 3 (After Wave 2 Complete)

- [ ] **10. Queue Processor Service (T5)**
  - What: Implement queue processing with capacity-aware sequential execution
  - Depends: T3, T4
  - Blocks: T8
  - Category: `deep`
  - Skills: [`git-master`]
  - QA: Queue stops when capacity exhausted, resumes when available

- [ ] **11. Backend Service Integration (T8)**
  - What: Wire all services together with proper initialization order
  - Depends: T2, T5, T6, T7
  - Blocks: T15
  - Category: `deep`
  - Skills: [`git-master`]
  - QA: Server starts successfully, all services initialized

- [ ] **12. Frontend API Client (T15)**
  - What: Create TypeScript API clients for all cron endpoints
  - Depends: T8
  - Blocks: T11, T16, T17, T18
  - Category: `unspecified-low`
  - Skills: []
  - QA: All API calls return typed responses

### Wave 4 (After Wave 3 Complete)

- [ ] **13. Cron Management Page (T11)**
  - What: Build jobs list page with table, filters, and actions
  - Depends: T9, T10, T15
  - Blocks: T19
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - QA: Page displays jobs, actions work, filters functional

- [ ] **14. Workflow Builder Page (T16)**
  - What: Build visual workflow builder with React Flow canvas
  - Depends: T9, T10, T15
  - Blocks: T19
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - QA: Drag-drop works, nodes connect, workflow saves

- [ ] **15. Task Queue Monitor Page (T17)**
  - What: Build task queue page with real-time status updates
  - Depends: T9, T15
  - Blocks: T19
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - QA: Auto-refresh works, retry/cancel functional

- [ ] **16. Execution Logs Page (T18)**
  - What: Build execution logs page with filtering and export
  - Depends: T9, T15
  - Blocks: T19
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - QA: Logs display, filters work, export functional

### Wave 5 (After Wave 4 Complete)

- [ ] **17. Router & Navigation Updates (T19)**
  - What: Add cron routes to App.tsx and Sidebar.tsx
  - Depends: T11, T16, T17, T18
  - Blocks: T12
  - Category: `quick`
  - Skills: []
  - QA: All routes accessible from sidebar

- [ ] **18. Integration Testing (T12)**
  - What: Write comprehensive integration and E2E tests
  - Depends: T8, T19
  - Blocks: T13
  - Category: `deep`
  - Skills: [`playwright`]
  - QA: >80% coverage, all critical paths tested

- [ ] **19. Documentation (T13)**
  - What: Write architecture, API, and user documentation
  - Depends: T12
  - Blocks: None
  - Category: `writing`
  - Skills: []
  - QA: All docs complete, examples work

## Execution Instructions

### Wave 1 Execution
```bash
# Fire in parallel - no dependencies
task(category="quick", load_skills=[], run_in_background=false, prompt="T14: Install npm packages...")
task(category="deep", load_skills=["git-master"], run_in_background=false, prompt="T1: Create Database Service...")
task(category="unspecified-low", load_skills=[], run_in_background=false, prompt="T9: Create Frontend Stores...")
task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=false, prompt="T10: Create Workflow Node Components...")
```

### Wave 2 Execution (After T1 completes)
```bash
# Fire in parallel
task(category="deep", load_skills=["git-master"], run_in_background=false, prompt="T2: Cron Scheduler Service...")
task(category="deep", load_skills=["git-master"], run_in_background=false, prompt="T3: Task Executor Service...")
task(category="deep", load_skills=["git-master"], run_in_background=false, prompt="T4: Capacity Checker Service...")
task(category="ultrabrain", load_skills=["git-master"], run_in_background=false, prompt="T6: Workflow Engine...")
task(category="deep", load_skills=["git-master"], run_in_background=false, prompt="T7: API Routes...")
```

### Wave 3 Execution (After Wave 2 completes)
```bash
task(category="deep", load_skills=["git-master"], run_in_background=false, prompt="T5: Queue Processor...")
task(category="deep", load_skills=["git-master"], run_in_background=false, prompt="T8: Backend Integration...")
task(category="unspecified-low", load_skills=[], run_in_background=false, prompt="T15: Frontend API Client...")
```

### Wave 4 Execution (After Wave 3 completes)
```bash
# Fire in parallel
task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=false, prompt="T11: Cron Management Page...")
task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=false, prompt="T16: Workflow Builder Page...")
task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=false, prompt="T17: Task Queue Page...")
task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=false, prompt="T18: Execution Logs Page...")
```

### Wave 5 Execution (After Wave 4 completes)
```bash
task(category="quick", load_skills=[], run_in_background=false, prompt="T19: Router Updates...")
task(category="deep", load_skills=["playwright"], run_in_background=false, prompt="T12: Integration Testing...")
task(category="writing", load_skills=[], run_in_background=false, prompt="T13: Documentation...")
```

### Final QA
```bash
npm run lint
npm run test
curl http://localhost:4511/api/cron/jobs
# Verify all acceptance criteria
```

---

## Appendix: File Reference

### New Backend Files (28 files)
```
server/
├── db/
│   ├── index.ts
│   ├── migrations.ts
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_add_indexes.sql
│   └── types.ts
├── services/
│   ├── databaseService.ts
│   ├── databaseService.test.ts
│   ├── cronScheduler.ts
│   ├── cronScheduler.test.ts
│   ├── taskExecutor.ts
│   ├── taskExecutor.test.ts
│   ├── capacityChecker.ts
│   ├── capacityChecker.test.ts
│   ├── queueProcessor.ts
│   ├── queueProcessor.test.ts
│   ├── workflowEngine.ts
│   ├── workflowEngine.test.ts
│   └── index.ts
├── lib/
│   ├── cronParser.ts
│   ├── costCalculator.ts
│   ├── workflowParser.ts
│   ├── workflowNodes.ts
│   ├── taskResultHandler.ts
│   └── shutdown.ts
├── routes/
│   ├── cron.ts
│   └── cron.test.ts
├── validation/
│   └── cronSchemas.ts
├── middleware/
│   └── cronAuth.ts
├── types/
│   ├── cron.ts
│   ├── tasks.ts
│   └── workflow.ts
└── __tests__/
    └── integration/
        ├── cron.test.ts
        ├── workflow.test.ts
        └── capacity.test.ts
```

### New Frontend Files (35 files)
```
src/
├── stores/
│   ├── cron.ts
│   ├── cronQueue.ts
│   └── cronLogs.ts
├── types/
│   └── cron.ts
├── lib/api/
│   ├── cron.ts
│   ├── cronQueue.ts
│   ├── cronLogs.ts
│   └── cronCapacity.ts
├── components/
│   ├── workflow/
│   │   ├── nodes/
│   │   │   ├── TriggerNode.tsx
│   │   │   ├── TextActionNode.tsx
│   │   │   ├── VoiceSyncActionNode.tsx
│   │   │   ├── VoiceAsyncActionNode.tsx
│   │   │   ├── ImageActionNode.tsx
│   │   │   ├── MusicActionNode.tsx
│   │   │   ├── VideoActionNode.tsx
│   │   │   ├── ConditionNode.tsx
│   │   │   ├── QueueNode.tsx
│   │   │   ├── TransformNode.tsx
│   │   │   ├── LoopNode.tsx
│   │   │   └── index.ts
│   │   ├── NodePalette.tsx
│   │   ├── NodeConfigPanel.tsx
│   │   ├── WorkflowCanvas.tsx
│   │   ├── WorkflowToolbar.tsx
│   │   └── WorkflowValidator.tsx
│   ├── cron/
│   │   ├── JobsTable.tsx
│   │   ├── JobStatusBadge.tsx
│   │   ├── JobActions.tsx
│   │   └── CronExpressionInput.tsx
│   ├── queue/
│   │   ├── QueueTable.tsx
│   │   ├── TaskStatusBadge.tsx
│   │   └── TaskActions.tsx
│   └── logs/
│       ├── LogsTable.tsx
│       ├── LogDetailModal.tsx
│       └── LogExport.tsx
├── pages/
│   ├── CronManagement.tsx
│   ├── WorkflowBuilder.tsx
│   ├── TaskQueue.tsx
│   └── ExecutionLogs.tsx
└── __tests__/
    └── integration/
        └── cron.e2e.test.tsx
```

### Modified Files (4 files)
```
package.json
server/index.ts
src/App.tsx
src/components/layout/Sidebar.tsx
```

---

## Total Effort Estimate

| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Wave 1 | 4 tasks | 12 hours |
| Wave 2 | 5 tasks | 20 hours |
| Wave 3 | 3 tasks | 10 hours |
| Wave 4 | 4 tasks | 16 hours |
| Wave 5 | 3 tasks | 12 hours |
| **Total** | **19 tasks** | **70 hours** |

**With parallel execution:** ~40 hours wall-clock time

---

## Conclusion

This implementation plan provides a comprehensive, production-ready roadmap for building a cron task management system with visual workflow orchestration. The plan follows TDD principles, includes parallel execution opportunities, and provides detailed specifications for every component.

**Key Design Decisions Validated:**
- better-sqlite3: Appropriate for single-process Node.js app
- node-cron: Lightweight, no Redis dependency
- @xyflow/react: Industry standard for workflow builders
- Wave-based execution: Maximizes parallel work

**Ready for Execution.**
