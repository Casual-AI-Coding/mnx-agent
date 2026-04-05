import * as React from 'react'
import type { Node } from '@xyflow/react'

export interface UseNodeSelectionReturn {
  selectedNode: Node | null
  showConfigPanel: boolean
  selectNode: (node: Node) => void
  deselectNode: () => void
  setShowConfigPanel: (show: boolean) => void
}

export function useNodeSelection(): UseNodeSelectionReturn {
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)
  const [showConfigPanel, setShowConfigPanel] = React.useState(false)

  const selectNode = React.useCallback((node: Node) => {
    setSelectedNode(node)
    setShowConfigPanel(true)
  }, [])

  const deselectNode = React.useCallback(() => {
    setSelectedNode(null)
    setShowConfigPanel(false)
  }, [])

  return {
    selectedNode,
    showConfigPanel,
    selectNode,
    deselectNode,
    setShowConfigPanel,
  }
}
