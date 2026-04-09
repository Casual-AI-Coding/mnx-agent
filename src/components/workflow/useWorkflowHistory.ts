import * as React from 'react'
import type { Node, Edge } from '@xyflow/react'
import { WORKFLOW } from '@/lib/config'

export interface WorkflowState {
  nodes: Node[]
  edges: Edge[]
}

export interface HistoryState {
  past: WorkflowState[]
  present: WorkflowState
  future: WorkflowState[]
}

export interface UseWorkflowHistoryReturn {
  state: WorkflowState
  setState: (newState: WorkflowState | ((prev: WorkflowState) => WorkflowState), skipHistory?: boolean) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  reset: (initialState: WorkflowState) => void
}

const { MAX_HISTORY_SIZE } = WORKFLOW

export function useWorkflowHistory(initialState: WorkflowState = { nodes: [], edges: [] }): UseWorkflowHistoryReturn {
  const [history, setHistory] = React.useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  })

  const setState = React.useCallback((
    newState: WorkflowState | ((prev: WorkflowState) => WorkflowState),
    skipHistory = false
  ) => {
    setHistory((current) => {
      const resolvedState = typeof newState === 'function'
        ? newState(current.present)
        : newState

      if (skipHistory) {
        return {
          ...current,
          present: resolvedState,
        }
      }

      const newPast = [...current.past, current.present]
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift()
      }

      return {
        past: newPast,
        present: resolvedState,
        future: [],
      }
    })
  }, [])

  const undo = React.useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) return current

      const previous = current.past[current.past.length - 1]
      const newPast = current.past.slice(0, -1)

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      }
    })
  }, [])

  const redo = React.useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) return current

      const next = current.future[0]
      const newFuture = current.future.slice(1)

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      }
    })
  }, [])

  const reset = React.useCallback((initialState: WorkflowState) => {
    setHistory({
      past: [],
      present: initialState,
      future: [],
    })
  }, [])

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  }
}
