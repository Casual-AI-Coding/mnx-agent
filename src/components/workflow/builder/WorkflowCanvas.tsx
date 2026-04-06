import * as React from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  Panel,
  type NodeTypes,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'

import { ActionNode } from '@/components/workflow/nodes/ActionNode'
import { DelayNode } from '@/components/workflow/nodes/DelayNode'
import { ErrorBoundaryNode } from '@/components/workflow/nodes/ErrorBoundaryNode'
import { LoopNode } from '@/components/cron/nodes/LoopNode'
import { ConditionNode } from '@/components/cron/nodes/ConditionNode'
import { TransformNode } from '@/components/cron/nodes/TransformNode'
import { ExecutionStatusPanel } from '@/components/workflow/builder/ExecutionStatusPanel'
import type { ExecutionStatusPanelProps } from '@/components/workflow/builder/types'

export interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onNodeClick: (_event: React.MouseEvent, node: Node) => void
  onNodeDoubleClick: (_event: React.MouseEvent, node: Node) => void
  onPaneClick: () => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent) => void
  executionStatusPanelProps: ExecutionStatusPanelProps
  validationResult: { valid: boolean; message: string } | null
}

const nodeTypes: NodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
  delay: DelayNode,
  errorBoundary: ErrorBoundaryNode,
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  onDragOver,
  onDrop,
  executionStatusPanelProps,
  validationResult,
}: WorkflowCanvasProps) {
  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          style: { strokeWidth: 2 },
          type: 'smoothstep',
        }}
        className="bg-background"
      >
        <Controls className="bg-secondary border border-border rounded-md" />
        <MiniMap
          className="bg-muted/30 border border-border rounded-md"
          nodeColor={(node) => {
            const nodeData = node.data as { executionStatus?: string } | undefined
            switch (nodeData?.executionStatus) {
              case 'running':
                return 'hsl(var(--primary))'
              case 'completed':
                return 'hsl(var(--success))'
              case 'error':
                return 'hsl(var(--destructive))'
              default:
                break
            }
            switch (node.type) {
              case 'action':
                return 'hsl(var(--primary))'
              case 'loop':
                return 'hsl(var(--primary-400))'
              case 'condition':
                return 'hsl(var(--warning))'
              case 'transform':
                return 'hsl(var(--info))'
              case 'errorBoundary':
                return 'hsl(var(--success))'
              default:
                return 'hsl(var(--muted-foreground))'
            }
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--muted-foreground))" />

        <ExecutionStatusPanel {...executionStatusPanelProps} />

        <AnimatePresence>
          {validationResult && (
            <Panel position="top-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  'px-4 py-2 rounded-lg shadow-lg flex items-center gap-2',
                  validationResult.valid
                    ? cn(status.success.bgSubtle, status.success.text, 'border', status.success.border)
                    : cn(status.warning.bgSubtle, status.warning.text, 'border', status.warning.border)
                )}
              >
                {validationResult.valid ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{validationResult.message}</span>
              </motion.div>
            </Panel>
          )}
        </AnimatePresence>
      </ReactFlow>
    </div>
  )
}
