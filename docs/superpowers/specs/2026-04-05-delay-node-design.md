# Delay Node Type Design

> **Status**: Design approved, ready for implementation
> **Date**: 2026-04-05

## Overview

Add a new `delay` node type to the workflow orchestration system. This node pauses workflow execution for a specified duration before continuing to downstream nodes.

## Motivation

Workflows often need to introduce timing delays for:
- Rate limiting between API calls
- Waiting for external processes to complete
- Implementing retry backoff strategies
- Scheduling sequential operations

Currently, users would need to create separate cron jobs or external mechanisms to handle delays. A dedicated delay node provides a cleaner, declarative approach.

## Architecture

### Node Type Definition

```typescript
enum WorkflowNodeType {
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Transform = 'transform',
  Queue = 'queue',
  Delay = 'delay',  // NEW
}
```

### Configuration Interface

```typescript
interface DelayNodeConfig {
  duration?: number   // Delay in milliseconds
  until?: string      // ISO 8601 timestamp to wait until
}
```

**Rules**:
- If `duration` is provided, delay for that many milliseconds
- If `until` is provided, calculate delay as `timestamp - Date.now()`
- If both are provided, use `duration` (explicit takes precedence)
- If neither provided or calculated delay is ≤ 0, skip waiting (pass-through)

### Backend Executor

Located in `server/services/workflow-engine.ts`:

```typescript
case 'delay': {
  return await this.executeDelayNode(node, config)
}
```

**Execution flow**:
1. Emit `workflow_node_start` event
2. Calculate delay duration (ms)
3. If delay > 0, `await new Promise(resolve => setTimeout(resolve, delayMs))`
4. Emit `workflow_node_complete` event with result `{ delayed: delayMs }`
5. Handle errors with `workflow_node_error` event

**Timeout handling**: Inherits node-level timeout from `WorkflowNode.timeout` (default 300000ms/5min). Long delays should use explicit timeout config.

### Frontend Component

Located in `src/components/workflow/nodes/DelayNode.tsx`:

**Visual design**:
- Purple/violet color theme (distinct from amber condition, blue action)
- Clock icon from lucide-react
- Standard `BaseNodeWrapper` styling
- Input/Output handles at top/bottom
- Validation state indicators (error/warning)

**Display format**:
- Duration shown in human-readable format (500ms, 2s, 1.5min)
- "Until" mode shows countdown to target timestamp
- Invalid config shows error state

### UI Registration

In `src/pages/WorkflowBuilder.tsx`:

```typescript
// nodeTypes registry
const nodeTypes: NodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
  delay: DelayNode,  // NEW
}

// Node palette
const logicNodes: NodePaletteItem[] = [
  { type: 'condition', label: 'Condition', icon: GitBranch, ... },
  { type: 'loop', label: 'Loop', icon: Repeat, ... },
  { type: 'transform', label: 'Transform', icon: Zap, ... },
  { type: 'delay', label: 'Delay', icon: Clock, category: 'logic', description: 'Pause execution' },  // NEW
]
```

## Files to Modify

### Backend
1. `server/types/workflow.ts` - Add enum value and interface
2. `server/services/workflow-engine.ts` - Add executor case and method

### Frontend
1. `src/types/cron.ts` - Add enum value
2. `src/components/workflow/nodes/DelayNode.tsx` - New component
3. `src/pages/WorkflowBuilder.tsx` - Register node type and palette entry

## Error Handling

- Negative duration: Treated as 0 (no delay)
- Invalid timestamp: Throws error with clear message
- Timeout exceeded: Uses existing node timeout mechanism

## Testing

Manual verification:
1. Create workflow with delay node
2. Execute workflow
3. Verify pause duration matches config
4. Check execution logs show correct timing

## Database Impact

**None** - Nodes are stored as JSON in `nodes_json` column. No schema changes required.

## Backward Compatibility

- Existing workflows unaffected
- No breaking changes to existing node types
- Delay node simply not recognized in older versions (would throw "Unknown node type" error if loaded)

## Implementation Notes

Follow existing patterns exactly:
- `executeActionNode()` for event emission pattern
- `ConditionNode.tsx` for visual component structure
- `getDefaultConfig()` in WorkflowBuilder for default values

Default config for delay node:
```typescript
{
  duration: 1000,  // 1 second default
  label: 'Delay',
}
```