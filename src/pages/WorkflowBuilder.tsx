import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toast } from 'sonner'

import { useWorkflowBuilder } from '@/components/workflow/hooks/useWorkflowBuilder'
import { useWorkflowStore } from '@/stores/workflow'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { apiClient } from '@/lib/api/client'
import {
  pauseExecution,
  resumeExecution,
  cancelExecution,
} from '@/lib/api/cron'
import { Toolbar } from './workflow-builder/Toolbar.js'
import { CanvasPanel } from './workflow-builder/CanvasPanel.js'
import { ConfigPanel } from './workflow-builder/ConfigPanel.js'
import { parseWorkflowTemplate, serializeWorkflow } from './workflow-builder/workflow-io.js'
import { WorkflowDialogs } from './workflow-builder/WorkflowDialogs.js'
import { WorkflowBuilderContent } from './workflow-builder/WorkflowBuilderContent.js'
import type { WorkflowTemplate } from './workflow-builder/types.js'

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
          if (!workflow.nodes_json) {
            console.error('No nodes_json in workflow')
            return
          }

          const parsedWorkflow = parseWorkflowTemplate(workflow)

          builder.handleLoadNodes(parsedWorkflow.nodes, parsedWorkflow.edges)
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
    const json = JSON.stringify(serializeWorkflow(builder.nodes, builder.edges), null, 2)
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
          const parsedWorkflow = parseWorkflowTemplate({
            nodes_json: JSON.stringify(data.nodes),
            edges_json: JSON.stringify(data.edges || []),
          })
          builder.handleLoadNodes(parsedWorkflow.nodes, parsedWorkflow.edges)
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
      const serializedWorkflow = serializeWorkflow(builder.nodes, builder.edges)
      const result = await apiClient.post('/workflows', {
        name,
        description: '',
        nodes_json: JSON.stringify(serializedWorkflow.nodes),
        edges_json: JSON.stringify(serializedWorkflow.edges),
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
    const parsedWorkflow = parseWorkflowTemplate(template)

    builder.handleLoadNodes(parsedWorkflow.nodes, parsedWorkflow.edges)
    store.setCurrentWorkflow(template.id, template.name)
    builder.setShowTemplateSelector(false)
  }

  const handleSelectWorkflow = (_templateId: string, template: WorkflowTemplate) => {
    const parsedWorkflow = parseWorkflowTemplate(template)

    builder.handleLoadNodes(parsedWorkflow.nodes, parsedWorkflow.edges)
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

  const handlePauseExecution = () => {
    if (!builder.executionId) return
    pauseExecution(builder.executionId).then((response) => {
      if (response.success) {
        toast.success('Execution paused')
      } else {
        toast.error(response.error || 'Failed to pause')
      }
    })
  }

  const handleResumeExecution = () => {
    if (!builder.executionId) return
    resumeExecution(builder.executionId).then((response) => {
      if (response.success) {
        toast.success('Execution resumed')
      } else {
        toast.error(response.error || 'Failed to resume')
      }
    })
  }

  const handleCancelExecution = () => {
    if (!builder.executionId) return
    cancelExecution(builder.executionId).then((response) => {
      if (response.success) {
        toast.success('Execution cancelled')
      } else {
        toast.error(response.error || 'Failed to cancel')
      }
    })
  }

  const canvasProps = {
    nodes: builder.nodes,
    edges: builder.edges,
    onNodesChange: builder.onNodesChange,
    onEdgesChange: builder.onEdgesChange,
    onConnect: builder.onConnect,
    onNodeClick: builder.onNodeClick,
    onNodeDoubleClick: builder.onNodeDoubleClick,
    onPaneClick: builder.onPaneClick,
    onDragOver: builder.onDragOver,
    onDrop: builder.onDrop,
    executionStatusPanelProps: {
      executionId: builder.executionId,
      status: builder.executionStatus,
      nodeStatuses: builder.nodeStatuses,
      startTime: builder.executionStartTime,
      isSubscribed: builder.isSubscribed,
      onPause: handlePauseExecution,
      onResume: handleResumeExecution,
      onCancel: handleCancelExecution,
    },
    validationResult: builder.validationResult,
  }

  const testPanelProps = workflowId ? {
    workflowId,
    nodes: builder.nodes,
    onNodeClick: (nodeId: string) => {
      builder.selectTestNode(nodeId)
      builder.showNodeOutput(true)
    },
  } : undefined

  const nodeOutputPanelProps = builder.selectedTestNode ? {
    nodeId: builder.selectedTestNode,
    nodeName: builder.nodes.find((n) => n.id === builder.selectedTestNode)?.data?.label as string || builder.selectedTestNode,
    output: builder.testNodeResults.get(builder.selectedTestNode)?.output,
    error: builder.testNodeResults.get(builder.selectedTestNode)?.error,
    duration: builder.testNodeResults.get(builder.selectedTestNode)?.duration,
    onClose: () => {
      builder.showNodeOutput(false)
      builder.selectTestNode(null)
    },
  } : undefined

  const workflowDialogProps = {
    saveWorkflowModalProps: {
      isOpen: builder.showSaveModal,
      onSave: handleSaveWorkflow,
      onClose: () => builder.setShowSaveModal(false),
    },
    templateSelectorModalProps: {
      isOpen: builder.showTemplateSelector,
      onClose: () => builder.setShowTemplateSelector(false),
      onSelect: handleSelectTemplate,
      mode: 'template' as const,
      title: 'Start from Template',
    },
    workflowSelectorModalProps: {
      isOpen: builder.showWorkflowSelector,
      onClose: () => builder.setShowWorkflowSelector(false),
      onSelect: handleSelectWorkflow,
      mode: 'workflow' as const,
      title: 'Load Workflow',
    },
    versionPanelProps: {
      isOpen: builder.showVersionPanel,
      versions: builder.versions,
      activeVersion: builder.activeVersion,
      isLoading: builder.isLoadingVersions,
      onClose: () => builder.setShowVersionPanel(false),
      onVersionChange: builder.handleVersionChange,
      onActivateVersion: builder.handleActivateVersion,
    },
    saveVersionDialogProps: {
      open: builder.showSaveVersionModal,
      onClose: () => builder.setShowSaveVersionModal(false),
      versionName: builder.versionName,
      versionChangeSummary: builder.versionChangeSummary,
      onVersionNameChange: builder.setVersionName,
      onVersionChangeSummaryChange: builder.setVersionChangeSummary,
      onSave: handleCreateVersion,
      isSaving: builder.isSavingVersion,
    },
  }

  return <WorkflowBuilderContent builder={builder as never} workflowId={workflowId} handleSave={handleSave} handleLoad={handleLoad} canvasProps={canvasProps} testPanelProps={testPanelProps} nodeOutputPanelProps={nodeOutputPanelProps} workflowDialogProps={workflowDialogProps} />
}

// Wrapper with ReactFlowProvider
export default function WorkflowBuilderPage() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  )
}
