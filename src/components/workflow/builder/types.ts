import type { Node, Edge } from '@xyflow/react'
import type { ValidationError } from '@/lib/workflow-validation'

export interface WorkflowTemplate {
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

export interface NodePaletteItem {
  type: string
  label: string
  icon: React.ElementType
  category: 'logic' | 'action'
  description: string
}

export interface AvailableActionItem {
  service: string
  method: string
  label: string
}

export interface WorkflowVersion {
  id: string
  template_id: string
  version_number: number
  name: string | null
  change_summary: string | null
  nodes_json: string | Record<string, unknown>[]
  edges_json: string | Record<string, unknown>[]
  is_active: boolean
  created_at: string
  created_by: string | null
}

export interface ValidationSummary {
  total: number
  errors: number
  warnings: number
}

export interface ExecutionStatusPanelProps {
  executionId: string | null
  status: 'idle' | 'running' | 'completed' | 'paused'
  nodeStatuses: Map<string, { status: string }>
  startTime: Date | null
  isSubscribed: boolean
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}

export interface ToolbarProps {
  onSave: () => void
  onSaveToServer: () => void
  onLoad: () => void
  onLoadFromServer: () => void
  onValidate: () => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  onSaveVersion: () => void
  onToggleVersionPanel: () => void
  onTestRun?: () => void
  canUndo: boolean
  canRedo: boolean
  isValid: boolean
  nodeCount: number
  edgeCount: number
  isSaving: boolean
  validationSummary?: ValidationSummary
  currentTemplateId?: string
  versions: WorkflowVersion[]
  activeVersion: WorkflowVersion | null
  onVersionChange: (versionId: string) => void
  isLoadingVersions: boolean
  hasWorkflowId: boolean
}

export interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string, actionData?: AvailableActionItem) => void
}

export interface ConfigPanelProps {
  node: Node | null
  onClose: () => void
  onSave: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  validationErrors?: ValidationError[]
}

export interface VersionPanelProps {
  isOpen: boolean
  onClose: () => void
  versions: WorkflowVersion[]
  activeVersion: WorkflowVersion | null
  isLoading: boolean
  onVersionChange: (versionId: string) => void
  onActivateVersion: (versionId: string) => void
}

export interface SaveVersionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, summary: string) => void
  isSaving: boolean
}

export interface TestPanelProps {
  isOpen: boolean
  onClose: () => void
  workflowId: string | null
  nodes: Node[]
  onNodeClick?: (nodeId: string) => void
}

export interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: unknown[]) => void
  onEdgesChange: (changes: unknown[]) => void
  onConnect: (connection: unknown) => void
  onNodeClick: (_event: React.MouseEvent, node: Node) => void
  onNodeDoubleClick: (_event: React.MouseEvent, node: Node) => void
  onPaneClick: () => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent) => void
  nodeTypes: Record<string, React.ComponentType>
  executionStatusPanelProps: ExecutionStatusPanelProps
  validationResult: { valid: boolean; message: string } | null
}

export interface GroupedActionNodes {
  [category: string]: AvailableActionItem[]
}
