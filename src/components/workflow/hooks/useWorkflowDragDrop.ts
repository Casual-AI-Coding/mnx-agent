import * as React from 'react'
import { useReactFlow } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { AvailableActionItem } from '@/components/workflow/builder'
import { getDefaultConfig } from '@/components/workflow/utils/workflow-config'

export interface UseWorkflowDragDropReturn {
  onDragStart: (event: React.DragEvent, nodeType: string, actionData?: AvailableActionItem) => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent, callbacks: { setNodes: React.Dispatch<React.SetStateAction<Node[]>>; onDirty: () => void }) => void
}

export function useWorkflowDragDrop(): UseWorkflowDragDropReturn {
  const { screenToFlowPosition } = useReactFlow()

  const onDragStart = React.useCallback((event: React.DragEvent, nodeType: string, actionData?: AvailableActionItem) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeType,
      actionData,
    }))
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = React.useCallback(
    (event: React.DragEvent, callbacks: { setNodes: React.Dispatch<React.SetStateAction<Node[]>>; onDirty: () => void }) => {
      event.preventDefault()

      const dataStr = event.dataTransfer.getData('application/reactflow')
      if (!dataStr) return

      let dragData: { type: string; actionData?: AvailableActionItem }
      try {
        dragData = JSON.parse(dataStr)
      } catch {
        dragData = { type: dataStr }
      }

      const { type: nodeType, actionData } = dragData

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: `${nodeType}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        type: nodeType,
        position,
        data: getDefaultConfig(nodeType, actionData),
      }

      callbacks.setNodes((nds) => [...nds, newNode])
      callbacks.onDirty()
    },
    [screenToFlowPosition]
  )

  return { onDragStart, onDragOver, onDrop }
}
