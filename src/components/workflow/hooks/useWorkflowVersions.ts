import * as React from 'react'
import { getWorkflowVersions, getActiveVersion, activateVersion, createVersion, type WorkflowVersion } from '@/lib/api/workflows'
import type { Node, Edge } from '@xyflow/react'

export interface UseWorkflowVersionsOptions {
  workflowId: string | null
}

export interface UseWorkflowVersionsReturn {
  versions: WorkflowVersion[]
  activeVersion: WorkflowVersion | null
  isLoading: boolean
  loadVersions: (templateId: string) => Promise<void>
  handleVersionChange: (
    versionId: string,
    versions: WorkflowVersion[],
    callbacks: {
      setNodes: (nodes: Node[]) => void
      setEdges: (edges: Edge[]) => void
      onResetHistory: () => void
    }
  ) => void
  handleActivateVersion: (templateId: string, versionId: string) => Promise<{ success: boolean; error?: string }>
  handleCreateVersion: (
    templateId: string,
    data: {
      name: string
      changeSummary: string
      nodes: Node[]
      edges: Edge[]
    }
  ) => Promise<{ success: boolean; error?: string }>
}

export function useWorkflowVersions(options: UseWorkflowVersionsOptions): UseWorkflowVersionsReturn {
  const { workflowId } = options
  const [versions, setVersions] = React.useState<WorkflowVersion[]>([])
  const [activeVersion, setActiveVersion] = React.useState<WorkflowVersion | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const loadVersions = React.useCallback(async (templateId: string) => {
    setIsLoading(true)
    try {
      const [versionsResult, activeResult] = await Promise.all([
        getWorkflowVersions(templateId),
        getActiveVersion(templateId),
      ])
      if (versionsResult.success && versionsResult.data) {
        setVersions(versionsResult.data)
      }
      if (activeResult.success && activeResult.data) {
        setActiveVersion(activeResult.data)
      }
    } catch (err) {
      console.error('Failed to load versions:', err)
    }
    setIsLoading(false)
  }, [])

  const handleVersionChange = React.useCallback(
    (
      versionId: string,
      versionsList: WorkflowVersion[],
      callbacks: {
        setNodes: (nodes: Node[]) => void
        setEdges: (edges: Edge[]) => void
        onResetHistory: () => void
      }
    ) => {
      const version = versionsList.find((v) => v.id === versionId)
      if (!version) return

      const nodesData = typeof version.nodes_json === 'string'
        ? JSON.parse(version.nodes_json)
        : version.nodes_json
      const edgesData = typeof version.edges_json === 'string'
        ? JSON.parse(version.edges_json)
        : version.edges_json

      callbacks.setNodes(nodesData)
      callbacks.setEdges(edgesData as Edge[])
      callbacks.onResetHistory()
      setActiveVersion(version)
    },
    []
  )

  const handleActivateVersion = React.useCallback(
    async (templateId: string, versionId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const result = await activateVersion(templateId, versionId)
        if (result.success) {
          await loadVersions(templateId)
          return { success: true }
        }
        return { success: false, error: result.error || 'Failed to activate version' }
      } catch (err) {
        return { success: false, error: 'Failed to activate version' }
      }
    },
    [loadVersions]
  )

  const handleCreateVersion = React.useCallback(
    async (
      templateId: string,
      data: {
        name: string
        changeSummary: string
        nodes: Node[]
        edges: Edge[]
      }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const result = await createVersion(templateId, {
          nodes_json: JSON.stringify(data.nodes),
          edges_json: JSON.stringify(data.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          }))),
          name: data.name || undefined,
          change_summary: data.changeSummary || undefined,
        })

        if (result.success && result.data) {
          await loadVersions(templateId)
          return { success: true }
        }
        return { success: false, error: result.error || 'Failed to save version' }
      } catch (err) {
        return { success: false, error: 'Failed to save version' }
      }
    },
    [loadVersions]
  )

  return {
    versions,
    activeVersion,
    isLoading,
    loadVersions,
    handleVersionChange,
    handleActivateVersion,
    handleCreateVersion,
  }
}
