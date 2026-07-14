import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toast } from 'sonner'
import { Workflow, Smartphone, ListChecks } from 'lucide-react'

import { useWorkflowBuilder } from '@/components/workflow/hooks/useWorkflowBuilder'
import { useWorkflowStore } from '@/stores/workflow'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import {
  pauseExecution,
  resumeExecution,
  cancelExecution,
} from '@/lib/api/cron'
import { parseWorkflowTemplate, serializeWorkflow } from './WorkflowBuilder/workflow-io.js'
import { WorkflowBuilderContent } from './WorkflowBuilder/WorkflowBuilderContent.js'
import type { WorkflowTemplate } from './WorkflowBuilder/types.js'

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

function MobileWorkflowBuilderFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Workflow className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">工作流构建器仅支持桌面端</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            拖拽式编辑器需要更大的屏幕空间。请在平板或电脑上访问，或前往「定时任务」查看已部署的工作流。
          </p>
        </div>
        <div className="grid gap-3 text-left bg-card border border-border/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">推荐屏幕宽度</p>
              <p className="text-xs text-muted-foreground">≥ 768px（平板或更大）</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ListChecks className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">查看已部署工作流</p>
              <p className="text-xs text-muted-foreground">前往 Cron Jobs 页面查看运行状态与执行日志</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            返回
          </Button>
          <Link
            to="/cron"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            前往定时任务
          </Link>
        </div>
      </div>
    </div>
  )
}

// Wrapper with ReactFlowProvider
export default function WorkflowBuilderPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileWorkflowBuilderFallback />
  }

  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  )
}
