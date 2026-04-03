import * as React from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { ActionNode } from '@/components/workflow/nodes/ActionNode'
import { LoopNode } from '@/components/cron/nodes/LoopNode'
import { ConditionNode } from '@/components/cron/nodes/ConditionNode'
import { TransformNode } from '@/components/cron/nodes/TransformNode'

const nodeTypes: NodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
}

interface WorkflowPreviewProps {
  nodesJson: string
  edgesJson: string
  className?: string
}

interface WorkflowNodeData {
  id: string
  type?: string
  position?: { x: number; y: number }
  data?: {
    label?: string
    config?: Record<string, unknown>
  }
}

interface WorkflowEdgeData {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

function parseWorkflowData(nodesJson: string, edgesJson: string): { nodes: Node[]; edges: Edge[] } {
  const parsedNodes: WorkflowNodeData[] = typeof nodesJson === 'string' ? JSON.parse(nodesJson) : nodesJson
  const parsedEdges: WorkflowEdgeData[] = typeof edgesJson === 'string' ? JSON.parse(edgesJson) : edgesJson

  const nodes: Node[] = (parsedNodes || []).map((node, index) => ({
    id: node.id || `node-${index}`,
    type: node.type || 'action',
    position: node.position || { x: 100 + index * 250, y: 100 },
    data: {
      label: node.data?.label || node.id || 'Node',
      config: node.data?.config || {},
      ...node.data,
    },
  }))

  const edges: Edge[] = (parsedEdges || []).map((edge, index) => ({
    id: edge.id || `edge-${index}`,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: 'smoothstep',
    animated: false,
  }))

  return { nodes, edges }
}

export function WorkflowPreview({ nodesJson, edgesJson, className }: WorkflowPreviewProps) {
  const [nodes, setNodes] = React.useState<Node[]>([])
  const [edges, setEdges] = React.useState<Edge[]>([])

  React.useEffect(() => {
    try {
      const { nodes: parsedNodes, edges: parsedEdges } = parseWorkflowData(nodesJson, edgesJson)
      setNodes(parsedNodes)
      setEdges(parsedEdges)
    } catch (error) {
      console.error('Failed to parse workflow data:', error)
      setNodes([])
      setEdges([])
    }
  }, [nodesJson, edgesJson])

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground/50">
        暂无节点数据
      </div>
    )
  }

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={true}
        panOnDrag={false}
        preventScrolling={true}
        defaultEdgeOptions={{
          style: { strokeWidth: 2 },
          type: 'smoothstep',
        }}
      >
        <Controls 
          showInteractive={false}
          className="bg-secondary border border-border rounded-md"
        />
        <MiniMap
          className="bg-muted/30 border border-border rounded-md"
          nodeColor={(node) => {
            switch (node.type) {
              case 'action': return '#3b82f6'
              case 'loop': return '#a855f7'
              case 'condition': return '#f59e0b'
              case 'transform': return '#6366f1'
              default: return '#71717a'
            }
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#374151" />
      </ReactFlow>
    </div>
  )
}

export function WorkflowPreviewWrapper(props: WorkflowPreviewProps) {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center h-64">加载中...</div>}>
      <WorkflowPreview {...props} />
    </React.Suspense>
  )
}