import { cn } from '@/lib/utils'
import { WorkflowCanvas } from '@/components/workflow/builder/WorkflowCanvas'
import type { ComponentProps } from 'react'
import { status } from '@/themes/tokens'
import { Toolbar } from './Toolbar.js'
import { CanvasPanel } from './CanvasPanel.js'
import { ConfigPanel } from './ConfigPanel.js'
import { WorkflowDialogs } from './WorkflowDialogs.js'

interface WorkflowBuilderContentProps {
  builder: {
    showSaveModal: boolean
    setShowSaveModal: (value: boolean) => void
    validate: () => void
    handleClear: () => void
    handleUndo: () => void
    handleRedo: () => void
    setVersionChangeSummary: (value: string) => void
    setVersionName: (value: string) => void
    setShowSaveVersionModal: (value: boolean) => void
    showVersionPanel: boolean
    setShowVersionPanel: (value: boolean) => void
    showTestPanel: boolean
    setShowTestPanel: (value: boolean) => void
    canUndo: boolean
    canRedo: boolean
    workflowIsValid: boolean
    nodes: Array<{ id: string; data?: { label?: string } }>
    edges: Array<unknown>
    isSaving: boolean
    validationSummary?: { total: number; errors: number; warnings: number }
    versions: unknown[]
    activeVersion: unknown
    handleVersionChange: (versionId: string) => void
    isLoadingVersions: boolean
    saveMessage: { type: 'success' | 'error'; text: string } | null
    onDragStart: (event: React.DragEvent, nodeType: string) => void
    showNodeOutputPanel: boolean
    selectedTestNode: string | null
    showNodeOutput: (value: boolean) => void
    selectTestNode: (nodeId: string | null) => void
    showConfigPanel: boolean
    selectedNode: unknown
    setShowConfigPanel: (value: boolean) => void
    setSelectedNode: (node: unknown) => void
    handleConfigSave: (id: string, data: Record<string, unknown>) => void
    handleDeleteNode: (id: string) => void
    validationErrors?: unknown[]
    showTemplateSelector: boolean
    setShowTemplateSelector: (value: boolean) => void
    showWorkflowSelector: boolean
    setShowWorkflowSelector: (value: boolean) => void
    handleActivateVersion: (versionId: string) => void
    showSaveVersionModal: boolean
    versionName: string
    versionChangeSummary: string
    isSavingVersion: boolean
  }
  workflowId: string | null
  handleSave: () => void
  handleLoad: () => void
  canvasProps: ComponentProps<typeof WorkflowCanvas>
  testPanelProps?: {
    workflowId: string
    nodes: Array<{ id: string; type?: string; data?: { label?: string } }>
    onNodeClick: (nodeId: string) => void
  }
  nodeOutputPanelProps?: {
    nodeId: string
    nodeName: string
    output?: unknown
    error?: string
    duration?: number
    onClose: () => void
  }
  workflowDialogProps: React.ComponentProps<typeof WorkflowDialogs>
}

export function WorkflowBuilderContent({
  builder,
  workflowId,
  handleSave,
  handleLoad,
  canvasProps,
  testPanelProps,
  nodeOutputPanelProps,
  workflowDialogProps,
}: WorkflowBuilderContentProps) {
  return (
    <div className="-m-8 h-[calc(100vh-60px-2rem)] flex flex-col bg-background overflow-hidden">
      <Toolbar
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
        versions={builder.versions as never[]}
        activeVersion={builder.activeVersion as never}
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
        <CanvasPanel
          paletteProps={{ onDragStart: builder.onDragStart }}
          canvasProps={canvasProps as ComponentProps<typeof WorkflowCanvas>}
          showTestPanel={builder.showTestPanel}
          onCloseTestPanel={() => builder.setShowTestPanel(false)}
          testPanelProps={testPanelProps}
          showNodeOutputPanel={builder.showNodeOutputPanel && !!builder.selectedTestNode}
          nodeOutputPanelProps={nodeOutputPanelProps}
        />

        <ConfigPanel
          isOpen={builder.showConfigPanel}
          node={builder.selectedNode as never}
          onClose={() => {
            builder.setShowConfigPanel(false)
            builder.setSelectedNode(null)
          }}
          onSave={builder.handleConfigSave}
          onDelete={builder.handleDeleteNode}
          validationErrors={builder.validationErrors as never[] | undefined}
        />
      </div>

      <WorkflowDialogs {...workflowDialogProps} />
    </div>
  )
}
