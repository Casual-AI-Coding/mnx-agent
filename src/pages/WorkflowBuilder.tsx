import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bug, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  WorkflowToolbar,
  WorkflowNodePalette,
  WorkflowConfigPanel,
  WorkflowVersionPanel,
  ExecutionStatusPanel,
} from '@/components/workflow/builder'
import { WorkflowCanvas } from '@/components/workflow/builder/WorkflowCanvas'
import { SaveWorkflowModal } from '@/components/workflow/SaveWorkflowModal'
import { WorkflowSelectorModal } from '@/components/workflow/TemplateSelectorModal'
import { TestRunPanel } from '@/components/workflow/TestRunPanel'
import { NodeOutputPanel } from '@/components/workflow/NodeOutputPanel'
import { useWorkflowBuilder } from '@/components/workflow/hooks/useWorkflowBuilder'
import { storeNodeToRFNode } from '@/components/workflow/utils/workflow-transforms'
import { useWorkflowStore } from '@/stores/workflow'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { apiClient } from '@/lib/api/client'
import {
  pauseExecution,
  resumeExecution,
  cancelExecution,
} from '@/lib/api/cron'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'

interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  owner_id: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

// Main Workflow Builder Component
function WorkflowBuilderInner() {
  const [searchParams] = useSearchParams()
  const store = useWorkflowStore()
  const workflowId = searchParams.get('id')

  const builder = useWorkflowBuilder(workflowId)

  // Load workflow by ID from URL query parameter
  React.useEffect(() => {
    const loadWorkflow = async () => {
      if (!workflowId) return

      try {
        const result = await apiClient.get(`/workflows/${workflowId}`) as { data: WorkflowTemplate }
        const workflow = result.data

        if (workflow) {
          const nodesRaw = workflow.nodes_json
          const edgesRaw = workflow.edges_json

          if (!nodesRaw) {
            console.error('No nodes_json in workflow')
            return
          }

          const nodesData = typeof nodesRaw === 'string'
            ? JSON.parse(nodesRaw)
            : nodesRaw
          const edgesData = edgesRaw
            ? (typeof edgesRaw === 'string' ? JSON.parse(edgesRaw) : edgesRaw)
            : []

          builder.handleLoadNodes(
            nodesData.map(storeNodeToRFNode),
            edgesData
          )
          store.setCurrentWorkflow(workflowId, workflow.name)
        }
      } catch (err) {
        console.error('Failed to load workflow:', err)
      }
    }
    loadWorkflow()
  }, [workflowId, store, builder])

  // Save handlers
  const handleSave = () => {
    const json = JSON.stringify({
      nodes: builder.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          label: (node.data as Record<string, unknown>).label as string || (node.type as string),
          config: node.data as Record<string, unknown>,
        },
      })),
      edges: builder.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      }))
    }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflow-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoad = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        if (data.nodes) {
          builder.handleLoadNodes(
            data.nodes.map(storeNodeToRFNode),
            data.edges || []
          )
        }
        store.setDirty(true)
      } catch (err) {
        console.error('Failed to parse workflow JSON:', err)
      }
    }
    input.click()
  }

  const handleSaveWorkflow = async (name: string) => {
    builder.setShowSaveModal(false)
    builder.setIsSaving(true)
    try {
      const result = await apiClient.post('/workflows', {
        name,
        description: '',
        nodes_json: JSON.stringify(builder.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            label: (node.data as Record<string, unknown>).label as string || (node.type as string),
            config: node.data as Record<string, unknown>,
          },
        }))),
        edges_json: JSON.stringify(builder.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        }))),
        is_template: true,
      }) as { success: boolean; data?: { id: string; name: string }; error?: string }

      if (result.success && result.data) {
        store.setCurrentWorkflow(result.data.id, result.data.name)
        store.markSaved()
        builder.setSaveMessage({ type: 'success', text: 'Workflow saved successfully!' })
      } else {
        builder.setSaveMessage({ type: 'error', text: result.error || 'Failed to save workflow' })
      }
    } catch (err) {
      builder.setSaveMessage({ type: 'error', text: 'Network error' })
    }
    builder.setIsSaving(false)
    setTimeout(() => builder.setSaveMessage(null), 3000)
  }

  const handleSelectTemplate = (_templateId: string, template: WorkflowTemplate) => {
    const nodesData = typeof template.nodes_json === 'string'
      ? JSON.parse(template.nodes_json)
      : template.nodes_json
    const edgesData = typeof template.edges_json === 'string'
      ? JSON.parse(template.edges_json)
      : template.edges_json

    builder.handleLoadNodes(
      nodesData.map(storeNodeToRFNode),
      edgesData
    )
    store.setCurrentWorkflow(template.id, template.name)
    builder.setShowTemplateSelector(false)
  }

  const handleSelectWorkflow = (_templateId: string, template: WorkflowTemplate) => {
    const nodesData = typeof template.nodes_json === 'string'
      ? JSON.parse(template.nodes_json)
      : template.nodes_json
    const edgesData = typeof template.edges_json === 'string'
      ? JSON.parse(template.edges_json)
      : template.edges_json

    builder.handleLoadNodes(
      nodesData.map(storeNodeToRFNode),
      edgesData
    )
    store.setCurrentWorkflow(template.id, template.name)
    builder.setShowWorkflowSelector(false)
  }

  const handleCreateVersion = async () => {
    await builder.handleCreateVersion({
      name: builder.versionName,
      changeSummary: builder.versionChangeSummary,
    })
    builder.setShowSaveVersionModal(false)
  }

  return (
    <div className="-m-8 h-[calc(100vh-60px-2rem)] flex flex-col bg-background overflow-hidden">
      <WorkflowToolbar
        onSave={handleSave}
        onSaveToServer={() => builder.setShowSaveModal(true)}
        onLoad={handleLoad}
        onLoadFromServer={() => builder.setShowWorkflowSelector(true)}
        onValidate={builder.validate}
        onClear={builder.handleClear}
        onUndo={builder.handleUndo}
        onRedo={builder.handleRedo}
        onSaveVersion={() => {
          builder.setVersionChangeSummary('')
          builder.setVersionName('')
          builder.setShowSaveVersionModal(true)
        }}
        onToggleVersionPanel={() => builder.setShowVersionPanel(!builder.showVersionPanel)}
        onTestRun={() => builder.setShowTestPanel(!builder.showTestPanel)}
        canUndo={builder.canUndo}
        canRedo={builder.canRedo}
        isValid={builder.workflowIsValid}
        nodeCount={builder.nodes.length}
        edgeCount={builder.edges.length}
        isSaving={builder.isSaving}
        validationSummary={builder.validationSummary}
        currentTemplateId={workflowId ?? undefined}
        versions={builder.versions}
        activeVersion={builder.activeVersion}
        onVersionChange={builder.handleVersionChange}
        isLoadingVersions={builder.isLoadingVersions}
        hasWorkflowId={!!workflowId}
      />

      {builder.saveMessage && (
        <div className={cn(
          'absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-sm font-medium',
          builder.saveMessage.type === 'success' ? cn(status.success.bg, status.success.foreground) : cn(status.error.bg, status.error.foreground)
        )}>
          {builder.saveMessage.text}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <WorkflowNodePalette onDragStart={builder.onDragStart} />

        <WorkflowCanvas
          nodes={builder.nodes}
          edges={builder.edges}
          onNodesChange={builder.onNodesChange}
          onEdgesChange={builder.onEdgesChange}
          onConnect={builder.onConnect}
          onNodeClick={builder.onNodeClick}
          onNodeDoubleClick={builder.onNodeDoubleClick}
          onPaneClick={builder.onPaneClick}
          onDragOver={builder.onDragOver}
          onDrop={builder.onDrop}
          executionStatusPanelProps={{
            executionId: builder.executionId,
            status: builder.executionStatus,
            nodeStatuses: builder.nodeStatuses,
            startTime: builder.executionStartTime,
            isSubscribed: builder.isSubscribed,
            onPause: () => {
              if (!builder.executionId) return
              pauseExecution(builder.executionId).then((response) => {
                if (response.success) {
                  toast.success('Execution paused')
                } else {
                  toast.error(response.error || 'Failed to pause')
                }
              })
            },
            onResume: () => {
              if (!builder.executionId) return
              resumeExecution(builder.executionId).then((response) => {
                if (response.success) {
                  toast.success('Execution resumed')
                } else {
                  toast.error(response.error || 'Failed to resume')
                }
              })
            },
            onCancel: () => {
              if (!builder.executionId) return
              cancelExecution(builder.executionId).then((response) => {
                if (response.success) {
                  toast.success('Execution cancelled')
                } else {
                  toast.error(response.error || 'Failed to cancel')
                }
              })
            },
          }}
          validationResult={builder.validationResult}
        />

        <AnimatePresence>
          {builder.showConfigPanel && (
            <WorkflowConfigPanel
              node={builder.selectedNode}
              onClose={() => {
                builder.setShowConfigPanel(false)
                builder.setSelectedNode(null)
              }}
              onSave={builder.handleConfigSave}
              onDelete={builder.handleDeleteNode}
              validationErrors={builder.validationErrors}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {builder.showTestPanel && (
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
                  onClick={() => builder.setShowTestPanel(false)}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground/70" />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                {workflowId ? (
                  <TestRunPanel
                    workflowId={workflowId}
                    nodes={builder.nodes}
                    onNodeClick={(nodeId) => {
                      builder.selectTestNode(nodeId)
                      builder.showNodeOutput(true)
                    }}
                  />
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
          {builder.showNodeOutputPanel && builder.selectedTestNode && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-14 bottom-0 w-80 z-50"
            >
              <NodeOutputPanel
                nodeId={builder.selectedTestNode}
                nodeName={builder.nodes.find((n) => n.id === builder.selectedTestNode)?.data?.label as string || builder.selectedTestNode}
                output={builder.testNodeResults.get(builder.selectedTestNode)?.output}
                error={builder.testNodeResults.get(builder.selectedTestNode)?.error}
                duration={builder.testNodeResults.get(builder.selectedTestNode)?.duration}
                onClose={() => {
                  builder.showNodeOutput(false)
                  builder.selectTestNode(null)
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SaveWorkflowModal
        isOpen={builder.showSaveModal}
        onSave={handleSaveWorkflow}
        onClose={() => builder.setShowSaveModal(false)}
      />

      <WorkflowSelectorModal
        isOpen={builder.showTemplateSelector}
        onClose={() => builder.setShowTemplateSelector(false)}
        onSelect={handleSelectTemplate}
        mode="template"
        title="Start from Template"
      />

      <WorkflowSelectorModal
        isOpen={builder.showWorkflowSelector}
        onClose={() => builder.setShowWorkflowSelector(false)}
        onSelect={handleSelectWorkflow}
        mode="workflow"
        title="Load Workflow"
      />

      <AnimatePresence>
        {builder.showVersionPanel && (
          <WorkflowVersionPanel
            versions={builder.versions}
            activeVersion={builder.activeVersion}
            isLoading={builder.isLoadingVersions}
            onClose={() => builder.setShowVersionPanel(false)}
            onVersionChange={builder.handleVersionChange}
            onActivateVersion={builder.handleActivateVersion}
          />
        )}
      </AnimatePresence>

      <Dialog
        open={builder.showSaveVersionModal}
        onClose={() => builder.setShowSaveVersionModal(false)}
        title="Save New Version"
        size="sm"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Version Name (optional)</Label>
            <input
              type="text"
              value={builder.versionName}
              onChange={(e) => builder.setVersionName(e.target.value)}
              placeholder="e.g., Bug fix for authentication"
              className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Change Summary</Label>
            <Textarea
              value={builder.versionChangeSummary}
              onChange={(e) => builder.setVersionChangeSummary(e.target.value)}
              placeholder="Describe what changed in this version..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => builder.setShowSaveVersionModal(false)}
            className="px-4 py-2 rounded-md bg-secondary text-foreground/80 text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateVersion}
            disabled={builder.isSavingVersion}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {builder.isSavingVersion && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Version
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

// Wrapper with ReactFlowProvider
export default function WorkflowBuilderPage() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  )
}
