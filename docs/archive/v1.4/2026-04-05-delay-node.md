# Delay Node Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `delay` node type to the workflow engine that pauses execution for a specified duration.

**Architecture:** Backend adds enum value, config interface, and executor method to workflow-engine. Frontend creates DelayNode React component and registers it in WorkflowBuilder palette.

**Tech Stack:** Express, TypeScript, React Flow, lucide-react, framer-motion

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `server/types/workflow.ts` | Modify | Add `Delay` to enum, add `DelayNodeConfig` interface |
| `server/services/workflow-engine.ts` | Modify | Add `case 'delay'` and `executeDelayNode()` method |
| `src/types/cron.ts` | Modify | Add `Delay` to frontend enum |
| `src/components/workflow/nodes/DelayNode.tsx` | Create | New React component with Clock icon |
| `src/pages/WorkflowBuilder.tsx` | Modify | Register DelayNode, add to palette, add default config |

---

### Task 1: Backend Types

**Files:**
- Modify: `server/types/workflow.ts:11-17`

- [ ] **Step 1: Add Delay to WorkflowNodeType enum**

Add the new enum value after `Queue`:

```typescript
export enum WorkflowNodeType {
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Transform = 'transform',
  Queue = 'queue',
  Delay = 'delay',
}
```

- [ ] **Step 2: Add DelayNodeConfig interface**

Add the interface after `QueueNodeConfig`:

```typescript
export interface DelayNodeConfig {
  duration?: number   // milliseconds
  until?: string      // ISO timestamp to wait until
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build:server`
Expected: No new type errors

- [ ] **Step 4: Commit backend types**

```bash
git add server/types/workflow.ts
git commit -m "feat(workflow): add Delay node type and config interface"
```

---

### Task 2: Backend Executor

**Files:**
- Modify: `server/services/workflow-engine.ts:538-550`

- [ ] **Step 1: Add delay case to executeNode switch**

In `executeNode()` method, add `case 'delay'` after the existing cases (line ~548):

```typescript
switch (node.type) {
  case 'action':
    return await this.executeActionNode(node, config)
  case 'condition':
    return await this.executeConditionNode(node, config, nodeOutputs)
  case 'loop':
    return await this.executeLoopNode(node, config, nodeOutputs)
  case 'transform':
    return await this.executeTransformNode(node, config, nodeOutputs)
  case 'queue':
    return await this.executeQueueNode(node, config)
  case 'delay':
    return await this.executeDelayNode(node, config)
  default:
    throw new Error(`Unknown node type: ${node.type}`)
}
```

- [ ] **Step 2: Write executeDelayNode method**

Add the private method after `executeQueueNode()` (after line ~1229):

```typescript
private async executeDelayNode(
  node: WorkflowNode,
  config: Record<string, unknown>
): Promise<{ delayed: number }> {
  const detailStartTime = Date.now()

  // EMIT: workflow_node_start
  if (this.executionLogId) {
    cronEvents.emit('workflow_node_start', {
      executionId: this.executionLogId,
      nodeId: node.id,
      nodeType: 'delay',
      nodeLabel: node.data?.label || node.id,
      startedAt: new Date().toISOString(),
      workflowId: this.workflowId,
    })
  }

  try {
    // Calculate delay duration
    let delayMs = 0
    if (config.duration !== undefined) {
      delayMs = Math.max(0, config.duration as number)
    } else if (config.until !== undefined) {
      const targetTime = new Date(config.until as string).getTime()
      delayMs = Math.max(0, targetTime - Date.now())
    }

    // Execute the delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    const result = { delayed: delayMs }

    // EMIT: workflow_node_complete
    if (this.executionLogId) {
      cronEvents.emit('workflow_node_complete', {
        executionId: this.executionLogId,
        nodeId: node.id,
        nodeType: 'delay',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date(detailStartTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - detailStartTime,
        result,
        workflowId: this.workflowId,
      })
    }

    return result
  } catch (error) {
    // EMIT: workflow_node_error
    if (this.executionLogId) {
      cronEvents.emit('workflow_node_error', {
        executionId: this.executionLogId,
        nodeId: node.id,
        nodeType: 'delay',
        nodeLabel: node.data?.label || node.id,
        startedAt: new Date(detailStartTime).toISOString(),
        errorMessage: (error as Error).message,
        workflowId: this.workflowId,
      })
    }
    throw error
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build:server`
Expected: No new type errors

- [ ] **Step 4: Commit backend executor**

```bash
git add server/services/workflow-engine.ts
git commit -m "feat(workflow): implement delay node executor"
```

---

### Task 3: Frontend Types

**Files:**
- Modify: `src/types/cron.ts:48-53`

- [ ] **Step 1: Add Delay to frontend WorkflowNodeType enum**

Add after existing values:

```typescript
export enum WorkflowNodeType {
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Transform = 'transform',
  Queue = 'queue',
  Delay = 'delay',
}
```

- [ ] **Step 2: Verify frontend TypeScript**

Run: `npm run build:frontend`
Expected: No new type errors

- [ ] **Step 3: Commit frontend types**

```bash
git add src/types/cron.ts
git commit -m "feat(workflow): add Delay to frontend WorkflowNodeType enum"
```

---

### Task 4: Frontend DelayNode Component

**Files:**
- Create: `src/components/workflow/nodes/DelayNode.tsx`

- [ ] **Step 1: Create DelayNode component**

Create the file with this content:

```typescript
import * as React from 'react'
import { Handle, Position, type Node } from '@xyflow/react'
import { Clock, AlertCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BaseNodeWrapper } from '@/components/cron/nodes/BaseNodeWrapper'

export interface DelayNodeData extends Record<string, unknown> {
  label: string
  config: {
    duration?: number
    until?: string
  }
  hasValidationError?: boolean
  hasValidationWarning?: boolean
}

export type DelayNodeType = Node<DelayNodeData, 'delay'>

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.round((ms % 60000) / 1000)
  return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`
}

export const DelayNode = React.memo(function DelayNode({ data, selected }: { data: DelayNodeData; selected?: boolean }) {
  const { label, config, hasValidationError, hasValidationWarning } = data
  const duration = config?.duration
  const until = config?.until

  let displayDuration: string
  if (duration !== undefined) {
    displayDuration = formatDuration(duration)
  } else if (until) {
    const targetTime = new Date(until).getTime()
    const remaining = Math.max(0, targetTime - Date.now())
    displayDuration = `until ${formatDuration(remaining)}`
  } else {
    displayDuration = 'No delay'
  }

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-dark-900"
      />

      <BaseNodeWrapper
        isSelected={selected}
        borderColor={cn(
          'border-violet-500/60',
          hasValidationError && 'border-red-500',
          hasValidationWarning && !hasValidationError && 'border-yellow-500'
        )}
        header={
          <div className="flex items-center gap-2">
            {hasValidationError ? (
              <AlertCircle className="w-3 h-3 text-destructive" />
            ) : hasValidationWarning ? (
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
            ) : (
              <Clock className="w-3 h-3 text-violet-400" />
            )}
            <span className={cn(
              'text-xs font-medium',
              hasValidationError ? 'text-destructive' : hasValidationWarning ? 'text-yellow-400' : 'text-violet-400'
            )}>Delay</span>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            hasValidationError ? 'bg-destructive/10' : hasValidationWarning ? 'bg-yellow-500/10' : 'bg-violet-500/10'
          )}>
            {hasValidationError ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : hasValidationWarning ? (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            ) : (
              <Clock className="w-5 h-5 text-violet-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              hasValidationError ? 'text-destructive' : hasValidationWarning ? 'text-yellow-400' : 'text-foreground'
            )}>
              {label || 'Delay'}
            </p>
            <p className={cn(
              'text-xs mt-1',
              hasValidationError ? 'text-red-400' : hasValidationWarning ? 'text-yellow-400' : 'text-violet-400'
            )}>
              {displayDuration}
            </p>
          </div>
        </div>

        {selected && (
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              hasValidationError ? 'bg-destructive/50' : hasValidationWarning ? 'bg-yellow-500/50' : 'bg-violet-500/50'
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </BaseNodeWrapper>

      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-dark-900"
      />
    </>
  )
})
```

- [ ] **Step 2: Verify component compiles**

Run: `npm run build:frontend`
Expected: No new type errors

- [ ] **Step 3: Commit DelayNode component**

```bash
git add src/components/workflow/nodes/DelayNode.tsx
git commit -m "feat(workflow): add DelayNode React component"
```

---

### Task 5: Register DelayNode in WorkflowBuilder

**Files:**
- Modify: `src/pages/WorkflowBuilder.tsx`

- [ ] **Step 1: Import DelayNode component**

Add import after existing node imports (around line 53-56):

```typescript
import { ActionNode } from '@/components/workflow/nodes/ActionNode'
import { DelayNode } from '@/components/workflow/nodes/DelayNode'  // NEW
import { LoopNode } from '@/components/cron/nodes/LoopNode'
import { ConditionNode } from '@/components/cron/nodes/ConditionNode'
import { TransformNode } from '@/components/cron/nodes/TransformNode'
```

- [ ] **Step 2: Add Delay to nodeTypes registry**

Update the nodeTypes object (around line 104-109):

```typescript
const nodeTypes: NodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
  delay: DelayNode,
}
```

- [ ] **Step 3: Add delay to logicNodes palette**

Add after transform entry (around line 126-148):

```typescript
const logicNodes: NodePaletteItem[] = [
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    category: 'logic',
    description: 'Conditional branching logic',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: Repeat,
    category: 'logic',
    description: 'Iterate over data',
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: Zap,
    category: 'logic',
    description: 'Data transformation',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: Clock,
    category: 'logic',
    description: 'Pause execution',
  },
]
```

- [ ] **Step 4: Add delay default config in getDefaultConfig**

Add case in `getDefaultConfig()` function (around line 151-186):

```typescript
const getDefaultConfig = (type: string, actionData?: AvailableActionItem): Record<string, unknown> => {
  switch (type) {
    case 'action':
      return {
        label: actionData?.label || 'Action',
        config: {
          service: actionData?.service || '',
          method: actionData?.method || '',
          args: [],
        },
      }
    case 'condition':
      return {
        conditionType: 'equals',
        serviceType: 'text',
        threshold: 0,
        label: 'Condition',
      }
    case 'loop':
      return {
        condition: '',
        maxIterations: 100,
        label: 'Loop',
      }
    case 'transform':
      return {
        transformType: 'map',
        mapping: {},
        inputType: '',
        outputType: '',
        label: 'Transform',
      }
    case 'delay':
      return {
        duration: 1000,
        label: 'Delay',
      }
    default:
      return { label: type }
  }
}
```

- [ ] **Step 5: Verify frontend builds**

Run: `npm run build:frontend`
Expected: No new type errors

- [ ] **Step 6: Commit WorkflowBuilder changes**

```bash
git add src/pages/WorkflowBuilder.tsx
git commit -m "feat(workflow): register DelayNode in palette and nodeTypes"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Both frontend and backend build successfully

- [ ] **Step 2: Verify TypeScript diagnostics**

Run LSP diagnostics on all modified files, confirm no errors.

- [ ] **Step 3: Manual smoke test**

1. Start dev server: `node scripts/dev.js restart`
2. Navigate to WorkflowBuilder page
3. Drag Delay node from Logic palette onto canvas
4. Verify node renders with Clock icon and purple theme
5. Save workflow with delay node
6. Execute workflow, verify delay pauses execution

- [ ] **Step 4: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "feat(workflow): delay node type complete"
```

---

## Self-Review Checklist

| Spec Section | Task Coverage |
|--------------|---------------|
| Node type enum | Task 1, Task 3 |
| Config interface | Task 1 |
| Backend executor | Task 2 |
| Frontend component | Task 4 |
| UI registration | Task 5 |
| Event emission | Task 2 (included in executor) |
| Error handling | Task 2 (included in executor) |
| Default config | Task 5 |

**Placeholder scan:** No TBD, TODO, or vague instructions.

**Type consistency:** `DelayNodeConfig` interface matches config shape used in `DelayNodeData`. Enum values match between backend and frontend.