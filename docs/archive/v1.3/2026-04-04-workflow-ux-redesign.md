# Workflow UX Redesign - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive UX improvements for the Workflow System (WebSocket real-time integration, test run mode, visual configuration, template marketplace)

**Architecture:** Phase-based implementation starting with WebSocket infrastructure as foundation, followed by configuration optimization, testing capabilities, and discovery features. Each phase builds incrementally on previous work.

**Tech Stack:** React + TypeScript + Zustand + WebSocket + Express + SQLite

**Design Spec Reference:** @docs/specs/2026-04-04-workflow-ux-redesign-design.md

---

## Overview

This plan implements the UX redesign for the Workflow System based on the design specification. The implementation is organized into 4 phases:

1. **Phase 1: WebSocket Real-time Integration** (Foundation - must be first)
2. **Phase 2: Configuration Experience Optimization**
3. **Phase 3: Test & Debug Capabilities**
4. **Phase 4: Discovery & Sharing**

**Total Estimated Effort:** 47-62 hours

---

## Phase 1: WebSocket Real-time Integration (Priority: P0)

**Goal:** Connect existing WebSocket infrastructure to Zustand Stores for real-time state updates

**Effort:** 12-16 hours

**Dependencies:** None (this is the foundation)

**Rationale:** Currently WebSocket events only show Toast notifications. This phase enables all stores to react to real-time events, which is prerequisite for Phases 2-4.

### Task 1.1: Extend WebSocket Event Types and Client

**Files:**
- Modify: `src/lib/websocket-client.ts:1-396`
- Modify: `src/hooks/useWebSocket.ts:1-120`

**Steps:**

- [ ] **Step 1: Add new event type definitions**

```typescript
// Add to src/lib/websocket-client.ts after line 6
export type ExtendedWebSocketMessage = WebSocketMessage | {
  type: 'task_created' | 'task_updated' | 'task_completed' | 'task_failed' | 'task_moved_to_dlq' |
        'log_created' | 'log_updated' |
        'job_created' | 'job_updated' | 'job_deleted' | 'job_toggled' | 'job_executed' |
        'workflow_test_started' | 'workflow_test_completed' | 'workflow_node_output'
  timestamp: string
  payload?: unknown
}

export interface TaskEventPayload {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  jobId?: string
  result?: unknown
  error?: string
}

export interface LogEventPayload {
  id: string
  jobId: string
  status: 'success' | 'failed'
  output?: unknown
  error?: string
  executedAt: string
}
```

- [ ] **Step 2: Extend channel subscriptions**

```typescript
// Modify src/lib/websocket-client.ts line 16
export type WebSocketChannel = 'all' | 'jobs' | 'tasks' | 'logs' | 'workflows'

// Add workflow channel support in getChannelFromType() around line 248
private getChannelFromType(type: string): string {
  if (type.startsWith('job_')) return 'jobs'
  if (type.startsWith('task_')) return 'tasks'
  if (type.startsWith('log_')) return 'logs'
  if (type.startsWith('workflow_')) return 'workflows'
  return 'all'
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/lib/websocket-client.ts
git commit -m "feat(websocket): extend event types for workflow real-time updates"
```

---

### Task 1.2: Integrate taskQueue Store with WebSocket

**Files:**
- Modify: `src/stores/taskQueue.ts:1-164`

**Steps:**

- [ ] **Step 1: Import WebSocket client and add subscription**

```typescript
// Add imports at top of src/stores/taskQueue.ts
import { getWebSocketClient } from '@/lib/websocket-client'
import type { TaskEventPayload } from '@/lib/websocket-client'

// Add subscription tracking in interface after line 22
interface TaskQueueState {
  // ... existing properties
  _wsUnsubscribe?: () => void
  subscribeToWebSocket: () => void
  unsubscribeFromWebSocket: () => void
}
```

- [ ] **Step 2: Add WebSocket event handlers in store**

```typescript
// Add inside the persist callback after line 133
subscribeToWebSocket: () => {
  const client = getWebSocketClient()
  if (!client) return
  
  // Prevent double subscription
  const currentUnsub = get()._wsUnsubscribe
  if (currentUnsub) return
  
  const unsub = client.onEvent('tasks', (event) => {
    const { type, payload } = event
    const taskPayload = payload as TaskEventPayload
    
    switch (type) {
      case 'task_created':
        set((state) => {
          // Only add if not already exists (avoid duplication from optimistic updates)
          if (state.tasks.find(t => t.id === taskPayload.id)) return state
          return {
            tasks: [taskPayload as TaskQueueItem, ...state.tasks]
          }
        })
        break
        
      case 'task_updated':
      case 'task_completed':
      case 'task_failed':
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskPayload.id
              ? { ...task, ...taskPayload, status: taskPayload.status }
              : task
          )
        }))
        break
    }
  })
  
  set({ _wsUnsubscribe: unsub })
},

unsubscribeFromWebSocket: () => {
  const unsub = get()._wsUnsubscribe
  if (unsub) {
    unsub()
    set({ _wsUnsubscribe: undefined })
  }
}
```

- [ ] **Step 3: Create hook for automatic subscription**

Create file: `src/hooks/useTaskQueueWebSocket.ts`

```typescript
import { useEffect } from 'react'
import { useTaskQueueStore } from '@/stores/taskQueue'

export function useTaskQueueWebSocket() {
  const subscribe = useTaskQueueStore((state) => state.subscribeToWebSocket)
  const unsubscribe = useTaskQueueStore((state) => state.unsubscribeFromWebSocket)
  
  useEffect(() => {
    subscribe()
    return () => unsubscribe()
  }, [subscribe, unsubscribe])
}
```

- [ ] **Step 4: Commit changes**

```bash
git add src/stores/taskQueue.ts src/hooks/useTaskQueueWebSocket.ts
git commit -m "feat(stores): integrate taskQueue store with WebSocket real-time updates"
```

---

### Task 1.3: Integrate executionLogs Store with WebSocket

**Files:**
- Modify: `src/stores/executionLogs.ts:1-74`

**Steps:**

- [ ] **Step 1: Import WebSocket client and add subscription**

```typescript
// Add imports at top of src/stores/executionLogs.ts
import { getWebSocketClient } from '@/lib/websocket-client'
import type { LogEventPayload } from '@/lib/websocket-client'

// Add to interface after line 10
interface ExecutionLogsState {
  // ... existing properties
  _wsUnsubscribe?: () => void
  subscribeToWebSocket: () => void
  unsubscribeFromWebSocket: () => void
}
```

- [ ] **Step 2: Add WebSocket event handlers**

```typescript
// Add inside persist callback after line 62
subscribeToWebSocket: () => {
  const client = getWebSocketClient()
  if (!client) return
  
  const currentUnsub = get()._wsUnsubscribe
  if (currentUnsub) return
  
  const unsub = client.onEvent('logs', (event) => {
    const { type, payload } = event
    const logPayload = payload as LogEventPayload
    
    switch (type) {
      case 'log_created':
        set((state) => {
          // Add new log to beginning, avoid duplicates
          if (state.logs.find(l => l.id === logPayload.id)) return state
          return {
            logs: [logPayload as ExecutionLog, ...state.logs].slice(0, 100) // Keep last 100
          }
        })
        break
        
      case 'log_updated':
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === logPayload.id ? { ...log, ...logPayload } : log
          )
        }))
        break
    }
  })
  
  set({ _wsUnsubscribe: unsub })
},

unsubscribeFromWebSocket: () => {
  const unsub = get()._wsUnsubscribe
  if (unsub) {
    unsub()
    set({ _wsUnsubscribe: undefined })
  }
}
```

- [ ] **Step 3: Create hook for automatic subscription**

Create file: `src/hooks/useExecutionLogsWebSocket.ts`

```typescript
import { useEffect } from 'react'
import { useExecutionLogsStore } from '@/stores/executionLogs'

export function useExecutionLogsWebSocket() {
  const subscribe = useExecutionLogsStore((state) => state.subscribeToWebSocket)
  const unsubscribe = useExecutionLogsStore((state) => state.unsubscribeFromWebSocket)
  
  useEffect(() => {
    subscribe()
    return () => unsubscribe()
  }, [subscribe, unsubscribe])
}
```

- [ ] **Step 4: Commit changes**

```bash
git add src/stores/executionLogs.ts src/hooks/useExecutionLogsWebSocket.ts
git commit -m "feat(stores): integrate executionLogs store with WebSocket real-time updates"
```

---

### Task 1.4: Integrate cronJobs Store with WebSocket

**Files:**
- Modify: `src/stores/cronJobs.ts:1-302`

**Steps:**

- [ ] **Step 1: Import WebSocket client and add subscription**

```typescript
// Add imports at top of src/stores/cronJobs.ts
import { getWebSocketClient } from '@/lib/websocket-client'

// Add to interface after line 56
interface CronJobsState {
  // ... existing properties
  _wsUnsubscribe?: () => void
  subscribeToWebSocket: () => void
  unsubscribeFromWebSocket: () => void
}
```

- [ ] **Step 2: Add WebSocket event handlers**

```typescript
// Add to create() after line 300
subscribeToWebSocket: () => {
  const client = getWebSocketClient()
  if (!client) return
  
  const currentUnsub = get()._wsUnsubscribe
  if (currentUnsub) return
  
  const unsub = client.onEvent('jobs', (event) => {
    const { type, payload } = event
    
    switch (type) {
      case 'job_created': {
        const newJob = transformJobResponse(payload as BackendJob)
        set((state) => {
          if (state.jobs.find(j => j.id === newJob.id)) return state
          return { jobs: [...state.jobs, newJob] }
        })
        break
      }
      
      case 'job_updated':
      case 'job_toggled': {
        const updatedJob = transformJobResponse(payload as BackendJob)
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === updatedJob.id ? { ...job, ...updatedJob } : job
          )
        }))
        break
      }
      
      case 'job_deleted': {
        const { id } = payload as { id: string }
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== id)
        }))
        break
      }
      
      case 'job_executed': {
        const { jobId, success } = payload as { jobId: string; success: boolean }
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  lastRunAt: new Date().toISOString(),
                  totalRuns: job.totalRuns + 1,
                  totalFailures: success ? job.totalFailures : job.totalFailures + 1
                }
              : job
          )
        }))
        break
      }
    }
  })
  
  set({ _wsUnsubscribe: unsub })
},

unsubscribeFromWebSocket: () => {
  const unsub = get()._wsUnsubscribe
  if (unsub) {
    unsub()
    set({ _wsUnsubscribe: undefined })
  }
}
```

- [ ] **Step 3: Create hook for automatic subscription**

Create file: `src/hooks/useCronJobsWebSocket.ts`

```typescript
import { useEffect } from 'react'
import { useCronJobsStore } from '@/stores/cronJobs'

export function useCronJobsWebSocket() {
  const subscribe = useCronJobsStore((state) => state.subscribeToWebSocket)
  const unsubscribe = useCronJobsStore((state) => state.unsubscribeFromWebSocket)
  
  useEffect(() => {
    subscribe()
    return () => unsubscribe()
  }, [subscribe, unsubscribe])
}
```

- [ ] **Step 4: Apply hooks in relevant pages**

Modify: `src/pages/CronManagement.tsx` - Add hook import and call

```typescript
// Add import at top
import { useCronJobsWebSocket } from '@/hooks/useCronJobsWebSocket'
import { useTaskQueueWebSocket } from '@/hooks/useTaskQueueWebSocket'
import { useExecutionLogsWebSocket } from '@/hooks/useExecutionLogsWebSocket'

// Inside component, add:
function CronManagement() {
  useCronJobsWebSocket()
  useTaskQueueWebSocket()
  useExecutionLogsWebSocket()
  // ... rest of component
}
```

- [ ] **Step 5: Commit changes**

```bash
git add src/stores/cronJobs.ts src/hooks/useCronJobsWebSocket.ts src/pages/CronManagement.tsx
git commit -m "feat(stores): integrate cronJobs store with WebSocket and apply to CronManagement page"
```

---

## Phase 2: Configuration Experience Optimization (Priority: P1)

**Goal:** Reduce configuration complexity with visual builders and real-time validation

**Effort:** 15-20 hours

**Dependencies:** Phase 1 (for real-time validation feedback)

### Task 2.1: Cron Expression Visual Builder

**Files:**
- Create: `src/components/cron/CronExpressionBuilder.tsx`
- Modify: `src/pages/CronManagement.tsx` (add to job creation form)
- Modify: `server/routes/cron.ts` (add validation endpoint)

**Effort:** 5-7 hours

**Steps:**

- [ ] **Step 1: Create visual builder component with preset options**

```typescript
// src/components/cron/CronExpressionBuilder.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface CronExpressionBuilderProps {
  value: string
  onChange: (expression: string) => void
  className?: string
}

type PresetType = 'daily' | 'weekly' | 'monthly' | 'custom'

const PRESETS: Record<PresetType, { label: string; expression: string; description: string }> = {
  daily: { label: '每天', expression: '0 9 * * *', description: '每天 09:00' },
  weekly: { label: '每周', expression: '0 9 * * 1', description: '每周一 09:00' },
  monthly: { label: '每月', expression: '0 9 1 * *', description: '每月1日 09:00' },
  custom: { label: '自定义', expression: '0 9 * * *', description: '自定义配置' },
}

export function CronExpressionBuilder({ value, onChange, className }: CronExpressionBuilderProps) {
  const [preset, setPreset] = React.useState<PresetType>('daily')
  const [minutes, setMinutes] = React.useState(0)
  const [hours, setHours] = React.useState(9)
  const [date, setDate] = React.useState('*')
  const [month, setMonth] = React.useState('*')
  const [weekday, setWeekday] = React.useState('*')
  const [nextExecutions, setNextExecutions] = React.useState<Date[]>([])
  
  // Parse initial value
  React.useEffect(() => {
    const parts = value.split(' ')
    if (parts.length === 5) {
      setMinutes(parseInt(parts[0]) || 0)
      setHours(parseInt(parts[1]) || 0)
      setDate(parts[2] || '*')
      setMonth(parts[3] || '*')
      setWeekday(parts[4] || '*')
    }
  }, [])
  
  // Build expression from components
  React.useEffect(() => {
    const expression = `${minutes} ${hours} ${date} ${month} ${weekday}`
    onChange(expression)
    
    // Calculate next 5 executions
    calculateNextExecutions(expression)
  }, [minutes, hours, date, month, weekday])
  
  const calculateNextExecutions = async (expression: string) => {
    try {
      const response = await fetch(`/api/cron/preview-schedule?expression=${encodeURIComponent(expression)}`)
      const data = await response.json()
      if (data.success) {
        setNextExecutions(data.data.nextExecutions.map((d: string) => new Date(d)))
      }
    } catch {
      // Fallback: basic calculation
      const dates: Date[] = []
      let current = new Date()
      for (let i = 0; i < 5; i++) {
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
        dates.push(current)
      }
      setNextExecutions(dates)
    }
  }
  
  const handlePresetChange = (newPreset: PresetType) => {
    setPreset(newPreset)
    if (newPreset !== 'custom') {
      const expr = PRESETS[newPreset].expression
      const parts = expr.split(' ')
      setMinutes(parseInt(parts[0]))
      setHours(parseInt(parts[1]))
      setDate(parts[2])
      setMonth(parts[3])
      setWeekday(parts[4])
    }
  }
  
  const formatWeekday = (day: string) => {
    const days = ['日', '一', '二', '三', '四', '五', '六']
    const num = parseInt(day)
    return isNaN(num) ? '每天' : `周${days[num % 7]}`
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Preset selection */}
      <div className="flex gap-2">
        {(Object.keys(PRESETS) as PresetType[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePresetChange(p)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              preset === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {PRESETS[p].label}
          </button>
        ))}
      </div>
      
      {/* Time selection */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">小时</label>
          <select
            value={hours}
            onChange={(e) => { setHours(parseInt(e.target.value)); setPreset('custom') }}
            className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
            ))}
          </select>
        </div>
        <span className="text-lg text-muted-foreground">:</span>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">分钟</label>
          <select
            value={minutes}
            onChange={(e) => { setMinutes(parseInt(e.target.value)); setPreset('custom') }}
            className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm"
          >
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Day of week (for weekly preset) */}
      {preset === 'weekly' && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">星期</label>
          <select
            value={weekday}
            onChange={(e) => setWeekday(e.target.value)}
            className="w-full px-2 py-1.5 rounded border border-border bg-background text-sm"
          >
            {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, i) => (
              <option key={i} value={i + 1}>{day}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* Expression display */}
      <div className="p-3 bg-muted rounded-md">
        <div className="text-xs text-muted-foreground mb-1">Cron 表达式</div>
        <code className="text-sm font-mono text-foreground">
          {minutes} {hours} {date} {month} {weekday}
        </code>
        <div className="text-xs text-muted-foreground mt-1">
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')} · {formatWeekday(weekday)}
        </div>
      </div>
      
      {/* Next executions preview */}
      <div>
        <div className="text-xs text-muted-foreground mb-2">接下来执行时间:</div>
        <ul className="space-y-1">
          {nextExecutions.slice(0, 5).map((date, i) => (
            <li key={i} className="text-xs text-foreground flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary/50" />
              {date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short' })}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add backend preview endpoint**

Modify: `server/routes/cron.ts` - Add new route

```typescript
// Add import at top
import { parseExpression } from 'cron-parser'

// Add route after existing routes
router.get('/preview-schedule', asyncHandler(async (req, res) => {
  const { expression } = req.query
  
  if (!expression || typeof expression !== 'string') {
    return res.status(400).json({ success: false, error: 'Expression required' })
  }
  
  try {
    const interval = parseExpression(expression, { utc: true })
    const nextExecutions: Date[] = []
    
    for (let i = 0; i < 5; i++) {
      nextExecutions.push(interval.next().toDate())
    }
    
    res.json({ success: true, data: { nextExecutions } })
  } catch (err) {
    res.status(400).json({ success: false, error: 'Invalid cron expression' })
  }
}))
```

- [ ] **Step 3: Integrate into job creation form**

Modify: CronManagement page to use the new builder

- [ ] **Step 4: Commit**

```bash
git add src/components/cron/CronExpressionBuilder.tsx server/routes/cron.ts
git commit -m "feat(cron): add visual cron expression builder with preview"
```

---

### Task 2.2: Node Configuration Form Optimization

**Files:**
- Modify: `src/components/workflow/config-panels/ActionConfigPanel.tsx`
- Create: `src/components/workflow/config-panels/FieldBuilder.tsx`
- Modify: `src/pages/WorkflowBuilder.tsx` (config panel section)

**Effort:** 5-7 hours

**Steps:**

- [ ] **Step 1: Create field builder for dynamic form generation**

```typescript
// src/components/workflow/config-panels/FieldBuilder.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface FieldDefinition {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'json' | 'template'
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  description?: string
  helpText?: string
}

interface FieldBuilderProps {
  fields: FieldDefinition[]
  values: Record<string, unknown>
  onChange: (name: string, value: unknown) => void
  errors?: Record<string, string>
}

export function FieldBuilder({ fields, values, onChange, errors }: FieldBuilderProps) {
  const renderField = (field: FieldDefinition) => {
    const value = values[field.name]
    const error = errors?.[field.name]
    
    const baseInputClass = cn(
      'w-full px-3 py-2 rounded-md bg-secondary border text-sm',
      'focus:outline-none focus:ring-2 focus:ring-primary/50',
      error ? 'border-red-500 focus:ring-red-500/50' : 'border-border'
    )
    
    switch (field.type) {
      case 'select':
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={baseInputClass}
          >
            <option value="">请选择...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )
        
      case 'textarea':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={cn(baseInputClass, 'resize-none')}
          />
        )
        
      case 'json':
        return (
          <textarea
            value={JSON.stringify(value || {}, null, 2)}
            onChange={(e) => {
              try {
                onChange(field.name, JSON.parse(e.target.value))
              } catch {
                // Allow invalid JSON while typing
              }
            }}
            placeholder='{"key": "value"}'
            rows={5}
            className={cn(baseInputClass, 'font-mono text-xs')}
          />
        )
        
      case 'template':
        return (
          <div className="relative">
            <textarea
              value={(value as string) || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder || '{{input.field}}'}
              rows={3}
              className={cn(baseInputClass, 'resize-none')}
            />
            <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/50">
              支持模板变量: {'{{'}variable{'}'}
            </div>
          </div>
        )
        
      case 'number':
        return (
          <input
            type="number"
            value={(value as number) || 0}
            onChange={(e) => onChange(field.name, parseFloat(e.target.value))}
            className={baseInputClass}
          />
        )
        
      default:
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        )
    }
  }
  
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(field)}
          {field.description && (
            <p className="text-[10px] text-muted-foreground/70 mt-1">{field.description}</p>
          )}
          {errors?.[field.name] && (
            <p className="text-[10px] text-red-500 mt-1">{errors[field.name]}</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Refactor ActionConfigPanel to use field definitions**

```typescript
// Modify src/components/workflow/config-panels/ActionConfigPanel.tsx
import { FieldBuilder, type FieldDefinition } from './FieldBuilder'

// Define field configurations for different service/method combinations
const ACTION_FIELDS: Record<string, Record<string, FieldDefinition[]>> = {
  'text': {
    'generate': [
      { name: 'model', label: '模型', type: 'select', required: true, options: [
        { value: 'abab6.5s', label: 'abab6.5s (推荐)' },
        { value: 'abab6', label: 'abab6' },
      ]},
      { name: 'prompt', label: '提示词', type: 'template', required: true, placeholder: '输入提示词，支持 {{input}} 变量' },
      { name: 'temperature', label: '温度', type: 'number', description: '控制创造性，0-2之间' },
      { name: 'max_tokens', label: '最大令牌数', type: 'number' },
    ]
  },
  'image': {
    'generate': [
      { name: 'prompt', label: '图像描述', type: 'template', required: true, placeholder: '描述你想要生成的图像' },
      { name: 'aspect_ratio', label: '宽高比', type: 'select', options: [
        { value: '1:1', label: '1:1 方形' },
        { value: '16:9', label: '16:9 宽屏' },
        { value: '9:16', label: '9:16 竖屏' },
      ]},
    ]
  },
  // ... more service definitions
}

interface ActionConfigPanelProps {
  config: {
    service: string
    method: string
    args?: unknown[]
  }
  onChange: (config: { service: string; method: string; args: unknown[] }) => void
}

export function ActionConfigPanel({ config, onChange }: ActionConfigPanelProps) {
  const { service, method, args = [] } = config
  
  const fields = ACTION_FIELDS[service]?.[method] || []
  const params = (args[0] as Record<string, unknown>) || {}
  
  const handleFieldChange = (name: string, value: unknown) => {
    onChange({
      ...config,
      args: [{ ...params, [name]: value }]
    })
  }
  
  return (
    <div className="space-y-4">
      {fields.length > 0 ? (
        <FieldBuilder
          fields={fields}
          values={params}
          onChange={handleFieldChange}
        />
      ) : (
        <div className="p-4 bg-muted/50 rounded-md text-sm text-muted-foreground">
          使用原始参数配置:
          <pre className="mt-2 text-xs font-mono overflow-auto">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add service documentation helper**

Create: `src/lib/workflow-service-docs.ts`

```typescript
export interface ServiceDoc {
  service: string
  method: string
  description: string
  inputs: { name: string; type: string; description: string; required: boolean }[]
  outputs: { name: string; type: string; description: string }[]
  examples: { title: string; config: Record<string, unknown> }[]
}

export const SERVICE_DOCUMENTATION: ServiceDoc[] = [
  {
    service: 'text',
    method: 'generate',
    description: '使用 MiniMax 大语言模型生成文本',
    inputs: [
      { name: 'prompt', type: 'string', description: '输入提示词，支持模板变量如 {{input.text}}', required: true },
      { name: 'temperature', type: 'number', description: '采样温度，0-2，越高越创造性', required: false },
    ],
    outputs: [
      { name: 'text', type: 'string', description: '生成的文本内容' },
      { name: 'usage', type: 'object', description: '令牌使用统计' },
    ],
    examples: [
      { title: '简单问答', config: { prompt: '请回答: {{input.question}}' } },
      { title: '翻译', config: { prompt: '将以下内容翻译成英文: {{input.text}}' } },
    ],
  },
  // ... more services
]

export function getServiceDoc(service: string, method: string): ServiceDoc | undefined {
  return SERVICE_DOCUMENTATION.find(d => d.service === service && d.method === method)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workflow/config-panels/
git commit -m "feat(workflow): optimize node config with field builder and service docs"
```

---

### Task 2.3: Real-time Validation Feedback

**Files:**
- Modify: `src/lib/workflow-validation.ts`
- Modify: `src/pages/WorkflowBuilder.tsx` (validation display)
- Modify: `src/components/workflow/nodes/ActionNode.tsx` (error indicators)

**Effort:** 3-4 hours

**Steps:**

- [ ] **Step 1: Enhance validation with severity levels**

```typescript
// Modify src/lib/workflow-validation.ts
export interface ValidationError {
  nodeId: string
  message: string
  severity: 'error' | 'warning'
  field?: string
  code: string
}

export function validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Check for orphaned nodes (no connections)
  nodes.forEach(node => {
    const hasConnections = edges.some(e => e.source === node.id || e.target === node.id)
    if (!hasConnections && nodes.length > 1) {
      errors.push({
        nodeId: node.id,
        message: '节点未连接到工作流',
        severity: 'warning',
        code: 'ORPHANED_NODE'
      })
    }
  })
  
  // Check action node configuration
  nodes.filter(n => n.type === 'action').forEach(node => {
    const config = node.data?.config as { service?: string; method?: string }
    if (!config?.service) {
      errors.push({
        nodeId: node.id,
        message: '动作节点需要选择服务',
        severity: 'error',
        field: 'service',
        code: 'MISSING_SERVICE'
      })
    }
    if (!config?.method) {
      errors.push({
        nodeId: node.id,
        message: '动作节点需要选择方法',
        severity: 'error',
        field: 'method',
        code: 'MISSING_METHOD'
      })
    }
  })
  
  // Check condition node
  nodes.filter(n => n.type === 'condition').forEach(node => {
    const condition = node.data?.condition as string
    if (!condition || condition.trim() === '') {
      errors.push({
        nodeId: node.id,
        message: '条件节点需要设置判断条件',
        severity: 'error',
        field: 'condition',
        code: 'MISSING_CONDITION'
      })
    }
  })
  
  // Check for cycles
  const cycles = detectCycles(nodes, edges)
  cycles.forEach(cycle => {
    errors.push({
      nodeId: cycle[0],
      message: '检测到循环依赖',
      severity: 'error',
      code: 'CYCLE_DETECTED'
    })
  })
  
  return errors
}

function detectCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[][] {
  // Simple cycle detection using DFS
  const cycles: string[][] = []
  const graph = new Map<string, string[]>()
  
  edges.forEach(edge => {
    if (!graph.has(edge.source)) graph.set(edge.source, [])
    graph.get(edge.source)!.push(edge.target)
  })
  
  const visited = new Set<string>()
  const recStack = new Set<string>()
  
  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId)
    recStack.add(nodeId)
    path.push(nodeId)
    
    const neighbors = graph.get(nodeId) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path])
      } else if (recStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor)
        cycles.push(path.slice(cycleStart))
      }
    }
    
    recStack.delete(nodeId)
  }
  
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, [])
    }
  })
  
  return cycles
}
```

- [ ] **Step 2: Add inline validation to config panel**

Modify ConfigPanel in WorkflowBuilder.tsx to show field-level errors:

```typescript
// In ConfigPanel component, add validationErrors prop
interface ConfigPanelProps {
  node: Node | null
  onClose: () => void
  onSave: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  validationErrors: ValidationError[] // Add this
}

// Inside render, get node-specific errors
const nodeErrors = validationErrors.filter(e => e.nodeId === node?.id)
const fieldErrors = nodeErrors.reduce((acc, e) => {
  if (e.field) acc[e.field] = e.message
  return acc
}, {} as Record<string, string>)
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/workflow-validation.ts
git commit -m "feat(workflow): enhance validation with severity levels and cycle detection"
```

---

### Task 2.4: Error Message Improvements

**Files:**
- Create: `src/lib/workflow-error-messages.ts`
- Modify: `src/components/workflow/nodes/ActionNode.tsx`

**Effort:** 2-3 hours

**Steps:**

- [ ] **Step 1: Create human-readable error messages**

```typescript
// src/lib/workflow-error-messages.ts
export const ERROR_MESSAGES: Record<string, { title: string; description: string; suggestion: string }> = {
  ORPHANED_NODE: {
    title: '未连接的节点',
    description: '该节点没有与其他节点连接',
    suggestion: '拖动连接线将此节点接入工作流，或删除不需要的节点',
  },
  MISSING_SERVICE: {
    title: '缺少服务配置',
    description: '动作节点需要指定要调用的服务',
    suggestion: '在配置面板中选择服务类型（如 text, image, voice）',
  },
  MISSING_METHOD: {
    title: '缺少方法配置',
    description: '动作节点需要指定要调用的具体方法',
    suggestion: '在配置面板中选择方法（如 generate, chat）',
  },
  MISSING_CONDITION: {
    title: '缺少条件表达式',
    description: '条件节点需要设置判断逻辑',
    suggestion: '在配置面板中输入条件表达式，如 {{input.score}} > 0.5',
  },
  CYCLE_DETECTED: {
    title: '循环依赖',
    description: '工作流中检测到循环引用',
    suggestion: '确保节点连接形成有向无环图(DAG)，移除循环连接',
  },
  INVALID_TEMPLATE: {
    title: '无效的模板语法',
    description: '模板变量格式不正确',
    suggestion: '使用双花括号格式: {{nodeId.output}}',
  },
}

export function getErrorHelp(code: string) {
  return ERROR_MESSAGES[code] || {
    title: '配置错误',
    description: '节点配置存在问题',
    suggestion: '检查配置面板中的设置',
  }
}
```

- [ ] **Step 2: Add error tooltips to nodes**

Modify ActionNode to show error indicators with helpful messages.

- [ ] **Step 3: Commit**

```bash
git add src/lib/workflow-error-messages.ts
git commit -m "feat(workflow): add human-readable error messages with help suggestions"
```

---

## Phase 3: Test & Debug Capabilities (Priority: P1)

**Goal:** Enable testing workflows without creating cron jobs, with visual debugging

**Effort:** 12-16 hours

**Dependencies:** Phase 1 (for real-time execution updates)

### Task 3.1: Test Run Mode API (Backend)

**Files:**
- Create: `server/routes/workflows.ts` (add test-run endpoint)
- Modify: `server/services/workflow-engine.ts` (add dry-run support)

**Effort:** 4-5 hours

**Steps:**

- [ ] **Step 1: Add test-run endpoint**

Modify: `server/routes/workflows.ts`

```typescript
// Add test-run endpoint
router.post('/:id/test-run', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { testData = {}, dryRun = false } = req.body
  const ownerId = buildOwnerFilter(req).params[0]
  
  // Get workflow
  const workflow = await db.getWorkflowTemplateById(id, ownerId)
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' })
  }
  
  // Parse workflow
  const nodes = JSON.parse(workflow.nodes_json)
  const edges = JSON.parse(workflow.edges_json)
  
  // Generate execution ID
  const executionId = crypto.randomUUID()
  
  // Emit start event
  cronEvents.emit('workflow_test_started', { 
    workflowId: id, 
    executionId,
    timestamp: new Date().toISOString()
  })
  
  try {
    // Execute with test data
    const result = await workflowEngine.executeWorkflow({
      id: executionId,
      nodes,
      edges,
      testData,
      dryRun, // If true, don't call actual APIs
    })
    
    // Emit completion event
    cronEvents.emit('workflow_test_completed', {
      workflowId: id,
      executionId,
      result,
      timestamp: new Date().toISOString()
    })
    
    res.json({
      success: true,
      data: {
        executionId,
        nodes: result.nodeResults.map((r: { nodeId: string; status: string; output: unknown; duration: number }) => ({
          id: r.nodeId,
          status: r.status,
          output: r.output,
          duration: r.duration,
        })),
        duration: result.totalDuration,
        status: result.success ? 'completed' : 'failed',
      }
    })
  } catch (err) {
    cronEvents.emit('workflow_test_completed', {
      workflowId: id,
      executionId,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Test run failed'
    })
  }
}))
```

- [ ] **Step 2: Add dry-run support to workflow engine**

Modify: `server/services/workflow-engine.ts`

```typescript
// Add test execution options
interface TestExecutionOptions {
  testData?: Record<string, unknown>
  dryRun?: boolean
}

// Modify executeWorkflow to support test mode
async executeWorkflow(
  workflow: Workflow,
  options: TestExecutionOptions = {}
): Promise<ExecutionResult> {
  const { testData = {}, dryRun = false } = options
  
  // ... existing validation
  
  // Initialize context with test data
  const context: ExecutionContext = {
    nodeOutputs: new Map(),
    testData,
    dryRun,
  }
  
  // For each node execution
  for (const node of sortedNodes) {
    if (dryRun && node.type === 'action') {
      // Return mock output instead of calling API
      const mockOutput = testData[node.id]?.mockResponse || {
        success: true,
        message: '[Dry Run] API call skipped',
      }
      context.nodeOutputs.set(node.id, mockOutput)
      
      // Emit node output for real-time updates
      cronEvents.emit('workflow_node_output', {
        nodeId: node.id,
        output: mockOutput,
        executionId: workflow.id,
      })
    } else {
      // Normal execution
      // ... existing execution logic
    }
  }
  
  // ... return result
}
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/workflows.ts server/services/workflow-engine.ts
git commit -m "feat(workflow): add test-run API with dry-run and mock data support"
```

---

### Task 3.2: Frontend Test Run Button & UI

**Files:**
- Modify: `src/pages/WorkflowBuilder.tsx` (add test run button)
- Create: `src/components/workflow/TestRunPanel.tsx`

**Effort:** 4-5 hours

**Steps:**

- [ ] **Step 1: Create test run panel component**

```typescript
// src/components/workflow/TestRunPanel.tsx
import React from 'react'
import { Play, RotateCcw, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'

interface TestRunPanelProps {
  workflowId: string
  nodes: Node[]
  onTestDataChange?: (data: Record<string, unknown>) => void
}

export function TestRunPanel({ workflowId, nodes, onTestDataChange }: TestRunPanelProps) {
  const [isRunning, setIsRunning] = React.useState(false)
  const [result, setResult] = React.useState<{
    status: 'success' | 'failed'
    nodes: Array<{ id: string; status: string; output?: unknown; duration?: number }>
    duration: number
  } | null>(null)
  const [testData, setTestData] = React.useState<Record<string, unknown>>({})
  const [showConfig, setShowConfig] = React.useState(false)
  
  const handleRun = async () => {
    setIsRunning(true)
    setResult(null)
    
    try {
      const response = await apiClient.post(`/workflows/${workflowId}/test-run`, {
        testData,
        dryRun: false,
      })
      
      if (response.data?.success) {
        setResult({
          status: response.data.data.status === 'completed' ? 'success' : 'failed',
          nodes: response.data.data.nodes,
          duration: response.data.data.duration,
        })
      }
    } catch (err) {
      setResult({ status: 'failed', nodes: [], duration: 0 })
    }
    
    setIsRunning(false)
  }
  
  const handleDryRun = async () => {
    setIsRunning(true)
    setResult(null)
    
    try {
      const response = await apiClient.post(`/workflows/${workflowId}/test-run`, {
        testData,
        dryRun: true,
      })
      
      if (response.data?.success) {
        setResult({
          status: 'success',
          nodes: response.data.data.nodes,
          duration: response.data.data.duration,
        })
      }
    } catch (err) {
      setResult({ status: 'failed', nodes: [], duration: 0 })
    }
    
    setIsRunning(false)
  }
  
  return (
    <div className="space-y-4">
      {/* Run buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md',
            'text-sm font-medium transition-colors',
            isRunning
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          )}
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          运行测试
        </button>
        <button
          onClick={handleDryRun}
          disabled={isRunning}
          className="px-4 py-2 rounded-md bg-secondary text-foreground/80 text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          模拟运行
        </button>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-3 py-2 rounded-md border border-border text-sm"
        >
          测试数据
        </button>
      </div>
      
      {/* Test data config */}
      {showConfig && (
        <div className="p-3 bg-muted/50 rounded-md">
          <div className="text-xs text-muted-foreground mb-2">模拟节点输出数据 (JSON):</div>
          <textarea
            value={JSON.stringify(testData, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                setTestData(parsed)
                onTestDataChange?.(parsed)
              } catch {}
            }}
            className="w-full h-24 px-2 py-1 text-xs font-mono bg-background border border-border rounded"
            placeholder='{"node-1": {"mockResponse": {"text": "示例输出"}}}'
          />
        </div>
      )}
      
      {/* Results */}
      {result && (
        <div className="border border-border rounded-md overflow-hidden">
          <div className={cn(
            'px-3 py-2 flex items-center gap-2 text-sm font-medium',
            result.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          )}>
            {result.status === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {result.status === 'success' ? '测试成功' : '测试失败'}
            <span className="text-xs text-muted-foreground ml-auto">{result.duration}ms</span>
          </div>
          <div className="divide-y divide-border">
            {result.nodes.map((node) => (
              <div key={node.id} className="px-3 py-2 flex items-center gap-2 text-xs">
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  node.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                )} />
                <span className="font-medium">{node.id}</span>
                <span className="text-muted-foreground">{node.duration}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add test run button to WorkflowBuilder toolbar**

Modify WorkflowBuilder.tsx to add Test Run button in Toolbar.

- [ ] **Step 3: Commit**

```bash
git add src/components/workflow/TestRunPanel.tsx src/pages/WorkflowBuilder.tsx
git commit -m "feat(workflow): add test run panel with dry-run and mock data support"
```

---

### Task 3.3: Node Output Preview Panel

**Files:**
- Create: `src/components/workflow/NodeOutputPanel.tsx`
- Modify: `src/pages/WorkflowBuilder.tsx` (integrate)

**Effort:** 3-4 hours

**Steps:**

- [ ] **Step 1: Create output preview component**

```typescript
// src/components/workflow/NodeOutputPanel.tsx
import React from 'react'
import { X, Copy, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NodeOutputPanelProps {
  nodeId: string
  nodeName: string
  input?: unknown
  output?: unknown
  error?: string
  onClose: () => void
}

export function NodeOutputPanel({ nodeId, nodeName, input, output, error, onClose }: NodeOutputPanelProps) {
  const [showInput, setShowInput] = React.useState(true)
  const [showOutput, setShowOutput] = React.useState(true)
  
  const copyToClipboard = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
  }
  
  const formatValue = (value: unknown): React.ReactNode => {
    if (value === null) return <span className="text-muted-foreground">null</span>
    if (value === undefined) return <span className="text-muted-foreground">undefined</span>
    if (typeof value === 'string') return <span className="text-green-400">"{value}"</span>
    if (typeof value === 'number') return <span className="text-blue-400">{value}</span>
    if (typeof value === 'boolean') return <span className="text-purple-400">{value.toString()}</span>
    if (Array.isArray(value)) {
      return (
        <span>
          <span className="text-muted-foreground">[</span>
          <div className="pl-4">
            {value.map((item, i) => (
              <div key={i}>{formatValue(item)}{i < value.length - 1 && ','}</div>
            ))}
          </div>
          <span className="text-muted-foreground">]</span>
        </span>
      )
    }
    if (typeof value === 'object') {
      return (
        <span>
          <span className="text-muted-foreground">{'{'}</span>
          <div className="pl-4">
            {Object.entries(value as Record<string, unknown>).map(([key, val], i, arr) => (
              <div key={key}>
                <span className="text-foreground">{key}</span>
                <span className="text-muted-foreground">: </span>
                {formatValue(val)}
                {i < arr.length - 1 && ','}
              </div>
            ))}
          </div>
          <span className="text-muted-foreground">{'}'}</span>
        </span>
      )
    }
    return String(value)
  }
  
  return (
    <div className="w-80 bg-background border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{nodeName}</h3>
          <p className="text-xs text-muted-foreground">{nodeId}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-md">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* Input section */}
        {input !== undefined && (
          <div className="border-b border-border">
            <button
              onClick={() => setShowInput(!showInput)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:bg-muted/50"
            >
              <span>输入</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(input) }}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {showInput ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </div>
            </button>
            {showInput && (
              <div className="p-4 bg-muted/30 font-mono text-xs overflow-x-auto">
                {formatValue(input)}
              </div>
            )}
          </div>
        )}
        
        {/* Output section */}
        {output !== undefined && (
          <div className="border-b border-border">
            <button
              onClick={() => setShowOutput(!showOutput)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:bg-muted/50"
            >
              <span>输出</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(output) }}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {showOutput ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </div>
            </button>
            {showOutput && (
              <div className="p-4 bg-muted/30 font-mono text-xs overflow-x-auto">
                {formatValue(output)}
              </div>
            )}
          </div>
        )}
        
        {/* Error section */}
        {error && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/20">
            <div className="text-xs font-medium text-red-400 mb-1">错误</div>
            <div className="text-xs text-red-300">{error}</div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Integrate into WorkflowBuilder**

Show output panel when clicking on node during/after test run.

- [ ] **Step 3: Commit**

```bash
git add src/components/workflow/NodeOutputPanel.tsx
git commit -m "feat(workflow): add node output preview panel for debugging"
```

---

### Task 3.4: Sample Data Injection

**Files:**
- Create: `src/lib/workflow-sample-data.ts`
- Modify: `src/components/workflow/TestRunPanel.tsx`

**Effort:** 1-2 hours

**Steps:**

- [ ] **Step 1: Create sample data presets**

```typescript
// src/lib/workflow-sample-data.ts
export interface SampleDataPreset {
  name: string
  description: string
  data: Record<string, unknown>
}

export const SAMPLE_DATA_PRESETS: SampleDataPreset[] = [
  {
    name: '文本生成测试',
    description: '测试文本生成节点',
    data: {
      'input-node': {
        mockResponse: {
          text: '这是示例输入文本，用于测试工作流。',
        }
      }
    }
  },
  {
    name: '图像生成测试',
    description: '测试图像生成节点',
    data: {
      'input-node': {
        mockResponse: {
          prompt: '一只可爱的猫在草地上玩耍',
        }
      },
      'image-node': {
        mockResponse: {
          url: 'https://example.com/sample-image.png',
          seed: 12345,
        }
      }
    }
  },
  {
    name: '条件分支测试',
    description: '测试条件节点的不同分支',
    data: {
      'input-node': {
        mockResponse: {
          score: 0.8,
          passed: true,
        }
      }
    }
  },
  {
    name: '错误场景测试',
    description: '测试错误处理逻辑',
    data: {
      'action-node': {
        mockResponse: {
          error: 'API rate limit exceeded',
          code: 429,
        }
      }
    }
  },
]

export function getSamplePreset(name: string): SampleDataPreset | undefined {
  return SAMPLE_DATA_PRESETS.find(p => p.name === name)
}
```

- [ ] **Step 2: Add preset selector to test panel**

Modify TestRunPanel to include a dropdown for selecting sample data presets.

- [ ] **Step 3: Commit**

```bash
git add src/lib/workflow-sample-data.ts
git commit -m "feat(workflow): add sample data presets for test runs"
```

---

## Phase 4: Discovery & Sharing (Priority: P2)

**Goal:** Enable workflow template discovery and reuse through a marketplace

**Effort:** 8-10 hours

**Dependencies:** None (can be done in parallel with Phase 2-3 after Phase 1)

### Task 4.1: Template Marketplace Page

**Files:**
- Create: `src/pages/WorkflowMarketplace.tsx`
- Create: `src/components/workflow/marketplace/TemplateCard.tsx`
- Create: `src/components/workflow/marketplace/TemplateFilters.tsx`

**Effort:** 4-5 hours

**Steps:**

- [ ] **Step 1: Create marketplace page structure**

```typescript
// src/pages/WorkflowMarketplace.tsx
import React from 'react'
import { Search, Filter, Download, Star } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface WorkflowTemplateItem {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  nodeCount: number
  usageCount: number
  ratingAvg: number
  ratingCount: number
  thumbnailUrl?: string
  ownerName: string
  createdAt: string
}

const CATEGORIES = ['全部', '文本处理', '图像生成', '视频制作', '数据分析', '自动化']

export function WorkflowMarketplace() {
  const [templates, setTemplates] = React.useState<WorkflowTemplateItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState('全部')
  const [sortBy, setSortBy] = React.useState<'popular' | 'newest' | 'rating'>('popular')
  
  React.useEffect(() => {
    loadTemplates()
  }, [])
  
  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/workflows/marketplace', {
        params: { category: selectedCategory !== '全部' ? selectedCategory : undefined }
      })
      if (response.data?.success) {
        setTemplates(response.data.data)
      }
    } catch (err) {
      console.error('Failed to load templates:', err)
    }
    setLoading(false)
  }
  
  const filteredTemplates = templates.filter(t => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return t.name.toLowerCase().includes(query) || 
             t.description.toLowerCase().includes(query) ||
             t.tags.some(tag => tag.toLowerCase().includes(query))
    }
    return true
  })
  
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'popular': return b.usageCount - a.usageCount
      case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'rating': return b.ratingAvg - a.ratingAvg
      default: return 0
    }
  })
  
  const handleClone = async (templateId: string) => {
    try {
      const response = await apiClient.post(`/workflows/${templateId}/clone`)
      if (response.data?.success) {
        // Navigate to builder with new workflow ID
        window.location.href = `/workflow-builder?id=${response.data.data.id}`
      }
    } catch (err) {
      console.error('Failed to clone template:', err)
    }
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">工作流模板市场</h1>
          <p className="text-sm text-muted-foreground mt-1">发现和复用社区工作流模板</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模板..."
              className="w-full pl-9 pr-4 py-2 rounded-md bg-background border border-border text-sm"
            />
          </div>
          
          {/* Category filter */}
          <div className="flex gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border border-border text-foreground hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 rounded-md bg-background border border-border text-sm"
          >
            <option value="popular">最热</option>
            <option value="newest">最新</option>
            <option value="rating">评分</option>
          </select>
        </div>
      </div>
      
      {/* Template grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : sortedTemplates.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            暂无模板
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onClone={() => handleClone(template.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TemplateCard component**

Create: `src/components/workflow/marketplace/TemplateCard.tsx`

```typescript
import { Download, Star, GitCommit } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplateCardProps {
  template: {
    id: string
    name: string
    description: string
    category: string
    tags: string[]
    nodeCount: number
    usageCount: number
    ratingAvg: number
    ratingCount: number
    thumbnailUrl?: string
    ownerName: string
  }
  onClone: () => void
}

export function TemplateCard({ template, onClone }: TemplateCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors group">
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative">
        {template.thumbnailUrl ? (
          <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <GitCommit className="w-8 h-8 opacity-50" />
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-background/90 rounded text-xs font-medium">
          {template.category}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
        
        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {template.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <GitCommit className="w-3 h-3" />
            {template.nodeCount} 节点
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {template.usageCount}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            {template.ratingAvg.toFixed(1)} ({template.ratingCount})
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">by {template.ownerName}</span>
          <button
            onClick={onClone}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 transition-colors"
          >
            使用模板
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add marketplace API endpoints**

Modify: `server/routes/workflows.ts`

```typescript
// Add marketplace endpoint
router.get('/marketplace', asyncHandler(async (req, res) => {
  const { category, limit = 50, offset = 0 } = req.query
  const ownerId = buildOwnerFilter(req).params[0]
  
  // Get public templates + user's own templates
  const templates = await db.getWorkflowTemplates({
    isPublic: true,
    category: category as string | undefined,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  }, ownerId)
  
  res.json({
    success: true,
    data: templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: JSON.parse(t.tags_json || '[]'),
      nodeCount: JSON.parse(t.nodes_json).length,
      usageCount: t.usage_count,
      ratingAvg: t.rating_avg,
      ratingCount: t.rating_count,
      thumbnailUrl: t.thumbnail_url,
      ownerName: t.owner_name,
      createdAt: t.created_at,
    }))
  })
}))

// Add clone endpoint
router.post('/:id/clone', asyncHandler(async (req, res) => {
  const { id } = req.params
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  
  // Get original template
  const original = await db.getWorkflowTemplateById(id, ownerId)
  if (!original) {
    return res.status(404).json({ success: false, error: 'Template not found' })
  }
  
  // Create copy
  const newTemplate = await db.createWorkflowTemplate({
    name: `${original.name} (副本)`,
    description: original.description,
    nodes_json: original.nodes_json,
    edges_json: original.edges_json,
    is_public: false,
    category: original.category,
    tags_json: original.tags_json,
  }, ownerId)
  
  // Increment usage count on original
  await db.incrementTemplateUsageCount(id)
  
  res.json({ success: true, data: { id: newTemplate.id } })
}))
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/WorkflowMarketplace.tsx src/components/workflow/marketplace/
git commit -m "feat(workflow): add template marketplace with search and clone"
```

---

### Task 4.2: Template Preview Feature

**Files:**
- Create: `src/components/workflow/marketplace/TemplatePreviewModal.tsx`

**Effort:** 2-3 hours

**Steps:**

- [ ] **Step 1: Create preview modal with read-only React Flow**

```typescript
// src/components/workflow/marketplace/TemplatePreviewModal.tsx
import React from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react'
import { X, Maximize2 } from 'lucide-react'
import { ActionNode } from '@/components/workflow/nodes/ActionNode'
import { ConditionNode } from '@/components/cron/nodes/ConditionNode'
import { LoopNode } from '@/components/cron/nodes/LoopNode'
import { TransformNode } from '@/components/cron/nodes/TransformNode'

interface TemplatePreviewModalProps {
  template: {
    id: string
    name: string
    description: string
    nodes: Node[]
    edges: Edge[]
    nodeCount: number
    category: string
  }
  isOpen: boolean
  onClose: () => void
  onClone: () => void
}

const nodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
}

export function TemplatePreviewModal({ template, isOpen, onClose, onClone }: TemplatePreviewModalProps) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg overflow-hidden w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{template.name}</h2>
            <p className="text-xs text-muted-foreground">{template.nodeCount} 节点 · {template.category}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Preview */}
        <div className="flex-1 min-h-[400px]">
          <ReactFlow
            nodes={template.nodes.map(n => ({ ...n, selectable: false, draggable: false }))}
            edges={template.edges}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{template.description}</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              关闭
            </button>
            <button
              onClick={onClone}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              使用此模板
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Integrate into marketplace page**

Add preview functionality to TemplateCard in marketplace.

- [ ] **Step 3: Commit**

```bash
git add src/components/workflow/marketplace/TemplatePreviewModal.tsx
git commit -m "feat(workflow): add template preview modal with read-only workflow view"
```

---

### Task 4.3: Clone Functionality

**Files:**
- Already implemented in Task 4.1

**Effort:** 0 hours (included in Task 4.1)

**Status:** Complete

---

### Task 4.4: Rating System (Optional)

**Files:**
- Create: `src/components/workflow/marketplace/TemplateRating.tsx`
- Modify: `server/routes/workflows.ts` (add rating endpoints)

**Effort:** 2-3 hours

**Steps:**

- [ ] **Step 1: Create rating component**

```typescript
// src/components/workflow/marketplace/TemplateRating.tsx
import React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'

interface TemplateRatingProps {
  templateId: string
  currentRating?: number
  currentCount: number
  userRating?: number
  onRatingChange?: (rating: number) => void
}

export function TemplateRating({ templateId, currentRating = 0, currentCount, userRating, onRatingChange }: TemplateRatingProps) {
  const [hoverRating, setHoverRating] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const handleRate = async (rating: number) => {
    setIsSubmitting(true)
    try {
      await apiClient.post(`/workflows/${templateId}/rate`, { rating })
      onRatingChange?.(rating)
    } catch (err) {
      console.error('Failed to submit rating:', err)
    }
    setIsSubmitting(false)
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={isSubmitting}
            className="p-0.5 transition-colors"
          >
            <Star
              className={cn(
                'w-4 h-4',
                star <= (hoverRating || userRating || currentRating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {currentRating.toFixed(1)} ({currentCount})
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Add database table for ratings**

Modify: `server/database/schema.ts` and `migrations.ts`

```sql
CREATE TABLE workflow_ratings (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, user_id)
);

CREATE INDEX idx_ratings_template ON workflow_ratings(template_id);
```

- [ ] **Step 3: Add rating endpoints**

```typescript
// Add to server/routes/workflows.ts

// Rate a template
router.post('/:id/rate', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { rating } = req.body
  const userId = getOwnerIdForInsert(req) ?? undefined
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be 1-5' })
  }
  
  await db.rateWorkflowTemplate(id, userId, rating)
  
  // Update average rating
  await db.updateTemplateRatingStats(id)
  
  res.json({ success: true })
}))
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workflow/marketplace/TemplateRating.tsx server/database/schema.ts server/routes/workflows.ts
git commit -m "feat(workflow): add optional template rating system"
```

---

## Summary

### Task Breakdown

| Phase | Task | Priority | Complexity | Est. Hours | Dependencies |
|-------|------|----------|------------|------------|--------------|
| **Phase 1** | WebSocket Real-time Integration | P0 | Medium | 12-16h | None |
| 1.1 | Extend Event Types | P0 | Low | 2h | - |
| 1.2 | taskQueue Store Integration | P0 | Medium | 3-4h | 1.1 |
| 1.3 | executionLogs Store Integration | P0 | Medium | 3-4h | 1.1 |
| 1.4 | cronJobs Store Integration | P0 | Medium | 3-4h | 1.1 |
| **Phase 2** | Configuration Experience | P1 | Medium-High | 15-20h | Phase 1 |
| 2.1 | Cron Visual Builder | P1 | Medium | 5-7h | - |
| 2.2 | Node Config Form | P1 | High | 5-7h | - |
| 2.3 | Real-time Validation | P1 | Medium | 3-4h | - |
| 2.4 | Error Messages | P1 | Low | 2-3h | - |
| **Phase 3** | Test & Debug | P1 | Medium-High | 12-16h | Phase 1 |
| 3.1 | Test Run API | P1 | Medium | 4-5h | - |
| 3.2 | Test Run UI | P1 | Medium | 4-5h | 3.1 |
| 3.3 | Output Preview | P1 | Medium | 3-4h | - |
| 3.4 | Sample Data | P1 | Low | 1-2h | - |
| **Phase 4** | Discovery & Sharing | P2 | Medium | 8-10h | - |
| 4.1 | Marketplace Page | P2 | Medium | 4-5h | - |
| 4.2 | Preview Feature | P2 | Low | 2-3h | 4.1 |
| 4.3 | Clone Function | P2 | Low | Included | 4.1 |
| 4.4 | Rating System | P2 | Low | 2-3h | Optional |

**Total Estimated Effort: 47-62 hours**

### Dependency Graph

```
Phase 1 (Foundation)
├── 1.1 Extend Event Types
│   ├── 1.2 taskQueue Integration
│   ├── 1.3 executionLogs Integration
│   └── 1.4 cronJobs Integration
│
Phase 2 (Config) ──depends──> Phase 1
├── 2.1 Cron Visual Builder
├── 2.2 Node Config Form
├── 2.3 Real-time Validation
└── 2.4 Error Messages
│
Phase 3 (Test) ──depends──> Phase 1
├── 3.1 Test Run API
│   └── 3.2 Test Run UI
├── 3.3 Output Preview
└── 3.4 Sample Data
│
Phase 4 (Marketplace) ──can parallel with 2,3 after Phase 1
├── 4.1 Marketplace Page
│   ├── 4.2 Preview Feature
│   └── 4.3 Clone Function
└── 4.4 Rating System (optional)
```

### Parallelizable Tasks

**After Phase 1 completes, these tasks can run in parallel:**
- Tasks 2.1, 2.2, 2.3, 2.4 (Phase 2 internal)
- Tasks 3.1, 3.3, 3.4 (Phase 3 internal)
- Tasks 4.1 (Phase 4)

**Cross-phase parallelization:**
- Phase 2 and Phase 3 can overlap after Phase 1
- Phase 4 can start after Phase 1, but preview/cloning requires templates

### Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket stability | High | Auto-reconnect with fallback polling; graceful degradation |
| Store event race conditions | Medium | Event deduplication; optimistic update rollback |
| Test run API performance | Medium | Timeout handling; dry-run mode for quick validation |
| Template data growth | Low | Pagination; lazy loading; thumbnail caching |

### Backward Compatibility

- All changes are additive
- Existing workflows continue to work without migration
- WebSocket integration is opt-in via hooks
- New API endpoints follow existing patterns

### Migration Strategy

1. **Phase 1**: Deploy WebSocket integration first; validate stability
2. **Phase 2-3**: Can be deployed together or separately after Phase 1 is stable
3. **Phase 4**: Can be deployed independently once marketplace data is populated

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-04-04-workflow-ux-redesign.md`**

**Recommended execution approach:**

1. **Subagent-Driven Development** (recommended) - Dispatch fresh subagent per task, with two-stage review between tasks

2. **Phase-by-phase execution**: Start with Phase 1 (WebSocket), validate thoroughly before proceeding to Phases 2-4

**Next steps:**
1. Create worktree for Phase 1 implementation
2. Use subagent-driven-development skill to execute Task 1.1
3. Review and validate WebSocket integration before proceeding

**Critical success metrics:**
- WebSocket events correctly update all three stores (taskQueue, executionLogs, cronJobs)
- No duplicate events or race conditions
- Graceful degradation when WebSocket is unavailable
