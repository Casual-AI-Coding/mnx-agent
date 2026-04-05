import * as React from 'react'
import { motion } from 'framer-motion'
import { Search, Calendar, Loader2, X, Check, Layers, ChevronRight, FileJson } from 'lucide-react'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { status, services } from '@/themes/tokens'

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

interface TemplateNode {
  id: string
  type: 'action' | 'condition' | 'loop' | 'transform'
  position: { x: number; y: number }
  data: Record<string, unknown>
}

interface TemplateEdge {
  id: string
  source: string
  target: string
}

interface WorkflowSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (templateId: string, template: WorkflowTemplate) => void
  mode?: 'template' | 'workflow'
  title?: string
  showPreview?: boolean
}

const NODE_TYPE_COLORS: Record<string, string> = {
  action: 'bg-primary/80',
  condition: 'bg-warning/80',
  loop: 'bg-accent/80',
  transform: 'bg-secondary/80',
  default: 'bg-muted/80',
}

const NODE_TYPE_ICONS: Record<string, string> = {
  action: '⚡',
  condition: '?',
  loop: '↻',
  transform: 'T',
  default: '◆',
}

export function WorkflowSelectorModal({ 
  isOpen, 
  onClose, 
  onSelect,
  mode = 'template',
  title,
  showPreview = true,
}: WorkflowSelectorModalProps) {
  const [templates, setTemplates] = React.useState<WorkflowTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = React.useState<WorkflowTemplate[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedTemplate, setSelectedTemplate] = React.useState<WorkflowTemplate | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Text based on mode
  const isWorkflowMode = mode === 'workflow'
  const modalTitle = title ?? (isWorkflowMode ? 'Load Workflow' : 'Select Workflow Template')
  const searchPlaceholder = isWorkflowMode 
    ? 'Search workflows by name or description...' 
    : 'Search templates by name or description...'
  const emptyText = isWorkflowMode ? 'No saved workflows found' : 'No saved templates found'
  const loadingText = isWorkflowMode ? 'Loading workflows...' : 'Loading templates...'
  const selectButtonText = isWorkflowMode ? 'Load Workflow' : 'Load Template'
  const selectPromptText = isWorkflowMode ? 'Select a Workflow' : 'Select a Template'

  // Load templates on open
  React.useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  // Filter templates when search changes
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
    )
    setFilteredTemplates(filtered)
  }, [searchQuery, templates])

  const loadTemplates = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await apiClient.get('/workflows?limit=50') as { data?: { workflows: WorkflowTemplate[] }; success?: boolean }
      const workflows = result.data?.workflows || []
      setTemplates(workflows)
      setFilteredTemplates(workflows)
    } catch (err) {
      setError('Failed to load templates. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
  }

  const handleLoad = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.id, selectedTemplate)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setSelectedTemplate(null)
    setError(null)
    onClose()
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  // Parse nodes and edges from template for preview
  const getPreviewData = (template: WorkflowTemplate | null): { nodes: TemplateNode[]; edges: TemplateEdge[] } => {
    if (!template) return { nodes: [], edges: [] }
    try {
      const nodes = typeof template.nodes_json === 'string'
        ? JSON.parse(template.nodes_json)
        : template.nodes_json
      const edges = template.edges_json
        ? (typeof template.edges_json === 'string'
            ? JSON.parse(template.edges_json)
            : template.edges_json)
        : []
      return { nodes, edges: edges || [] }
    } catch {
      return { nodes: [], edges: [] }
    }
  }

  const { nodes: previewNodes, edges: previewEdges } = getPreviewData(selectedTemplate)

  // Calculate node positions for mini visualization
  const getMiniGraphPositions = () => {
    if (previewNodes.length === 0) return { nodes: [], connections: [] }

    // Simple layout: distribute nodes in a grid
    const cols = Math.ceil(Math.sqrt(previewNodes.length))
    const gap = 80
    const startX = 40
    const startY = 40

    const positionedNodes = previewNodes.map((node, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      return {
        ...node,
        miniX: startX + col * gap,
        miniY: startY + row * 50,
      }
    })

    const connections = previewEdges.map((edge) => {
      const source = positionedNodes.find((n) => n.id === edge.source)
      const target = positionedNodes.find((n) => n.id === edge.target)
      if (!source || !target) return null
      return {
        x1: source.miniX + 24,
        y1: source.miniY + 12,
        x2: target.miniX,
        y2: target.miniY + 12,
      }
    }).filter(Boolean)

    return { nodes: positionedNodes, connections }
  }

  const miniGraph = getMiniGraphPositions()

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="lg"
      className="max-w-4xl"
    >
      <div className="flex flex-col h-[600px]">
        {/* Search Bar */}
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Template List */}
          <div className={cn('overflow-y-auto', showPreview ? 'w-1/2 border-r border-border/50' : 'w-full')}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{loadingText}</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
                <X className="w-8 h-8 text-destructive" />
                <p className="text-sm text-destructive text-center">{error}</p>
                <Button variant="outline" size="sm" onClick={loadTemplates}>
                  Retry
                </Button>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
                <FileJson className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground text-center">
                  {searchQuery ? (isWorkflowMode ? 'No workflows match your search' : 'No templates match your search') : emptyText}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className={cn(
                      'relative p-3 rounded-lg cursor-pointer transition-all duration-200 group',
                      selectedTemplate?.id === template.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-secondary/50 border border-transparent'
                    )}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {selectedTemplate?.id === template.id && (
                      <div className="absolute right-3 top-3">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-secondary/80 text-secondary-foreground shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {template.name}
                        </h4>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground/70">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(template.created_at)}</span>
                          {template.is_public && (
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px]', status.info.bgSubtle, status.info.text)}>
                              Public
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {showPreview && (
          <div className="w-1/2 bg-secondary/20 flex flex-col">
            <div className="p-3 border-b border-border/50">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                Preview
              </h4>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              {!selectedTemplate ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <Layers className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a template to preview its structure
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Template Info */}
                  <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                    <h5 className="text-sm font-semibold text-foreground mb-2">
                      {selectedTemplate.name}
                    </h5>
                    {selectedTemplate.description && (
                      <p className="text-xs text-muted-foreground mb-3">
                        {selectedTemplate.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                      <span className="flex items-center gap-1">
                        <span className={cn('w-1.5 h-1.5 rounded-full', status.info.bg)} />
                        {previewNodes.length} nodes
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={cn('w-1.5 h-1.5 rounded-full', status.success.bg)} />
                        {previewEdges.length} edges
                      </span>
                    </div>
                  </div>

                  {/* Mini Graph Visualization */}
                  {previewNodes.length > 0 && (
                    <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                      <h6 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                        Workflow Structure
                      </h6>
                      <div className="relative w-full overflow-hidden rounded-md bg-secondary/30 min-h-[200px]">
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox="0 0 400 200"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {/* Connection lines */}
                          {miniGraph.connections.map((conn, index) => (
                            conn && (
                              <line
                                key={index}
                                x1={conn.x1}
                                y1={conn.y1}
                                x2={conn.x2}
                                y2={conn.y2}
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="text-muted-foreground/30"
                                strokeDasharray="3,3"
                              />
                            )
                          ))}
                        </svg>
                        {/* Nodes */}
                        {miniGraph.nodes.map((node, index) => (
                          <motion.div
                            key={node.id}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05, duration: 0.2 }}
                            className={cn(
                              'absolute w-12 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm',
                              NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default
                            )}
                            style={{
                              left: `${(node.miniX / 400) * 100}%`,
                              top: `${(node.miniY / 200) * 100}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            title={`${node.type}: ${(node.data?.label as string) || node.id}`}
                          >
                            {NODE_TYPE_ICONS[node.type] || NODE_TYPE_ICONS.default}
                          </motion.div>
                        ))}
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {['action', 'condition', 'loop', 'transform'].map((type) => (
                          <div
                            key={type}
                            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                          >
                            <span className={cn('w-2 h-2 rounded-full', NODE_TYPE_COLORS[type])} />
                            <span className="capitalize">{type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Node List Summary */}
                  {previewNodes.length > 0 && (
                    <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                      <h6 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                        Nodes ({previewNodes.length})
                      </h6>
                      <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                        {previewNodes.slice(0, 8).map((node) => (
                          <div
                            key={node.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default
                              )}
                            />
                            <span className="text-muted-foreground capitalize min-w-[60px]">
                              {node.type}
                            </span>
                            <span className="text-foreground truncate">
                              {(node.data?.label as string) || node.id}
                            </span>
                          </div>
                        ))}
                        {previewNodes.length > 8 && (
                          <p className="text-xs text-muted-foreground/50 text-center pt-1">
                            +{previewNodes.length - 8} more nodes
                          </p>
                        )}
                      </div>
                    </div>
)}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      <DialogFooter className="border-t border-border/50 p-4">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleLoad}
          disabled={!selectedTemplate}
          className="gap-2"
        >
          {selectedTemplate ? (
            <>
              <Layers className="w-4 h-4" />
              {selectButtonText}
            </>
          ) : (
            selectPromptText
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
