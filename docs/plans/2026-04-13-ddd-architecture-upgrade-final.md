# DDD Architecture Upgrade Final Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete DDD architecture upgrade eliminating ~2500+ lines of duplication, enforcing layer separation, and implementing factory patterns for code reuse.

**Architecture:** Backend: Routes→Controllers→Services→Repositories with domain-driven bounded contexts. Frontend: Factory-based stores (createAsyncStore), factory-based API clients (createApiMethod), and component splitting.

**Tech Stack:** Express + TypeScript + Zod (backend), React + Zustand + Axios (frontend)

---

## Overview

This plan completes the remaining DDD architecture upgrade work:

**Completed Phases** (from v2 design):
- ✅ Phase 1: DI Container, MiniMaxClientFactory, BaseRepository
- ✅ Phase 3: Route helpers (withEntityNotFound, getPaginationParams)
- ✅ Phase 4-1: API error handling (ApiError, toApiResponse)
- ✅ Phase 6: Constants unification (TIMEOUTS, WEBSOCKET, PAGINATION)
- ✅ Phase 8: Service splitting (ConcurrencyManager, MisfireHandler, RetryManager)
- ✅ Phase 9: Domain Services (MediaService, WorkflowService, WebhookService)

**Remaining Work** (this plan):
- Backend: API proxy router factory (8 routes duplicated)
- Backend: Routes using domain services (not bypassing)
- Backend: Domain services with business logic (not thin wrappers)
- Frontend: Store factory pattern (~750 lines)
- Frontend: API client factory pattern (~350 lines)
- Frontend: Component splitting (Phase 7 execution)

---

## File Structure Map

### Backend New Files
```
server/
├── utils/
│   └── api-proxy-router.ts     # createApiProxyRouter factory
├── services/
│   └── domain/
│       ├── job.service.enhanced.ts  # Business logic additions
│       └── task.service.enhanced.ts # Business logic additions
├── controllers/                # Optional: thin controllers
    └── api-proxy.controller.ts
```

### Frontend New Files
```
src/
├── lib/
│   ├── stores/
│   │   ├── create-async-store.ts   # Factory for async operations
│   │   └── types.ts                # Store types
│   ├── api/
│   │   ├── create-api-method.ts    # Factory for API calls
│   │   └── api-client-wrapper.ts   # Unified wrapper
```

### Frontend Modified Files
```
src/stores/
├── cronJobs.ts        → Refactored to use factory
├── taskQueue.ts       → Refactored to use factory
├── executionLogs.ts   → Refactored to use factory
├── webhooks.ts        → Refactored to use factory
src/lib/api/
├── cron.ts           → Refactored to use factory
├── stats.ts          → Refactored to use factory
├── templates.ts      → Refactored to use factory
├── workflows.ts      → Refactored to use factory
```

---

## Section A: Backend API Proxy Router Factory

**Problem**: 8 routes (text.ts, voice.ts, image.ts, music.ts, video.ts, videoAgent.ts, voiceMgmt.ts, files.ts) follow identical pattern:
1. Get client from request
2. Build request body
3. Call API method
4. Return response
5. Handle errors

**Solution**: Create `createApiProxyRouter` factory

### Task A-1: Create API Proxy Router Factory

**Files:**
- Create: `server/utils/api-proxy-router.ts`
- Test: `server/utils/__tests__/api-proxy-router.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/utils/__tests__/api-proxy-router.test.ts
import { createApiProxyRouter } from '../api-proxy-router'
import express, { Express } from 'express'
import request from 'supertest'

describe('createApiProxyRouter', () => {
  let app: Express
  
  beforeEach(() => {
    app = express()
    app.use(express.json())
  })
  
  it('should create router with proxy endpoint', async () => {
    const mockClient = {
      textGeneration: jest.fn().mockResolvedValue({ data: { text: 'result' } })
    }
    
    const router = createApiProxyRouter({
      endpoint: '/generate',
      clientMethod: 'textGeneration',
      buildRequestBody: (req) => req.body
    })
    
    app.use('/api/proxy', router)
    
    const response = await request(app)
      .post('/api/proxy/generate')
      .send({ prompt: 'test' })
    
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toEqual({ text: 'result' })
  })
  
  it('should handle client errors', async () => {
    const mockClient = {
      textGeneration: jest.fn().mockRejectedValue(new Error('API error'))
    }
    
    const router = createApiProxyRouter({
      endpoint: '/generate',
      clientMethod: 'textGeneration',
      buildRequestBody: (req) => req.body
    })
    
    app.use('/api/proxy', router)
    
    const response = await request(app)
      .post('/api/proxy/generate')
      .send({ prompt: 'test' })
    
    expect(response.status).toBe(500)
    expect(response.body.success).toBe(false)
    expect(response.body.error).toBe('API error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run server/utils/__tests__/api-proxy-router.test.ts`
Expected: FAIL with "Cannot find module '../api-proxy-router'"

- [ ] **Step 3: Write implementation**

```typescript
// server/utils/api-proxy-router.ts
import { Router, Request, Response, NextFunction } from 'express'
import { asyncHandler } from '../middleware/async-handler'
import { successResponse, errorResponse } from '../utils/api-response'

interface ApiProxyConfig {
  endpoint: string
  clientMethod: string
  buildRequestBody: (req: Request) => unknown
  extractClient?: (req: Request) => unknown
}

/**
 * Factory for creating API proxy routers.
 * Eliminates duplicate patterns across text/voice/image/music/video routes.
 * 
 * @example
 * const router = createApiProxyRouter({
 *   endpoint: '/generate',
 *   clientMethod: 'textGeneration',
 *   buildRequestBody: (req) => ({
 *     model: req.body.model,
 *     prompt: req.body.prompt
 *   })
 * })
 */
export function createApiProxyRouter(config: ApiProxyConfig): Router {
  const router = Router()
  
  router.post(
    config.endpoint,
    asyncHandler(async (req: Request, res: Response) => {
      const client = config.extractClient?.(req) ?? req.minimaxClient
      const requestBody = config.buildRequestBody(req)
      
      const method = client[config.clientMethod as keyof typeof client]
      if typeof method !== 'function') {
        throw new Error(`Invalid client method: ${config.clientMethod}`)
      }
      
      const result = await method.call(client, requestBody)
      successResponse(res, result.data)
    })
  )
  
  return router
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run server/utils/__tests__/api-proxy-router.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add server/utils/api-proxy-router.ts server/utils/__tests__/api-proxy-router.test.ts
git commit -m "feat(server): add createApiProxyRouter factory for route deduplication"
```

---

### Task A-2: Refactor text.ts route

**Files:**
- Modify: `server/routes/text.ts`

- [ ] **Step 1: Read current implementation**

Current pattern in text.ts (lines 15-40):
```typescript
router.post('/generation', asyncHandler(async (req, res) => {
  const client = getClientFromRequest(req)
  const body = buildTextRequest(req.body)
  const result = await client.textGeneration(body)
  successResponse(res, result)
}))
```

- [ ] **Step 2: Create refactored version**

```typescript
// server/routes/text.ts (refactored)
import { Router } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'

const router = Router()

// Text generation endpoint
router.use('/generation', createApiProxyRouter({
  endpoint: '/generation',
  clientMethod: 'textGeneration',
  buildRequestBody: (req) => ({
    model: req.body.model,
    prompt: req.body.prompt,
    temperature: req.body.temperature,
    max_tokens: req.body.max_tokens
  }),
  extractClient: getClientFromRequest
}))

export default router
```

- [ ] **Step 3: Verify routes still work**

Run: `npm run build && vitest run server/routes/__tests__/text.test.ts`
Expected: PASS (existing tests)

- [ ] **Step 4: Commit**

```bash
git add server/routes/text.ts
git commit -m "refactor(server): convert text route to use api-proxy-router factory"
```

---

### Task A-3: Refactor voice.ts route

**Files:**
- Modify: `server/routes/voice.ts`

- [ ] **Step 1: Read current implementation**

Current pattern in voice.ts has 3 endpoints:
- POST /sync - sync voice generation
- POST /async - async voice generation
- POST /query - query async result

- [ ] **Step 2: Create refactored version**

```typescript
// server/routes/voice.ts (refactored)
import { Router } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'

const router = Router()

// Sync voice generation
router.use('/sync', createApiProxyRouter({
  endpoint: '/sync',
  clientMethod: 'voiceGenerationSync',
  buildRequestBody: (req) => ({
    text: req.body.text,
    model: req.body.model,
    voice_id: req.body.voice_id
  }),
  extractClient: getClientFromRequest
}))

// Async voice generation
router.use('/async', createApiProxyRouter({
  endpoint: '/async',
  clientMethod: 'voiceGenerationAsync',
  buildRequestBody: (req) => ({
    text: req.body.text,
    model: req.body.model,
    voice_id: req.body.voice_id,
    callback_url: req.body.callback_url
  }),
  extractClient: getClientFromRequest
}))

// Query async result
router.use('/query', createApiProxyRouter({
  endpoint: '/query',
  clientMethod: 'queryVoiceResult',
  buildRequestBody: (req) => ({
    task_id: req.body.task_id
  }),
  extractClient: getClientFromRequest
}))

export default router
```

- [ ] **Step 3: Verify routes still work**

Run: `npm run build && vitest run server/routes/__tests__/voice.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/routes/voice.ts
git commit -m "refactor(server): convert voice route to use api-proxy-router factory"
```

---

### Task A-4: Refactor remaining API proxy routes

**Files:**
- Modify: `server/routes/image.ts`
- Modify: `server/routes/music.ts`
- Modify: `server/routes/video.ts`
- Modify: `server/routes/videoAgent.ts`
- Modify: `server/routes/voiceMgmt.ts`
- Modify: `server/routes/files.ts`

- [ ] **Step 1: Batch refactor all remaining routes**

Apply same pattern to all files:

```typescript
// Pattern for each route:
import { Router } from 'express'
import { createApiProxyRouter } from '../utils/api-proxy-router'
import { getClientFromRequest } from '../lib/minimax-client-factory'

const router = Router()

router.use('/endpoint', createApiProxyRouter({
  endpoint: '/endpoint',
  clientMethod: 'methodName',
  buildRequestBody: (req) => req.body,
  extractClient: getClientFromRequest
}))

export default router
```

- [ ] **Step 2: Verify all routes work**

Run: `npm run build && vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add server/routes/image.ts server/routes/music.ts server/routes/video.ts server/routes/videoAgent.ts server/routes/voiceMgmt.ts server/routes/files.ts
git commit -m "refactor(server): convert all API proxy routes to use factory pattern"
```

---

## Section B: Backend Domain Service Enhancement

**Problem**: Domain services (JobService, TaskService) are thin wrappers with no business logic.

**Solution**: Extract business logic from routes into domain services.

### Task B-1: Enhance JobService with business logic

**Files:**
- Modify: `server/services/domain/job.service.ts`
- Test: `server/services/domain/__tests__/job.service.test.ts`

- [ ] **Step 1: Write failing test for business logic**

```typescript
// server/services/domain/__tests__/job.service.test.ts
import { JobService } from '../job.service'
import { MockCronJobRepository } from '../../__mocks__/cron-job.repository'

describe('JobService business logic', () => {
  it('should validate cron expression before creating job', async () => {
    const mockRepo = new MockCronJobRepository()
    const service = new JobService(mockRepo)
    
    await expect(service.create({
      name: 'Test',
      cron_expression: 'invalid-expression',
      is_active: true
    })).rejects.toThrow('Invalid cron expression')
  })
  
  it('should check dependencies before toggling job active', async () => {
    const mockRepo = new MockCronJobRepository()
    mockRepo.getById.mockResolvedValue({ id: 'job-1', name: 'Test' })
    mockRepo.getDependencies.mockResolvedValue([
      { depends_on_job_id: 'job-2', dependency_type: 'weak' }
    ])
    mockRepo.getById.mockResolvedValue({ id: 'job-2', is_active: false })
    
    const service = new JobService(mockRepo)
    
    await expect(service.toggleActive('job-1', true))
      .rejects.toThrow('Dependency job-2 is not active')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run server/services/domain/__tests__/job.service.test.ts`
Expected: FAIL with business logic not implemented

- [ ] **Step 3: Implement business logic**

```typescript
// server/services/domain/job.service.ts (enhanced)
import { ICronJobRepository } from '../../repositories/ports/cron-job.repository'
import { validateCronExpression } from '../../utils/cron-validator'
import { CronJob, CreateJobInput, UpdateJobInput } from '@mnx/shared-types'

export class JobService {
  constructor(private readonly repository: ICronJobRepository) {}
  
  async create(input: CreateJobInput, ownerId?: string): Promise<CronJob> {
    // Business logic: Validate cron expression
    if (!validateCronExpression(input.cron_expression)) {
      throw new Error('Invalid cron expression')
    }
    
    // Business logic: Check for duplicate names
    const existing = await this.repository.findByOwner(ownerId)
    if (existing.some(j => j.name === input.name)) {
      throw new Error(`Job with name "${input.name}" already exists`)
    }
    
    return this.repository.create(input, ownerId)
  }
  
  async toggleActive(id: string, active: boolean, ownerId?: string): Promise<CronJob | null> {
    if (active) {
      // Business logic: Check dependencies are active
      const dependencies = await this.repository.getDependencies(id)
      for (const dep of dependencies) {
        if (dep.dependency_type === 'strong') {
          const depJob = await this.repository.getById(dep.depends_on_job_id, ownerId)
          if (!depJob?.is_active) {
            throw new Error(`Dependency ${dep.depends_on_job_id} is not active`)
          }
        }
      }
    }
    
    return this.repository.toggleActive(id, active, ownerId)
  }
  
  async update(id: string, input: UpdateJobInput, ownerId?: string): Promise<CronJob | null> {
    // Business logic: Validate new cron expression if provided
    if (input.cron_expression && !validateCronExpression(input.cron_expression)) {
      throw new Error('Invalid cron expression')
    }
    
    return this.repository.update(id, input, ownerId)
  }
  
  // Delegation methods (unchanged)
  async getAll(ownerId?: string): Promise<CronJob[]> {
    return this.repository.findByOwner(ownerId)
  }
  
  async getById(id: string, ownerId?: string): Promise<CronJob | null> {
    return this.repository.getById(id, ownerId)
  }
  
  async delete(id: string, ownerId?: string): Promise<void> {
    return this.repository.delete(id, ownerId)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run server/services/domain/__tests__/job.service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/domain/job.service.ts server/services/domain/__tests__/job.service.test.ts server/utils/cron-validator.ts
git commit -m "feat(server): add business logic to JobService (validation, dependency checks)"
```

---

## Section C: Frontend Store Factory Pattern

**Problem**: ~750 lines of duplicate try/catch/set loading/error pattern across 4 stores.

**Solution**: Create `createAsyncStore` factory.

### Task C-1: Create Async Store Factory

**Files:**
- Create: `src/lib/stores/create-async-store.ts`
- Create: `src/lib/stores/types.ts`
- Test: `src/lib/stores/__tests__/create-async-store.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/stores/__tests__/create-async-store.test.ts
import { createAsyncStore } from '../create-async-store'
import { act } from '@testing-library/react'

describe('createAsyncStore', () => {
  it('should create store with async action', async () => {
    const mockApi = jest.fn().mockResolvedValue({ success: true, data: { items: [1, 2, 3] } })
    
    const useTestStore = createAsyncStore<{ items: number[] }, void>({
      name: 'test-store',
      initialState: { items: [] },
      actions: {
        fetchItems: {
          apiCall: mockApi,
          onSuccess: (state, data) => { state.items = data.items }
        }
      }
    })
    
    await act(async () => {
      await useTestStore.getState().fetchItems()
    })
    
    expect(useTestStore.getState().loading).toBe(false)
    expect(useTestStore.getState().error).toBeNull()
    expect(useTestStore.getState().items).toEqual([1, 2, 3])
  })
  
  it('should handle API errors', async () => {
    const mockApi = jest.fn().mockResolvedValue({ success: false, error: 'API failed' })
    
    const useTestStore = createAsyncStore<{ items: number[] }, void>({
      name: 'test-store',
      initialState: { items: [] },
      actions: {
        fetchItems: {
          apiCall: mockApi,
          onSuccess: (state, data) => { state.items = data.items }
        }
      }
    })
    
    await act(async () => {
      await useTestStore.getState().fetchItems()
    })
    
    expect(useTestStore.getState().loading).toBe(false)
    expect(useTestStore.getState().error).toBe('API failed')
    expect(useTestStore.getState().items).toEqual([])
  })
  
  it('should handle network errors', async () => {
    const mockApi = jest.fn().mockRejectedValue(new Error('Network error'))
    
    const useTestStore = createAsyncStore<{ items: number[] }, void>({
      name: 'test-store',
      initialState: { items: [] },
      actions: {
        fetchItems: {
          apiCall: mockApi,
          onSuccess: (state, data) => { state.items = data.items }
        }
      }
    })
    
    await act(async () => {
      await useTestStore.getState().fetchItems()
    })
    
    expect(useTestStore.getState().error).toBe('Network error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run src/lib/stores/__tests__/create-async-store.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/stores/types.ts
export interface AsyncState {
  loading: boolean
  error: string | null
}

export interface AsyncActionConfig<TParams, TData> {
  apiCall: (params: TParams) => Promise<{ success: boolean; data?: TData; error?: string }>
  onSuccess?: (state: any, data: TData) => void
  onError?: (state: any, error: string) => void
}

export interface CreateAsyncStoreConfig<TState extends AsyncState, TActions> {
  name: string
  initialState: TState
  actions: Record<keyof TActions, AsyncActionConfig<any, any>>
}
```

```typescript
// src/lib/stores/create-async-store.ts
import { create, StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'
import { AsyncState, CreateAsyncStoreConfig, AsyncActionConfig } from './types'

/**
 * Factory for creating async-capable Zustand stores.
 * Eliminates ~750 lines of duplicate try/catch/loading/error patterns.
 * 
 * @example
 * const useJobsStore = createAsyncStore({
 *   name: 'cron-jobs',
 *   initialState: { jobs: [], loading: false, error: null },
 *   actions: {
 *     fetchJobs: {
 *       apiCall: () => apiCron.getJobs(),
 *       onSuccess: (state, data) => { state.jobs = data.items }
 *     },
 *     createJob: {
 *       apiCall: (params) => apiCron.createJob(params),
 *       onSuccess: (state, data) => { state.jobs.push(data) }
 *     }
 *   }
 * })
 */
export function createAsyncStore<
  TState extends AsyncState,
  TActions extends Record<string, AsyncActionConfig<any, any>>
>(config: CreateAsyncStoreConfig<TState, TActions>) {
  
  type StoreState = TState & {
    [K in keyof TActions]: (params?: any) => Promise<void>
  }
  
  const storeCreator: StateCreator<StoreState> = (set, get) => {
    const baseState = config.initialState
    
    // Generate action methods from config
    const actions = Object.fromEntries(
      Object.entries(config.actions).map(([actionName, actionConfig]) => {
        return [actionName, async (params?: any) => {
          // Standard pattern: set loading, try API, handle result
          set({ loading: true, error: null } as Partial<StoreState>)
          
          try {
            const response = await actionConfig.apiCall(params)
            
            if (!response.success || !response.data) {
              const errorMsg = response.error || `${actionName} failed`
              set({
                error: errorMsg,
                loading: false
              } as Partial<StoreState>)
              actionConfig.onError?.(get(), errorMsg)
              return
            }
            
            // Apply success transformation
            set((state) => {
              actionConfig.onSuccess?.(state, response.data)
              return { ...state, loading: false } as Partial<StoreState>
            })
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : `${actionName} failed`
            set({
              error: errorMsg,
              loading: false
            } as Partial<StoreState>)
            actionConfig.onError?.(get(), errorMsg)
          }
        }]
      })
    )
    
    return {
      ...baseState,
      ...actions
    } as StoreState
  }
  
  return create<StoreState>()(
    persist(storeCreator, { name: config.name })
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run src/lib/stores/__tests__/create-async-store.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/create-async-store.ts src/lib/stores/types.ts src/lib/stores/__tests__/create-async-store.test.ts
git commit -m "feat(frontend): add createAsyncStore factory for store deduplication"
```

---

### Task C-2: Refactor cronJobs store

**Files:**
- Modify: `src/stores/cronJobs.ts`

- [ ] **Step 1: Read current implementation**

Current cronJobs.ts has 13 async methods (~250 lines) with identical pattern.

- [ ] **Step 2: Create refactored version**

```typescript
// src/stores/cronJobs.ts (refactored)
import { createAsyncStore } from '@/lib/stores/create-async-store'
import { apiCron } from '@/lib/api/cron'
import { CronJob, CreateJobInput, UpdateJobInput } from '@/types/cron'

interface CronJobsState {
  jobs: CronJob[]
}

type CronJobsActions = {
  fetchJobs: void
  createJob: CreateJobInput
  updateJob: { id: string; input: UpdateJobInput }
  deleteJob: string
  toggleJob: { id: string; active: boolean }
  runJob: string
}

export const useCronJobsStore = createAsyncStore<CronJobsState & { loading: boolean; error: string | null }, CronJobsActions>({
  name: 'cron-jobs-store',
  initialState: {
    jobs: [],
    loading: false,
    error: null
  },
  actions: {
    fetchJobs: {
      apiCall: () => apiCron.getJobs(),
      onSuccess: (state, data) => { state.jobs = data.items }
    },
    createJob: {
      apiCall: (params) => apiCron.createJob(params),
      onSuccess: (state, data) => { state.jobs.push(data) }
    },
    updateJob: {
      apiCall: (params) => apiCron.updateJob(params.id, params.input),
      onSuccess: (state, data) => {
        const index = state.jobs.findIndex(j => j.id === data.id)
        if (index >= 0) state.jobs[index] = data
      }
    },
    deleteJob: {
      apiCall: (params) => apiCron.deleteJob(params),
      onSuccess: (state) => {
        state.jobs = state.jobs.filter(j => j.id !== (state as any)._deletedId)
      },
      onError: (state) => { (state as any)._deletedId = null }
    },
    toggleJob: {
      apiCall: (params) => apiCron.toggleJob(params.id, params.active),
      onSuccess: (state, data) => {
        const index = state.jobs.findIndex(j => j.id === data.id)
        if (index >= 0) state.jobs[index] = data
      }
    },
    runJob: {
      apiCall: (params) => apiCron.runJob(params),
      onSuccess: (state) => { /* no state update needed */ }
    }
  }
})

// WebSocket subscription (kept separate for clarity)
// This will be addressed in Phase 5
```

- [ ] **Step 3: Verify store works**

Run: `npm run build && vitest run src/stores/__tests__/cronJobs.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/cronJobs.ts
git commit -m "refactor(frontend): convert cronJobs store to use createAsyncStore factory"
```

---

### Task C-3: Refactor remaining stores

**Files:**
- Modify: `src/stores/taskQueue.ts`
- Modify: `src/stores/executionLogs.ts`
- Modify: `src/stores/webhooks.ts`

- [ ] **Step 1: Batch refactor all stores**

Apply same factory pattern to each store.

- [ ] **Step 2: Verify all stores work**

Run: `npm run build && vitest run src/stores/`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/stores/taskQueue.ts src/stores/executionLogs.ts src/stores/webhooks.ts
git commit -m "refactor(frontend): convert all stores to use createAsyncStore factory (~400 lines saved)"
```

---

## Section D: Frontend API Client Factory Pattern

**Problem**: ~350 lines of duplicate try/catch pattern across 69 API methods.

**Solution**: Create `createApiMethod` factory.

### Task D-1: Create API Method Factory

**Files:**
- Create: `src/lib/api/create-api-method.ts`
- Test: `src/lib/api/__tests__/create-api-method.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/api/__tests__/create-api-method.test.ts
import { createApiMethod } from '../create-api-method'
import { apiClient } from '../client'

describe('createApiMethod', () => {
  it('should create method that returns success response', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { id: '1', name: 'Test' } } })
    
    const getItem = createApiMethod<{ id: string }, { id: string; name: string }>({
      method: 'GET',
      path: '/items/:id'
    })
    
    const result = await getItem({ id: '1' })
    
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: '1', name: 'Test' })
  })
  
  it('should handle API errors', async () => {
    jest.spyOn(apiClient, 'get').mockRejectedValue({ response: { data: { message: 'Not found' } } })
    
    const getItem = createApiMethod<{ id: string }, any>({
      method: 'GET',
      path: '/items/:id'
    })
    
    const result = await getItem({ id: '999' })
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not found')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run src/lib/api/__tests__/create-api-method.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/api/create-api-method.ts
import { apiClient } from './client'
import { ApiResponse } from './types'
import { toApiResponse } from './error-handler'

interface ApiMethodConfig<TParams, TResult> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string | ((params: TParams) => string)
  transformResult?: (data: any) => TResult
}

/**
 * Factory for creating API methods.
 * Eliminates ~350 lines of duplicate try/catch patterns.
 * 
 * @example
 * const getJob = createApiMethod<{ id: string }, CronJob>({
 *   method: 'GET',
 *   path: '/cron/jobs/:id'
 * })
 * 
 * const result = await getJob({ id: '123' })
 */
export function createApiMethod<TParams extends Record<string, any>, TResult>(
  config: ApiMethodConfig<TParams, TResult>
): (params: TParams) => Promise<ApiResponse<TResult>> {
  
  return async (params: TParams): Promise<ApiResponse<TResult>> => {
    try {
      // Resolve path with params
      const path = typeof config.path === 'function'
        ? config.path(params)
        : resolvePathParams(config.path, params)
      
      // Make request based on method
      let response
      switch (config.method) {
        case 'GET':
          response = await apiClient.get(path, { params: params.query })
          break
        case 'POST':
          response = await apiClient.post(path, params.body)
          break
        case 'PUT':
          response = await apiClient.put(path, params.body)
          break
        case 'PATCH':
          response = await apiClient.patch(path, params.body)
          break
        case 'DELETE':
          response = await apiClient.delete(path)
          break
      }
      
      const data = config.transformResult?.(response.data.data) ?? response.data.data
      return { success: true, data }
    } catch (error) {
      return toApiResponse(error)
    }
  }
}

function resolvePathParams(path: string, params: Record<string, any>): string {
  return path.replace(/:([a-zA-Z_]+)/g, (_, key) => {
    return params[key] ?? params.path?.[key] ?? ''
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run src/lib/api/__tests__/create-api-method.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/create-api-method.ts src/lib/api/__tests__/create-api-method.test.ts
git commit -m "feat(frontend): add createApiMethod factory for API client deduplication"
```

---

### Task D-2: Refactor cron.ts API file

**Files:**
- Modify: `src/lib/api/cron.ts`

- [ ] **Step 1: Create refactored version**

```typescript
// src/lib/api/cron.ts (refactored - 59 methods)
import { createApiMethod } from './create-api-method'
import { transformJobResponse, transformTaskResponse } from './transforms'
import { CronJob, TaskQueueItem, ExecutionLog } from '@/types/cron'

// Jobs API
export const getJobs = createApiMethod<{ page?: number; limit?: number }, { items: CronJob[]; pagination: any }>({
  method: 'GET',
  path: '/cron/jobs'
})

export const getJob = createApiMethod<{ id: string }, CronJob>({
  method: 'GET',
  path: '/cron/jobs/:id',
  transformResult: transformJobResponse
})

export const createJob = createApiMethod<{ body: CreateJobInput }, CronJob>({
  method: 'POST',
  path: '/cron/jobs',
  transformResult: transformJobResponse
})

export const updateJob = createApiMethod<{ id: string; body: UpdateJobInput }, CronJob>({
  method: 'PUT',
  path: '/cron/jobs/:id',
  transformResult: transformJobResponse
})

export const deleteJob = createApiMethod<{ id: string }, void>({
  method: 'DELETE',
  path: '/cron/jobs/:id'
})

export const toggleJob = createApiMethod<{ id: string; active: boolean }, CronJob>({
  method: 'POST',
  path: '/cron/jobs/:id/toggle',
  transformResult: transformJobResponse
})

// ... (repeat for all 59 methods)
```

- [ ] **Step 2: Verify API works**

Run: `npm run build && vitest run src/lib/api/__tests__/cron.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/cron.ts src/lib/api/transforms.ts
git commit -m "refactor(frontend): convert cron API to use createApiMethod factory (~200 lines saved)"
```

---

## Section E: Routes Using Domain Services (Not Bypassing)

**Problem**: Routes in jobs.ts and media.ts directly call DatabaseService, bypassing domain services.

**Solution**: Update routes to use domain services only.

### Task E-1: Fix jobs.ts route to use domain services

**Files:**
- Modify: `server/routes/cron/jobs.ts`

- [ ] **Step 1: Identify bypass patterns**

Current pattern (lines 32-34):
```typescript
const db = getDatabaseService()  // BYPASSING!
const jobService = getJobService()
```

- [ ] **Step 2: Remove DatabaseService import**

```typescript
// server/routes/cron/jobs.ts (fixed)
import { Router } from 'express'
import { asyncHandler } from '../../middleware/async-handler'
import { getJobService } from '../../service-registration'
import { buildOwnerFilter } from '../../middleware/data-isolation'
import { withEntityNotFound, successResponse } from '../../utils/api-response'

const router = Router()

// GET / - List all jobs
router.get('/', asyncHandler(async (req, res) => {
  const ownerId = buildOwnerFilter(req).params[0]
  const jobService = getJobService()
  const jobs = await jobService.getAll(ownerId)
  successResponse(res, { items: jobs })
}))

// POST / - Create job
router.post('/', asyncHandler(async (req, res) => {
  const ownerId = buildOwnerFilter(req).params[0]
  const jobService = getJobService()
  const job = await jobService.create(req.body, ownerId)
  successResponse(res, job)
}))

// ... (all endpoints use jobService only)
```

- [ ] **Step 3: Verify routes work**

Run: `npm run build && vitest run server/routes/cron/__tests__/jobs.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/routes/cron/jobs.ts
git commit -m "refactor(server): remove DatabaseService bypass from jobs route"
```

---

### Task E-2: Fix media.ts route

**Files:**
- Modify: `server/routes/media.ts`

- [ ] **Step 1: Apply same pattern**

Remove `getDatabaseService()` imports, use `getMediaService()` only.

- [ ] **Step 2: Commit**

```bash
git add server/routes/media.ts
git commit -m "refactor(server): remove DatabaseService bypass from media route"
```

---

## Section F: Validation Schema Helpers

**Problem**: 30+ instances of `z.string().min(1, 'id is required')` pattern.

**Solution**: Add `idSchema()` helper.

### Task F-1: Add idSchema helper

**Files:**
- Modify: `server/validation/common.ts`

- [ ] **Step 1: Add idSchema helper**

```typescript
// server/validation/common.ts
import { z } from 'zod'

export const idSchema = (name = 'id') => z.string().min(1, `${name} is required`)

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
```

- [ ] **Step 2: Update schemas to use helper**

```typescript
// server/validation/cron-schemas.ts (refactored)
import { idSchema, paginationSchema } from './common'

export const jobIdSchema = z.object({
  id: idSchema('job id')
})

export const listJobsSchema = paginationSchema.extend({
  status: z.enum(['active', 'inactive']).optional()
})
```

- [ ] **Step 3: Commit**

```bash
git add server/validation/common.ts server/validation/cron-schemas.ts server/validation/media-schemas.ts
git commit -m "refactor(validation): add idSchema helper, replace 30+ duplicate patterns"
```

---

## Summary of Changes

| Category | Files Created | Files Modified | Lines Saved |
|----------|---------------|----------------|-------------|
| Backend API Proxy Factory | 2 | 8 | ~200 |
| Backend Domain Services | 1 | 2 | ~50 |
| Frontend Store Factory | 2 | 4 | ~400 |
| Frontend API Client Factory | 1 | 5 | ~350 |
| Routes Domain Services Fix | 0 | 2 | ~0 |
| Validation Helpers | 0 | 3 | ~60 |
| **Total** | **6** | **24** | **~1060** |

---

## Verification Commands

After completing all tasks:

```bash
# Build verification
npm run build

# Test verification
vitest run

# Lint verification
npm run lint

# Line count verification
wc -l server/routes/text.ts server/routes/voice.ts src/stores/cronJobs.ts src/lib/api/cron.ts
```

Expected: All tests pass, TypeScript compiles, line counts reduced.

---

**Plan complete. Two execution options:**

1. **Subagent-Driven (recommended)** - Fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?