import * as React from 'react'
import type { ComponentProps } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bug, X } from 'lucide-react'
import { WorkflowNodePalette } from '@/components/workflow/builder'
import { WorkflowCanvas } from '@/components/workflow/builder/WorkflowCanvas'
import { TestRunPanel } from '@/components/workflow/TestRunPanel'
import { NodeOutputPanel } from '@/components/workflow/NodeOutputPanel'

type WorkflowNodePaletteProps = ComponentProps<typeof WorkflowNodePalette>
type WorkflowCanvasProps = ComponentProps<typeof WorkflowCanvas>
type TestRunPanelProps = ComponentProps<typeof TestRunPanel>
type NodeOutputPanelProps = ComponentProps<typeof NodeOutputPanel>

interface CanvasPanelProps {
  paletteProps: WorkflowNodePaletteProps
  canvasProps: WorkflowCanvasProps
  showTestPanel: boolean
  onCloseTestPanel: () => void
  testPanelProps?: TestRunPanelProps
  showNodeOutputPanel: boolean
  nodeOutputPanelProps?: NodeOutputPanelProps
}

export function CanvasPanel({
  paletteProps,
  canvasProps,
  showTestPanel,
  onCloseTestPanel,
  testPanelProps,
  showNodeOutputPanel,
  nodeOutputPanelProps,
}: CanvasPanelProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <WorkflowNodePalette {...paletteProps} />

      <WorkflowCanvas {...canvasProps} />

      <AnimatePresence>
        {showTestPanel && (
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
                onClick={onCloseTestPanel}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground/70" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {testPanelProps ? (
                <TestRunPanel {...testPanelProps} />
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  请先保存工作流以运行测试
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNodeOutputPanel && nodeOutputPanelProps && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-14 bottom-0 w-80 z-50"
          >
            <NodeOutputPanel {...nodeOutputPanelProps} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
