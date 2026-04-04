import { useEffect, useCallback, useRef, useState } from 'react'
import { initWebSocketClient, type WebSocketEvent } from '@/lib/websocket-client'
import type { WorkflowNodeType } from '@/types/cron'

export interface WorkflowNodeStatus {
  nodeId: string
  status: 'idle' | 'running' | 'completed' | 'error'
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  result?: unknown
  progress?: number
}

export interface WorkflowNodeStartEvent {
  executionId: string
  nodeId: string
  nodeType: WorkflowNodeType
  nodeLabel: string
  startedAt: string
  workflowId?: string
}

export interface WorkflowNodeCompleteEvent {
  executionId: string
  nodeId: string
  nodeType: WorkflowNodeType
  nodeLabel: string
  startedAt: string
  completedAt: string
  durationMs: number
  result?: unknown
  workflowId?: string
}

export interface WorkflowNodeErrorEvent {
  executionId: string
  nodeId: string
  nodeType: WorkflowNodeType
  nodeLabel: string
  startedAt: string
  errorMessage: string
  workflowId?: string
}

export type WorkflowNodeEvent =
  | { type: 'workflow_node_start'; payload: WorkflowNodeStartEvent }
  | { type: 'workflow_node_complete'; payload: WorkflowNodeCompleteEvent }
  | { type: 'workflow_node_error'; payload: WorkflowNodeErrorEvent }

export interface UseWorkflowUpdatesOptions {
  executionId?: string
  workflowId?: string
  onNodeStart?: (event: WorkflowNodeStartEvent) => void
  onNodeComplete?: (event: WorkflowNodeCompleteEvent) => void
  onNodeError?: (event: WorkflowNodeErrorEvent) => void
  enabled?: boolean
}

export interface UseWorkflowUpdatesReturn {
  nodeStatuses: Map<string, WorkflowNodeStatus>
  isSubscribed: boolean
  error: Error | null
}

export function useWorkflowUpdates(options: UseWorkflowUpdatesOptions): UseWorkflowUpdatesReturn {
  const {
    executionId,
    workflowId,
    onNodeStart,
    onNodeComplete,
    onNodeError,
    enabled = true,
  } = options

  const [nodeStatuses, setNodeStatuses] = useState<Map<string, WorkflowNodeStatus>>(new Map())
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const nodeStatusesRef = useRef(nodeStatuses)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    nodeStatusesRef.current = nodeStatuses
  }, [nodeStatuses])

  const updateNodeStatus = useCallback((nodeId: string, status: Partial<WorkflowNodeStatus>) => {
    setNodeStatuses((prev) => {
      const current = prev.get(nodeId) || { nodeId, status: 'idle' }
      const updated = { ...current, ...status }
      return new Map(prev).set(nodeId, updated)
    })
  }, [])

  const handleNodeStart = useCallback((event: WebSocketEvent) => {
    try {
      const payload = event.payload as WorkflowNodeStartEvent
      
      if (executionId && payload.executionId !== executionId) {
        return
      }

      if (workflowId && payload.workflowId !== workflowId) {
        return
      }

      updateNodeStatus(payload.nodeId, {
        nodeId: payload.nodeId,
        status: 'running',
        startedAt: payload.startedAt,
      })

      onNodeStart?.(payload)
    } catch (err) {
      console.error('[useWorkflowUpdates] Error handling node start event:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }, [executionId, workflowId, onNodeStart, updateNodeStatus])

  const handleNodeComplete = useCallback((event: WebSocketEvent) => {
    try {
      const payload = event.payload as WorkflowNodeCompleteEvent
      
      if (executionId && payload.executionId !== executionId) {
        return
      }

      if (workflowId && payload.workflowId !== workflowId) {
        return
      }

      updateNodeStatus(payload.nodeId, {
        nodeId: payload.nodeId,
        status: 'completed',
        completedAt: payload.completedAt,
        result: payload.result,
      })

      onNodeComplete?.(payload)
    } catch (err) {
      console.error('[useWorkflowUpdates] Error handling node complete event:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }, [executionId, workflowId, onNodeComplete, updateNodeStatus])

  const handleNodeError = useCallback((event: WebSocketEvent) => {
    try {
      const payload = event.payload as WorkflowNodeErrorEvent
      
      if (executionId && payload.executionId !== executionId) {
        return
      }

      if (workflowId && payload.workflowId !== workflowId) {
        return
      }

      updateNodeStatus(payload.nodeId, {
        nodeId: payload.nodeId,
        status: 'error',
        errorMessage: payload.errorMessage,
      })

      onNodeError?.(payload)
    } catch (err) {
      console.error('[useWorkflowUpdates] Error handling node error event:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }, [executionId, workflowId, onNodeError, updateNodeStatus])

  useEffect(() => {
    if (!enabled) {
      setIsSubscribed(false)
      return
    }

    setError(null)
    const client = initWebSocketClient()

    const unsubStart = client.onEvent('all', (event) => {
      if (event.type === 'workflow_node_start') {
        handleNodeStart(event)
      }
    })

    const unsubComplete = client.onEvent('all', (event) => {
      if (event.type === 'workflow_node_complete') {
        handleNodeComplete(event)
      }
    })

    const unsubError = client.onEvent('all', (event) => {
      if (event.type === 'workflow_node_error') {
        handleNodeError(event)
      }
    })

    unsubscribeRef.current = () => {
      unsubStart()
      unsubComplete()
      unsubError()
    }

    setIsSubscribed(true)

    return () => {
      unsubscribeRef.current?.()
      setIsSubscribed(false)
    }
  }, [enabled, handleNodeStart, handleNodeComplete, handleNodeError])

  return {
    nodeStatuses,
    isSubscribed,
    error,
  }
}

export default useWorkflowUpdates
