import * as React from 'react'
import { pauseExecution, resumeExecution, cancelExecution } from '@/lib/api/cron'
import { getWebSocketClient } from '@/lib/websocket-client'
import type { WebSocketEvent, WorkflowTestEventPayload, WorkflowNodeOutputPayload } from '@/lib/websocket-client'

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'paused'

export interface ExecutionState {
  executionId: string | null
  status: ExecutionStatus
  startTime: Date | null
}

export interface UseWorkflowExecutionReturn {
  executionId: string | null
  status: ExecutionStatus
  startTime: Date | null
  testNodeResults: Map<string, { input?: unknown; output?: unknown; error?: string; duration?: number }>
  selectedTestNode: string | null
  showNodeOutputPanel: boolean
  startExecution: (id: string) => void
  pause: () => Promise<{ success: boolean; error?: string }>
  resume: () => Promise<{ success: boolean; error?: string }>
  cancel: () => Promise<{ success: boolean; error?: string }>
  selectTestNode: (nodeId: string | null) => void
  showNodeOutput: (show: boolean) => void
  resetExecution: () => void
}

export function useWorkflowExecution(): UseWorkflowExecutionReturn {
  const [executionId, setExecutionId] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<ExecutionStatus>('idle')
  const [startTime, setStartTime] = React.useState<Date | null>(null)
  const [testNodeResults, setTestNodeResults] = React.useState<
    Map<string, { input?: unknown; output?: unknown; error?: string; duration?: number }>
  >(new Map())
  const [selectedTestNode, setSelectedTestNode] = React.useState<string | null>(null)
  const [showNodeOutputPanel, setShowNodeOutputPanel] = React.useState(false)

  React.useEffect(() => {
    const client = getWebSocketClient()
    if (!client) return

    const unsubscribe = client.onEvent('workflows', (event: WebSocketEvent) => {
      switch (event.type) {
        case 'workflow_test_started': {
          const payload = event.payload as WorkflowTestEventPayload
          setExecutionId(payload.executionId)
          setStatus('running')
          setStartTime(new Date())
          setTestNodeResults(new Map())
          break
        }
        case 'workflow_test_completed': {
          const payload = event.payload as WorkflowTestEventPayload
          setStatus(payload.status === 'failed' ? 'idle' : 'completed')
          break
        }
        case 'workflow_node_output': {
          const payload = event.payload as WorkflowNodeOutputPayload
          setTestNodeResults((prev) => {
            const next = new Map(prev)
            next.set(payload.nodeId, {
              output: payload.output,
              duration: payload.duration,
            })
            return next
          })
          break
        }
      }
    })

    return () => unsubscribe()
  }, [])

  const startExecution = React.useCallback((id: string) => {
    setExecutionId(id)
    setStatus('running')
    setStartTime(new Date())
    setTestNodeResults(new Map())
  }, [])

  const pause = React.useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!executionId) return { success: false, error: 'No active execution' }
    try {
      const response = await pauseExecution(executionId)
      if (response.success) {
        setStatus('paused')
        return { success: true }
      }
      return { success: false, error: response.error || 'Failed to pause' }
    } catch {
      return { success: false, error: 'Failed to pause' }
    }
  }, [executionId])

  const resume = React.useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!executionId) return { success: false, error: 'No active execution' }
    try {
      const response = await resumeExecution(executionId)
      if (response.success) {
        setStatus('running')
        return { success: true }
      }
      return { success: false, error: response.error || 'Failed to resume' }
    } catch {
      return { success: false, error: 'Failed to resume' }
    }
  }, [executionId])

  const cancel = React.useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!executionId) return { success: false, error: 'No active execution' }
    try {
      const response = await cancelExecution(executionId)
      if (response.success) {
        setStatus('idle')
        setExecutionId(null)
        setStartTime(null)
        return { success: true }
      }
      return { success: false, error: response.error || 'Failed to cancel' }
    } catch {
      return { success: false, error: 'Failed to cancel' }
    }
  }, [executionId])

  const selectTestNode = React.useCallback((nodeId: string | null) => {
    setSelectedTestNode(nodeId)
  }, [])

  const showNodeOutput = React.useCallback((show: boolean) => {
    setShowNodeOutputPanel(show)
  }, [])

  const resetExecution = React.useCallback(() => {
    setExecutionId(null)
    setStatus('idle')
    setStartTime(null)
    setTestNodeResults(new Map())
    setSelectedTestNode(null)
    setShowNodeOutputPanel(false)
  }, [])

  return {
    executionId,
    status,
    startTime,
    testNodeResults,
    selectedTestNode,
    showNodeOutputPanel,
    startExecution,
    pause,
    resume,
    cancel,
    selectTestNode,
    showNodeOutput,
    resetExecution,
  }
}
