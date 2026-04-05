import * as React from 'react'
import { motion } from 'framer-motion'
import { Bug, X } from 'lucide-react'
import { TestRunPanel } from '@/components/workflow/TestRunPanel'
import { NodeOutputPanel } from '@/components/workflow/NodeOutputPanel'
import type { Node } from '@xyflow/react'

interface WorkflowTestPanelProps {
  isOpen: boolean
  workflowId: string | null
  nodes: Node[]
  onClose: () => void
  selectedTestNode: string | null
  testNodeResults: Map<string, { input?: unknown; output?: unknown; error?: string; duration?: number }>
  onNodeClick: (nodeId: string) => void
  onNodeOutputPanelClose: () => void
}

export function WorkflowTestPanelWrapper({
  isOpen,
  workflowId,
  nodes,
  onClose,
  selectedTestNode,
  testNodeResults,
  onNodeClick,
  onNodeOutputPanelClose,
}: WorkflowTestPanelProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-80 bg-background border-l border-border flex flex-col h-full"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">测试运行</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground/70" />
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {workflowId ? (
          <TestRunPanel
            workflowId={workflowId}
            nodes={nodes}
            onNodeClick={onNodeClick}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            请先保存工作流以运行测试
          </div>
        )}
      </div>

      {selectedTestNode && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed right-0 top-14 bottom-0 w-80 z-50"
        >
          <NodeOutputPanel
            nodeId={selectedTestNode}
            nodeName={nodes.find((n) => n.id === selectedTestNode)?.data?.label as string || selectedTestNode}
            output={testNodeResults.get(selectedTestNode)?.output}
            error={testNodeResults.get(selectedTestNode)?.error}
            duration={testNodeResults.get(selectedTestNode)?.duration}
            onClose={onNodeOutputPanelClose}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
